import { z } from 'zod';
import { db } from '@/lib/db';
import { json, readJson, withUser } from '@/lib/api';

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const unread = notifications.filter((n) => !n.readAt).length;
    return json({ notifications, unread });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, z.object({ id: z.string().optional(), all: z.boolean().default(false) }));
    if (body.all) {
      await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    } else if (body.id) {
      await db.notification.updateMany({ where: { id: body.id, userId: user.id }, data: { readAt: new Date() } });
    }
    return json({ ok: true });
  });
}
