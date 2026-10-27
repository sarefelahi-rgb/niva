import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { computeCycleStats } from '@/lib/cycle';
import { startOfDay } from '@/lib/gestational';

/**
 * Wave 14 — cycle companion (pre-conception journey).
 * PERIOD entries power the calendar + predictions; INTIMACY entries log
 * intercourse dates («تاریخ اقدام به نزدیکی»). Educational estimates only.
 */
const periodSchema = z.object({
  kind: z.literal('PERIOD'),
  date: z.string(), // ISO date
  flow: z.enum(['SPOTTING', 'LIGHT', 'MEDIUM', 'HEAVY']).default('MEDIUM'),
  notes: z.string().max(300).optional(),
});

const intimacySchema = z.object({
  kind: z.literal('INTIMACY'),
  date: z.string(),
  notes: z.string().max(300).optional(),
});

const createSchema = z.discriminatedUnion('kind', [periodSchema, intimacySchema]);

const TWO_YEARS_MS = 2 * 365 * 86_400_000;

function normalizeDay(raw: string): Date | null {
  const d = startOfDay(new Date(raw));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const since = new Date(Date.now() - 400 * 86_400_000);
    const [period, intimacy] = await Promise.all([
      db.cycleEntry.findMany({
        where: { userId: user.id, date: { gte: since } },
        orderBy: { date: 'asc' },
        take: 400,
      }),
      db.intimacyEntry.findMany({
        where: { userId: user.id, date: { gte: since } },
        orderBy: { date: 'asc' },
        take: 400,
      }),
    ]);
    const stats = computeCycleStats(period);
    return json({ period, intimacy, stats: serializeStats(stats) });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, 'cycle'), 60, 300_000)) {
      return apiError(429, 'RATE_LIMIT', 'Too many entries — slow down.');
    }
    const body = await readJson(req, createSchema);
    const day = normalizeDay(body.date);
    if (!day) return apiError(400, 'VALIDATION', 'Invalid date');
    if (day.getTime() > Date.now() + 120_000) {
      return apiError(400, 'VALIDATION', 'date cannot be in the future');
    }
    if (Date.now() - day.getTime() > TWO_YEARS_MS) {
      return apiError(400, 'VALIDATION', 'date is too far in the past');
    }

    if (body.kind === 'PERIOD') {
      // One row per user+date: re-logging a day updates its flow level.
      const entry = await db.cycleEntry.upsert({
        where: { userId_date: { userId: user.id, date: day } },
        update: { flow: body.flow, notes: body.notes ?? null },
        create: { userId: user.id, date: day, flow: body.flow, notes: body.notes ?? null },
      });
      return json({ entry }, 201);
    }

    const entry = await db.intimacyEntry.upsert({
      where: { userId_date: { userId: user.id, date: day } },
      update: { notes: body.notes ?? null },
      create: { userId: user.id, date: day, notes: body.notes ?? null },
    });
    return json({ entry }, 201);
  });
}

export async function DELETE(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const params = new URL(req.url).searchParams;
    const kind = params.get('kind');
    const id = params.get('id');
    if (!kind || !id) return apiError(400, 'VALIDATION', 'kind and id required');
    if (kind === 'PERIOD') {
      const entry = await db.cycleEntry.findUnique({ where: { id } });
      if (!entry || entry.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Entry not found');
      await db.cycleEntry.delete({ where: { id } });
      return json({ ok: true });
    }
    if (kind === 'INTIMACY') {
      const entry = await db.intimacyEntry.findUnique({ where: { id } });
      if (!entry || entry.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Entry not found');
      await db.intimacyEntry.delete({ where: { id } });
      return json({ ok: true });
    }
    return apiError(400, 'VALIDATION', 'kind must be PERIOD or INTIMACY');
  });
}

/** JSON-safe cycle stats (dates → ISO). */
function serializeStats(stats: ReturnType<typeof computeCycleStats>) {
  return {
    episodes: stats.episodes.map((e) => ({
      start: e.start.toISOString(),
      days: e.days.map((d) => d.toISOString()),
    })),
    cycleLengths: stats.cycleLengths,
    avgCycleDays: stats.avgCycleDays,
    avgPeriodDays: stats.avgPeriodDays,
    nextPeriodStart: stats.nextPeriodStart?.toISOString() ?? null,
    ovulationDate: stats.ovulationDate?.toISOString() ?? null,
    fertileWindow: stats.fertileWindow
      ? { start: stats.fertileWindow.start.toISOString(), end: stats.fertileWindow.end.toISOString() }
      : null,
    cycleDay: stats.cycleDay,
  };
}
