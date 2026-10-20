import { z } from 'zod';
import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/tickets';

/**
 * Wave 6.2 — staff ticket queue (admin console).
 * Role: SUPPORT / ADMIN / SUPER_ADMIN (`tickets.read.all`).
 * Filters: status, priority, category (single value each). Pagination with
 * limit ≤ 50. Includes requester email/name so staff can reply with context.
 * No message bodies here — the drawer fetches GET /api/tickets/[id].
 */

const querySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
});

export async function GET(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'], async () => {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      status: url.searchParams.get('status') ?? undefined,
      priority: url.searchParams.get('priority') ?? undefined,
      category: url.searchParams.get('category') ?? undefined,
    });
    const f = parsed.success ? parsed.data : {};
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '25') || 25));

    const where = {
      ...(f.status ? { status: f.status } : {}),
      ...(f.priority ? { priority: f.priority } : {}),
      ...(f.category ? { category: f.category } : {}),
    };

    const [total, open, inProgress, tickets] = await Promise.all([
      db.supportTicket.count({ where: { ...where } }),
      db.supportTicket.count({ where: { status: 'OPEN' } }),
      db.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      db.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { email: true, name: true } },
          assignee: { select: { email: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return json({
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        requester: { email: t.user.email, name: t.user.name },
        assignedTo: t.assignee?.email ?? null,
        messagesCount: t._count.messages,
      })),
      total,
      page,
      limit,
      counts: { open, inProgress },
    });
  });
}
