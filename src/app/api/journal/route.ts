import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { assessSafety } from '@/lib/safety';
import { logSafetyEvent } from '@/lib/audit';

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
    // Deterministic red-flag scan on journal free text (safety coverage item 2.5):
    // journaling is private, but EMERGENCY matches still raise a SafetyEvent so
    // the user is shown crisis guidance and staff can offer support.
    const assessment = assessSafety(`${body.title ?? ''} ${body.body}`);
    if (assessment.level === 'EMERGENCY') {
      await logSafetyEvent(user.id, 'RED_FLAG_SYMPTOM', 'HIGH', `Journal entry categories: ${assessment.categories.join(',')}`);
    }
    const entry = await db.journalEntry.create({
      data: { userId: user.id, title: body.title, body: body.body, mood: body.mood },
    });
    return json({ id: entry.id, safetyLevel: assessment.level, categories: assessment.categories }, 201);
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
