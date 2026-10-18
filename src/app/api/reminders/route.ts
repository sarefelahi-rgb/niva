import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';

const createSchema = z.object({
  title: z.string().min(2).max(120),
  type: z.enum(['APPOINTMENT', 'SCREENING', 'SUPPLEMENT', 'MEDICATION', 'CUSTOM']).default('CUSTOM'),
  dueAt: z.string(),
  repeat: z.enum(['NONE', 'DAILY', 'WEEKLY']).default('NONE'),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const reminders = await db.reminder.findMany({
      where: { userId: user.id, done: false },
      orderBy: { dueAt: 'asc' },
      take: 50,
    });
    return json({ reminders });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, createSchema);
    const due = new Date(body.dueAt);
    if (Number.isNaN(due.getTime())) return apiError(400, 'VALIDATION', 'Invalid date');
    const reminder = await db.reminder.create({
      data: { userId: user.id, title: body.title, type: body.type, dueAt: due, repeat: body.repeat },
    });
    return json({ id: reminder.id }, 201);
  });
}

export async function PATCH(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');
    const reminder = await db.reminder.findUnique({ where: { id } });
    if (!reminder || reminder.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Reminder not found');
    if (reminder.repeat === 'DAILY') {
      await db.reminder.update({
        where: { id },
        data: { dueAt: new Date(reminder.dueAt.getTime() + 86_400_000) },
      });
    } else if (reminder.repeat === 'WEEKLY') {
      await db.reminder.update({
        where: { id },
        data: { dueAt: new Date(reminder.dueAt.getTime() + 7 * 86_400_000) },
      });
    } else {
      await db.reminder.update({ where: { id }, data: { done: true } });
    }
    return json({ ok: true });
  });
}
