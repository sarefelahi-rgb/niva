import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';

const feedingSchema = z.object({
  kind: z.literal('FEEDING'),
  fedAt: z.string(),
  method: z.enum(['BREAST', 'BOTTLE_BREASTMILK', 'BOTTLE_FORMULA', 'MIXED']),
  side: z.enum(['LEFT', 'RIGHT', 'BOTH', 'NONE']).default('NONE'),
  durationMin: z.number().int().min(1).max(120).optional(),
  amountMl: z.number().int().min(1).max(500).optional(),
  notes: z.string().max(300).optional(),
});

const careSchema = z.object({
  kind: z.literal('CARE'),
  happenedAt: z.string(),
  careKind: z.enum(['DIAPER', 'SLEEP', 'BATH', 'WEIGHT', 'NOTE']),
  detail: z.enum(['WET', 'SOILED', 'BOTH']).optional(),
  value: z.number().optional(),
  note: z.string().max(300).optional(),
});

const createSchema = z.discriminatedUnion('kind', [
  feedingSchema,
  careSchema,
  z.object({
    kind: z.literal('PROFILE'),
    name: z.string().min(1).max(60),
    birthDate: z.string(),
    gender: z.enum(['GIRL', 'BOY', 'UNDISCLOSED']).default('UNDISCLOSED'),
    birthWeightG: z.number().int().min(500).max(7000).optional(),
    birthLengthCm: z.number().int().min(25).max(70).optional(),
    birthNote: z.string().max(300).optional(),
  }),
  z.object({
    kind: z.literal('MILESTONE'),
    key: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
    achievedAt: z.string(),
    note: z.string().max(300).optional(),
  }),
]);

/** Physical bounds for numeric care values (server-side trust boundary). */
const VALUE_BOUNDS: Record<string, { min: number; max: number }> = {
  SLEEP: { min: 0, max: 24 },
  WEIGHT: { min: 200, max: 15_000 },
};

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const since = new Date(Date.now() - 24 * 3_600_000);
    const [feeding, care, feedsLast24h, profile, milestones] = await Promise.all([
      db.feedingEntry.findMany({
        where: { userId: user.id },
        orderBy: { fedAt: 'desc' },
        take: 50,
      }),
      db.babyCareEntry.findMany({
        where: { userId: user.id },
        orderBy: { happenedAt: 'desc' },
        take: 50,
      }),
      db.feedingEntry.count({ where: { userId: user.id, fedAt: { gte: since } } }),
      db.babyProfile.findUnique({ where: { userId: user.id } }),
      db.milestoneEntry.findMany({ where: { userId: user.id }, orderBy: { achievedAt: 'asc' } }),
    ]);
    return json({ feeding, care, feedsLast24h, profile, milestones });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, 'baby'), 60, 300_000)) {
      return apiError(429, 'RATE_LIMIT', 'Too many entries — slow down.');
    }
    const body = await readJson(req, createSchema);

    // ── Wave 14: birth registration (BabyProfile upsert) ──
    if (body.kind === 'PROFILE') {
      const birthDate = new Date(body.birthDate);
      if (Number.isNaN(birthDate.getTime())) {
        return apiError(400, 'VALIDATION', 'Invalid birth date');
      }
      if (birthDate.getTime() > Date.now() + 120_000) {
        return apiError(400, 'VALIDATION', 'birthDate cannot be in the future');
      }
      if (Date.now() - birthDate.getTime() > 2 * 365 * 86_400_000) {
        return apiError(400, 'VALIDATION', 'birthDate is too far in the past');
      }
      const profile = await db.babyProfile.upsert({
        where: { userId: user.id },
        update: {
          name: body.name,
          birthDate,
          gender: body.gender,
          ...(body.birthWeightG !== undefined ? { birthWeightG: body.birthWeightG } : {}),
          ...(body.birthLengthCm !== undefined ? { birthLengthCm: body.birthLengthCm } : {}),
          ...(body.birthNote !== undefined ? { birthNote: body.birthNote } : {}),
        },
        create: {
          userId: user.id,
          name: body.name,
          birthDate,
          gender: body.gender,
          birthWeightG: body.birthWeightG,
          birthLengthCm: body.birthLengthCm,
          birthNote: body.birthNote,
        },
      });
      return json({ profile }, 201);
    }

    // ── Wave 14: milestone achievement (upsert by stable key) ──
    if (body.kind === 'MILESTONE') {
      const achievedAt = new Date(body.achievedAt);
      if (Number.isNaN(achievedAt.getTime())) {
        return apiError(400, 'VALIDATION', 'Invalid achievedAt date');
      }
      if (achievedAt.getTime() > Date.now() + 120_000) {
        return apiError(400, 'VALIDATION', 'achievedAt cannot be in the future');
      }
      const entry = await db.milestoneEntry.upsert({
        where: { userId_key: { userId: user.id, key: body.key } },
        update: { achievedAt, note: body.note ?? null },
        create: { userId: user.id, key: body.key, achievedAt, note: body.note },
      });
      return json({ entry }, 201);
    }

    if (body.kind === 'FEEDING') {
      const fedAt = new Date(body.fedAt);
      if (Number.isNaN(fedAt.getTime())) return apiError(400, 'VALIDATION', 'Invalid date');
      // Clock-skew tolerance of 2 minutes; anything later is a client error.
      if (fedAt.getTime() > Date.now() + 120_000) {
        return apiError(400, 'VALIDATION', 'fedAt cannot be in the future');
      }
      const entry = await db.feedingEntry.create({
        data: {
          userId: user.id,
          fedAt,
          method: body.method,
          side: body.side,
          durationMin: body.durationMin,
          amountMl: body.amountMl,
          notes: body.notes,
        },
      });
      return json({ entry }, 201);
    }

    const happenedAt = new Date(body.happenedAt);
    if (Number.isNaN(happenedAt.getTime())) return apiError(400, 'VALIDATION', 'Invalid date');
    if (happenedAt.getTime() > Date.now() + 120_000) {
      return apiError(400, 'VALIDATION', 'happenedAt cannot be in the future');
    }
    // value is client-trusted for free-form kinds, but SLEEP/WEIGHT have
    // physical bounds — reject rather than store impossible numbers.
    if (body.value !== undefined) {
      const bounds = VALUE_BOUNDS[body.careKind];
      if (bounds && (body.value < bounds.min || body.value > bounds.max)) {
        return apiError(400, 'VALIDATION', `value out of range for ${body.careKind}`);
      }
    }
    const entry = await db.babyCareEntry.create({
      data: {
        userId: user.id,
        happenedAt,
        kind: body.careKind,
        detail: body.detail,
        value: body.value,
        note: body.note,
      },
    });
    return json({ entry }, 201);
  });
}

export async function DELETE(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const params = new URL(req.url).searchParams;
    const kind = params.get('kind');
    const id = params.get('id');
    // MILESTONE entries are addressed by their stable key, others by row id.
    if (!kind || (kind === 'MILESTONE' ? !params.get('key') : !id)) {
      return apiError(400, 'VALIDATION', 'kind and id/key required');
    }
    if (kind === 'FEEDING') {
      const entry = await db.feedingEntry.findUnique({ where: { id } });
      if (!entry || entry.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Entry not found');
      await db.feedingEntry.delete({ where: { id } });
      return json({ ok: true });
    }
    if (kind === 'CARE') {
      const entry = await db.babyCareEntry.findUnique({ where: { id } });
      if (!entry || entry.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Entry not found');
      await db.babyCareEntry.delete({ where: { id } });
      return json({ ok: true });
    }
    if (kind === 'MILESTONE') {
      const key = params.get('key');
      if (!key) return apiError(400, 'VALIDATION', 'key required');
      const entry = await db.milestoneEntry.findUnique({
        where: { userId_key: { userId: user.id, key } },
      });
      if (!entry) return apiError(404, 'NOT_FOUND', 'Entry not found');
      await db.milestoneEntry.delete({ where: { id: entry.id } });
      return json({ ok: true });
    }
    return apiError(400, 'VALIDATION', 'kind must be FEEDING, CARE or MILESTONE');
  });
}
