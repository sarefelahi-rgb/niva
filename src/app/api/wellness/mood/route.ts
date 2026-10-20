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

const TAGS = ['TIRED', 'ANXIOUS', 'HOPEFUL', 'CALM', 'OVERWHELMED', 'GRATEFUL', 'SAD', 'ENERGETIC'] as const;

const createSchema = z.object({
  date: dateField,
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  anxiety: z.number().int().min(1).max(5),
  tags: z.array(z.enum(TAGS)).max(4).optional(),
  notes: z.string().max(300).optional(),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const url = new URL(req.url);
    const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? 14) || 14, 1), 60);
    const entries = await db.moodEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: days,
    });
    const todayKey = new Date().toISOString().slice(0, 10);
    const today = await db.moodEntry.findUnique({
      where: { userId_date: { userId: user.id, date: new Date(`${todayKey}T00:00:00.000Z`) } },
    });
    return json({ entries, today: today ?? null });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, 'wellness-mood'), 60, 5 * 60_000)) {
      return apiError(429, 'RATE_LIMIT', 'Too many requests — slow down');
    }
    const body = await readJson(req, createSchema);
    const date = dayBucket(body.date) as Date; // guaranteed by dateField refine
    const data = {
      mood: body.mood,
      energy: body.energy,
      anxiety: body.anxiety,
      tags: JSON.stringify(body.tags ?? []),
      notes: body.notes ?? null,
    };
    const entry = await db.moodEntry.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: data,
      create: { userId: user.id, date, ...data },
    });

    // Consecutive-low support: 3 logged days (this one + previous two) all at
    // mood ≤ 2 raise a one-time, localized in-app nudge toward professional help.
    let showSupport = false;
    if (body.mood <= 2) {
      const d1 = new Date(date.getTime() - 86_400_000);
      const d2 = new Date(date.getTime() - 2 * 86_400_000);
      const recent = await db.moodEntry.findMany({
        where: { userId: user.id, date: { in: [date, d1, d2] } },
        select: { mood: true },
      });
      showSupport = recent.length === 3 && recent.every((r) => r.mood <= 2);
      if (showSupport) {
        const fa = user.locale === 'fa';
        try {
          await db.notification.create({
            data: {
              userId: user.id,
              type: 'SYSTEM',
              dedupeKey: `mood-support:${user.id}:${body.date}`,
              title: fa ? 'شما تنها نیستید' : 'You are not alone',
              body: fa
                ? 'چند روزی است که خلق‌تان پایین است. صحبت با پزشک یا متخصص سلامت روان می‌تواند کمک کند. اگر احساس ناامنی دارید، صفحه «چه زمانی کمک بگیریم» را ببینید.'
                : 'The last few days sound heavy. Talking to your clinician or a mental-health professional can help. If you feel unsafe, see the When to seek help page.',
            },
          });
        } catch {
          // dedupeKey unique violation → support notification already sent; idempotent.
        }
      }
    }
    return json({ entry, showSupport });
  });
}
