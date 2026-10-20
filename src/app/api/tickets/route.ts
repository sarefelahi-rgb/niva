import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, json, readJson, withUser } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { TICKET_CATEGORIES } from '@/lib/tickets';

/**
 * Wave 6.2 — user-facing support tickets.
 *
 * POST /api/tickets  — any authenticated user opens a ticket (rate limited to
 *                      5/hour per account) with the first message attached.
 * GET  /api/tickets  — the caller's own tickets (id, subject, category,
 *                      status, priority, message count, last activity).
 *
 * NOTE (Wave 7 update): the user-side ticket UI now ships in the settings
 * view ("Support" card — contact form + own-ticket list + conversation). The
 * staff queue remains in admin-view.
 */

const createSchema = z.object({
  subject: z.string().min(4).max(140),
  body: z.string().min(10).max(4000),
  category: z.enum(TICKET_CATEGORIES),
});

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, `tickets-open:${user.id}`), 5, 3_600_000)) {
      return apiError(429, 'RATE_LIMIT', 'در یک ساعت گذشته بیش از حد مجاز تیکت ثبت کرده‌اید. | You have opened too many tickets in the past hour.');
    }
    const body = await readJson(req, createSchema);
    const ticket = await db.supportTicket.create({
      data: {
        userId: user.id,
        subject: body.subject,
        category: body.category,
        status: 'OPEN',
        messages: {
          create: { authorId: user.id, body: body.body, isStaff: false },
        },
      },
      include: { _count: { select: { messages: true } } },
    });
    await logAudit(user.id, 'TICKET_OPENED', 'SupportTicket', ticket.id, { category: body.category }, req.headers.get('x-forwarded-for'));
    return json(
      {
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          category: ticket.category,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          messagesCount: ticket._count.messages,
        },
      },
      201
    );
  });
}

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const tickets = await db.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        subject: true,
        category: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
    return json({
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        messagesCount: t._count.messages,
      })),
    });
  });
}
