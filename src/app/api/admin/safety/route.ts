import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

export async function GET(req: Request) {
  return withUser(req, ['ADMIN', 'CLINICAL_REVIEWER'], async () => {
    const events = await db.safetyEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const userIds = [...new Set(events.map((e) => e.userId).filter((x): x is string => Boolean(x)))];
    const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } });
    const emailById = new Map(users.map((u) => [u.id, u.email]));
    return json({
      events: events.map((e) => ({ ...e, userEmail: e.userId ? emailById.get(e.userId) ?? null : null })),
    });
  });
}

export async function POST(req: Request) {
  return withUser(req, ['ADMIN', 'CLINICAL_REVIEWER'], async ({ user }) => {
    const body = await readJson(req, z.object({ id: z.string() }));
    const event = await db.safetyEvent.findUnique({ where: { id: body.id } });
    if (!event) return apiError(404, 'NOT_FOUND', 'Event not found');
    await db.safetyEvent.update({ where: { id: body.id }, data: { resolved: true } });
    await logAudit(user.id, 'SAFETY_EVENT_RESOLVE', 'SafetyEvent', body.id, null, req.headers.get('x-forwarded-for'));
    return json({ ok: true });
  });
}
