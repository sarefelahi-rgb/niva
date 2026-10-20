import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, json, readJson, withUser } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { can } from '@/lib/roles';
import { staffReplyNotification } from '@/lib/tickets';

/**
 * Wave 6.2 — ticket conversation.
 *
 * POST — the owner or staff (`tickets.respond`) appends a message. Staff
 * replies carry isStaff=true and auto-transition an OPEN ticket to
 * IN_PROGRESS (first staff reply). A staff reply also notifies the ticket
 * owner with copy localized by the OWNER's locale (not the responder's).
 */

const msg = (fa: string, en: string) => `${fa} | ${en}`;

const replySchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, `ticket-reply:${user.id}`), 30, 60_000)) {
      return apiError(429, 'RATE_LIMIT', 'پاسخ‌ها خیلی سریع است. کمی صبر کنید. | Replying too quickly — please wait a moment.');
    }
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: { user: { select: { id: true, locale: true } } },
    });
    if (!ticket) return apiError(404, 'NOT_FOUND', 'تیکت یافت نشد | Ticket not found');

    const isOwner = ticket.userId === user.id;
    const staffRespond = can(user, 'tickets.respond');
    if (!isOwner && !staffRespond) {
      return apiError(404, 'NOT_FOUND', 'تیکت یافت نشد | Ticket not found');
    }
    if (ticket.status === 'CLOSED') {
      return apiError(409, 'TICKET_CLOSED', msg('این تیکت بسته شده است.', 'This ticket is closed.'));
    }

    const payload = await readJson(req, replySchema);
    const message = await db.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: user.id, body: payload.body, isStaff: staffRespond },
    });

    // First staff reply moves an OPEN ticket into IN_PROGRESS automatically.
    if (staffRespond && ticket.status === 'OPEN') {
      await db.supportTicket.update({ where: { id: ticket.id }, data: { status: 'IN_PROGRESS' } });
    }

    // Notify the owner when a staff member (not the owner) replies.
    if (staffRespond && !isOwner) {
      const n = staffReplyNotification(ticket.user.locale, ticket.subject);
      await db.notification.create({
        data: { userId: ticket.userId, type: 'TICKET', title: n.title, body: n.body },
      });
    }

    return json(
      {
        message: {
          id: message.id,
          body: message.body,
          isStaff: message.isStaff,
          createdAt: message.createdAt,
          authorId: message.authorId,
        },
      },
      201
    );
  });
}
