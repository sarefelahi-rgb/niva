import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';

/** Local-day bucket convention: UTC midnight of the YYYY-MM-DD string. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function dayBucket(s: string): Date | null {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Round-trip rejects rollovers such as 2026-02-30.
  return d.toISOString().slice(0, 10) === s ? d : null;
}
const dateField = z
  .string()
  .regex(DATE_RE, 'date must be YYYY-MM-DD')
  .refine((s) => dayBucket(s) !== null, 'date must be a real calendar date');

const createSchema = z.object({
  date: dateField,
  waterMl: z.number().int().min(0).max(10_000),
  fruits: z.number().int().min(0).max(20),
  vegetables: z.number().int().min(0).max(20),
  protein: z.number().int().min(0).max(20),
  dairy: z.number().int().min(0).max(20),
  grains: z.number().int().min(0).max(20),
  notes: z.string().max(300).optional(),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const url = new URL(req.url);
    const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? 14) || 14, 1), 60);
    const entries = await db.nutritionEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: days,
    });
    const todayKey = new Date().toISOString().slice(0, 10);
    const today = await db.nutritionEntry.findUnique({
      where: { userId_date: { userId: user.id, date: new Date(`${todayKey}T00:00:00.000Z`) } },
    });
    return json({ entries, today: today ?? null });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, 'wellness-nutrition'), 60, 5 * 60_000)) {
      return apiError(429, 'RATE_LIMIT', 'Too many requests — slow down');
    }
    const body = await readJson(req, createSchema);
    const date = dayBucket(body.date) as Date; // guaranteed by dateField refine
    const data = {
      waterMl: body.waterMl,
      fruits: body.fruits,
      vegetables: body.vegetables,
      protein: body.protein,
      dairy: body.dairy,
      grains: body.grains,
      notes: body.notes ?? null,
    };
    // Full replace semantics: every field (including zeros) is overwritten.
    const entry = await db.nutritionEntry.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: data,
      create: { userId: user.id, date, ...data },
    });
    return json({ entry });
  });
}
