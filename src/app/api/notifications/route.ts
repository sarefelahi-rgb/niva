import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, json, readJson, withUser } from '@/lib/api';

/**
 * Delivered = visible in the feed: never scheduled, or already materialized
 * by the scheduler tick. Pending scheduled jobs (scheduledFor set, sentAt
 * null) are exposed separately via `scheduled` and can be deleted but never
 * marked read early.
 */
const deliveredFilter = [{ scheduledFor: null }, { sentAt: { not: null } }] as const;

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const [notifications, unread, scheduled] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id, OR: [...deliveredFilter] },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.notification.count({
        where: { userId: user.id, readAt: null, OR: [...deliveredFilter] },
      }),
      db.notification.findMany({
        where: { userId: user.id, sentAt: null, scheduledFor: { not: null } },
        orderBy: { scheduledFor: 'asc' },
        take: 10,
        select: { id: true, title: true, body: true, type: true, scheduledFor: true, channel: true },
      }),
    ]);
    return json({
      notifications,
      unread,
      scheduled,
      emailTransportConfigured: Boolean(process.env.SMTP_URL && process.env.SMTP_URL.trim() !== ''),
    });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, z.object({ id: z.string().optional(), all: z.boolean().default(false) }));
    if (body.all) {
      await db.notification.updateMany({
        where: { userId: user.id, readAt: null, OR: [...deliveredFilter] },
        data: { readAt: new Date() },
      });
    } else if (body.id) {
      await db.notification.updateMany({
        where: { id: body.id, userId: user.id, OR: [...deliveredFilter] },
        data: { readAt: new Date() },
      });
    }
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');
    const row = await db.notification.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!row || row.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Notification not found');
    await db.notification.delete({ where: { id } });
    return json({ ok: true });
  });
}
