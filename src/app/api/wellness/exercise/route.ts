import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';

/** Local-day bucket convention: UTC midnight of the YYYY-MM-DD string. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function dayBucket(s: string): Date | null {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === s ? d : null;
}
const dateField = z
  .string()
  .regex(DATE_RE, 'date must be YYYY-MM-DD')
  .refine((s) => dayBucket(s) !== null, 'date must be a real calendar date');

const createSchema = z.object({
  date: dateField,
  type: z.enum(['WALK', 'SWIM', 'YOGA', 'PILATES', 'STRENGTH', 'STRETCH', 'PELVIC_FLOOR', 'OTHER']),
  minutes: z.number().int().min(5).max(300),
  intensity: z.enum(['LIGHT', 'MODERATE', 'VIGOROUS']),
  notes: z.string().max(300).optional(),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const url = new URL(req.url);
    const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? 14) || 14, 1), 60);
    const entries = await db.exerciseEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: days,
    });
    // Weekly rollup: minutes + session count for the trailing 7 days (inclusive of today).
    const todayBucket = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const since = new Date(todayBucket.getTime() - 6 * 86_400_000);
    const agg = await db.exerciseEntry.aggregate({
      where: { userId: user.id, date: { gte: since } },
      _sum: { minutes: true },
      _count: { _all: true },
    });
    return json({
      entries,
      weeklyMinutes: agg._sum.minutes ?? 0,
      sessionsWeek: agg._count._all,
    });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, 'wellness-exercise'), 60, 5 * 60_000)) {
      return apiError(429, 'RATE_LIMIT', 'Too many requests — slow down');
    }
    const body = await readJson(req, createSchema);
    const date = dayBucket(body.date) as Date; // guaranteed by dateField refine
    const entry = await db.exerciseEntry.create({
      data: {
        userId: user.id,
        date,
        type: body.type,
        minutes: body.minutes,
        intensity: body.intensity,
        notes: body.notes ?? null,
      },
    });
    return json({ entry }, 201);
  });
}
