import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';

const createSchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().min(1).max(10_000),
  mood: z.enum(['GREAT', 'GOOD', 'NEUTRAL', 'LOW', 'STRUGGLING']).optional(),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const entries = await db.journalEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return json({ entries });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, createSchema);
    const entry = await db.journalEntry.create({
      data: { userId: user.id, title: body.title, body: body.body, mood: body.mood },
    });
    return json({ id: entry.id }, 201);
  });
}

export async function DELETE(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');
    // Object-level authorization: only the owner can delete.
    const entry = await db.journalEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Entry not found');
    await db.journalEntry.delete({ where: { id } });
    return json({ ok: true });
  });
}
