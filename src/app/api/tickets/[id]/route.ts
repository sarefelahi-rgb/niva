import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, json, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { can } from '@/lib/roles';
import { TICKET_PRIORITIES, TICKET_STATUSES, ticketStatusNotification, type TicketStatus } from '@/lib/tickets';

/**
 * Wave 6.2 — single ticket.
 *
 * GET   — owner, or staff holding `tickets.read.all` (SUPPORT/ADMIN/SUPER_ADMIN).
 *         Foreign non-staff callers get 404 (no existence leak — IDOR rule).
 * PATCH — staff only (`tickets.respond`): status / priority / self-assignment.
 *         RESOLVED/CLOSED notify the owner (localized by THEIR locale) and
 *         every transition is audited.
 */

const msg = (fa: string, en: string) => `${fa} | ${en}`;

const patchSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assignedToId: z.string().min(1).nullable().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, [], async ({ user }) => {
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        assignee: { select: { id: true, email: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, body: true, isStaff: true, createdAt: true, authorId: true, author: { select: { name: true } } },
        },
      },
    });
    if (!ticket) return apiError(404, 'NOT_FOUND', 'تیکت یافت نشد | Ticket not found');
    const isOwner = ticket.userId === user.id;
    const staffRead = can(user, 'tickets.read.all');
    if (!isOwner && !staffRead) return apiError(404, 'NOT_FOUND', 'تیکت یافت نشد | Ticket not found');

    return json({
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        requester: { id: ticket.user.id, email: ticket.user.email, name: ticket.user.name },
        assignedTo: ticket.assignee ? { id: ticket.assignee.id, email: ticket.assignee.email, name: ticket.assignee.name } : null,
        messages: ticket.messages.map((m) => ({
          id: m.id,
          body: m.body,
          isStaff: m.isStaff,
          createdAt: m.createdAt,
          authorId: m.authorId,
          authorName: m.author.name,
        })),
        canRespond: can(user, 'tickets.respond'),
      },
    });
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, [], async ({ user }) => {
    if (!can(user, 'tickets.respond')) {
      return apiError(403, 'FORBIDDEN', msg('این عملیات مخصوص تیم پشتیبانی است.', 'This action is restricted to support staff.'));
    }
    const ticket = await db.supportTicket.findUnique({ where: { id }, include: { user: { select: { id: true, locale: true } } } });
    if (!ticket) return apiError(404, 'NOT_FOUND', 'تیکت یافت نشد | Ticket not found');

    const body = await readJson(req, patchSchema);

    // Self-assignment only — staff cannot reassign tickets to arbitrary users.
    if (body.assignedToId !== undefined && body.assignedToId !== null && body.assignedToId !== user.id) {
      return apiError(400, 'SELF_ASSIGN_ONLY', msg('فقط خودانتسابی مجاز است.', 'Only self-assignment is allowed.'));
    }

    const data: { status?: string; priority?: string; assignedToId?: string | null } = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId;

    const updated = await db.supportTicket.update({ where: { id: ticket.id }, data });

    // Localized owner notification on terminal transitions.
    if (body.status !== undefined && (body.status === 'RESOLVED' || body.status === 'CLOSED') && ticket.status !== body.status) {
      const n = ticketStatusNotification(ticket.user.locale, ticket.subject, body.status as TicketStatus);
      await db.notification.create({
        data: { userId: ticket.userId, type: 'TICKET', title: n.title, body: n.body },
      });
    }

    await logAudit(
      user.id,
      'TICKET_UPDATED',
      'SupportTicket',
      ticket.id,
      {
        status: body.status ?? undefined,
        priority: body.priority ?? undefined,
        assigned: body.assignedToId === user.id ? 'self' : body.assignedToId === null ? 'none' : undefined,
      },
      req.headers.get('x-forwarded-for')
    );

    return json({
      ticket: {
        id: updated.id,
        status: updated.status,
        priority: updated.priority,
        assignedToId: updated.assignedToId,
        updatedAt: updated.updatedAt,
      },
    });
  });
}
