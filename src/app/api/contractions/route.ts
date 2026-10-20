import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';

const createSchema = z.object({
  startedAt: z.string(),
  durationSec: z.number().int().min(5).max(600),
  intensity: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(300).optional(),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const since = new Date(Date.now() - 24 * 3_600_000);
    const entries = await db.contractionEntry.findMany({
      where: { userId: user.id, startedAt: { gte: since } },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    return json({ entries });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, 'contractions'), 30, 600_000)) {
      return apiError(429, 'RATE_LIMIT', 'Too many contraction entries — slow down.');
    }
    const body = await readJson(req, createSchema);
    // Date coercion follows the reminders route convention (z.string() → Date).
    const startedAt = new Date(body.startedAt);
    if (Number.isNaN(startedAt.getTime())) return apiError(400, 'VALIDATION', 'Invalid date');
    // Clock-skew tolerance of 2 minutes; anything later is a client error.
    if (startedAt.getTime() > Date.now() + 120_000) {
      return apiError(400, 'VALIDATION', 'startedAt cannot be in the future');
    }
    const entry = await db.contractionEntry.create({
      data: {
        userId: user.id,
        startedAt,
        durationSec: body.durationSec,
        intensity: body.intensity,
        notes: body.notes,
      },
    });
    return json({ entry }, 201);
  });
}

export async function DELETE(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');
    // Object-level authorization: only the owner can delete.
    const entry = await db.contractionEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Entry not found');
    await db.contractionEntry.delete({ where: { id } });
    return json({ ok: true });
  });
}
