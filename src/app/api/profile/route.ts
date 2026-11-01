import { z } from 'zod';
import { db } from '@/lib/db';
import { json, readJson, withUser, apiError } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import {
  canTransition, isLifecycleStage, transitionError,
  type LifecycleStage,
} from '@/lib/lifecycle';

/**
 * Wave 17 — lifecycle questionnaire (feature 3) + stage state (feature 4).
 *
 * GET  → the caller's ReproductiveProfile (null-safe shape for legacy users).
 * PUT  → stepwise questionnaire save. Answers are upserted individually so an
 *        interrupted onboarding keeps whatever was already given (feature 3.8);
 *        `complete: true` finalizes onboarding and is never re-shown.
 *
 * Stage is mirrored into Preference (dashboards read it from there) and every
 * stage change writes the append-only LifecycleHistory (feature 4.5 — history
 * is never destroyed).
 */

const putSchema = z.object({
  stage: z.enum(['TRYING', 'PREGNANT', 'POSTPARTUM', 'EXPLORING']),
  tryingStatus: z.enum(['INTENDS', 'ACTIVELY_TRYING']).optional().nullable(),
  lastMenstrualPeriod: z.string().optional().nullable(), // ISO date
  cycleLengthDays: z.number().int().min(15).max(60).optional().nullable(),
  cycleLengthBand: z.enum(['B21_24', 'B25_28', 'B29_32', 'B33_35', 'IRREGULAR', 'UNKNOWN']).optional().nullable(),
  cycleRegular: z.boolean().optional().nullable(),
  periodDurationDays: z.number().int().min(1).max(14).optional().nullable(),
  tryingDuration: z.enum(['NOT_STARTED', 'LT_3M', 'M3_6', 'M6_12', 'GT_12M', 'PREFER_NOT']).optional().nullable(),
  priorPregnancy: z.enum(['YES', 'NO', 'PREFER_NOT']).optional().nullable(),
  conditions: z.array(z.enum(['IRREGULAR_CYCLE', 'PCOS', 'THYROID', 'FERTILITY_TREATMENT', 'OTHER', 'NONE', 'PREFER_NOT'])).max(7).optional(),
  complete: z.boolean().optional(),
});

/** Closes any open history row and opens a new episode for the stage. */
async function writeStageHistory(userId: string, stage: LifecycleStage, refs: { pregnancyId?: string; childId?: string } = {}) {
  const open = await db.lifecycleHistory.findFirst({ where: { userId, endedAt: null, stage } });
  if (open) return open; // already in this stage — keep the single open row
  const now = new Date();
  await db.lifecycleHistory.updateMany({ where: { userId, endedAt: null }, data: { endedAt: now } });
  return db.lifecycleHistory.create({
    data: {
      userId,
      stage,
      startedAt: now,
      pregnancyId: refs.pregnancyId ?? null,
      childId: refs.childId ?? null,
    },
  });
}

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const profile = await db.reproductiveProfile.findUnique({ where: { userId: user.id } });
    const preference = await db.preference.findUnique({ where: { userId: user.id } });
    return json({
      profile: profile
        ? {
            stage: profile.stage,
            tryingStatus: profile.tryingStatus,
            lastMenstrualPeriod: profile.lastMenstrualPeriod,
            cycleLengthDays: profile.cycleLengthDays,
            cycleLengthBand: profile.cycleLengthBand,
            cycleRegular: profile.cycleRegular,
            periodDurationDays: profile.periodDurationDays,
            tryingDuration: profile.tryingDuration,
            priorPregnancy: profile.priorPregnancy,
            conditions: JSON.parse(profile.conditions) as string[],
            onboardingStatus: profile.onboardingStatus,
          }
        : null,
      preference: preference ? { stage: preference.stage, goals: JSON.parse(preference.goals) as string[], units: preference.units } : null,
    });
  });
}

export async function PUT(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, putSchema);

    // Stage-transition guard: the questionnaire may not activate two
    // incompatible stages silently — allow only legal moves for existing rows.
    const existing = await db.reproductiveProfile.findUnique({ where: { userId: user.id } });
    if (existing && isLifecycleStage(existing.stage) && !canTransition(existing.stage as LifecycleStage, body.stage)) {
      const err = transitionError(existing.stage as LifecycleStage, body.stage);
      return apiError(409, 'INVALID_TRANSITION', err ?? 'این تغییر مرحله مجاز نیست | Stage transition not allowed');
    }

    const data = {
      stage: body.stage,
      ...(body.tryingStatus !== undefined ? { tryingStatus: body.tryingStatus } : {}),
      ...(body.lastMenstrualPeriod !== undefined
        ? { lastMenstrualPeriod: body.lastMenstrualPeriod ? new Date(body.lastMenstrualPeriod) : null }
        : {}),
      ...(body.cycleLengthDays !== undefined ? { cycleLengthDays: body.cycleLengthDays } : {}),
      ...(body.cycleLengthBand !== undefined ? { cycleLengthBand: body.cycleLengthBand } : {}),
      ...(body.cycleRegular !== undefined ? { cycleRegular: body.cycleRegular } : {}),
      ...(body.periodDurationDays !== undefined ? { periodDurationDays: body.periodDurationDays } : {}),
      ...(body.tryingDuration !== undefined ? { tryingDuration: body.tryingDuration } : {}),
      ...(body.priorPregnancy !== undefined ? { priorPregnancy: body.priorPregnancy } : {}),
      ...(body.conditions !== undefined ? { conditions: JSON.stringify(body.conditions) } : {}),
      ...(body.complete
        ? { onboardingStatus: 'COMPLETE' as const, onboardingDoneAt: new Date() }
        : {}),
    };

    const profile = await db.reproductiveProfile.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });

    // Mirror the stage into Preference (dashboards/tiles read it there).
    const prefData = { stage: body.stage };
    await db.preference.upsert({
      where: { userId: user.id },
      update: prefData,
      create: { userId: user.id, ...prefData },
    });

    if (body.stage !== 'EXPLORING') {
      // The active pregnancy/child, when already registered, anchors the history row.
      const pregnancy = await db.pregnancy.findFirst({
        where: { userId: user.id, status: { in: ['ACTIVE', 'POSTPARTUM'] } },
        orderBy: { createdAt: 'desc' },
      });
      const baby = await db.babyProfile.findUnique({ where: { userId: user.id } });
      await writeStageHistory(user.id, body.stage, {
        pregnancyId: body.stage === 'PREGNANT' ? pregnancy?.id : undefined,
        childId: body.stage === 'POSTPARTUM' ? baby?.id : undefined,
      });
    }

    await logAudit(user.id, 'PROFILE_QUESTIONNAIRE', 'ReproductiveProfile', profile.id, { stage: body.stage, complete: body.complete ?? false }, req.headers.get('x-forwarded-for'));

    return json({
      stage: profile.stage,
      onboardingStatus: profile.onboardingStatus,
    });
  });
}

export async function POST(req: Request) {
  // Explicit stage switch from Settings (feature 4.4). Data requirements are
  // validated here: →PREGNANT needs an ACTIVE pregnancy; →POSTPARTUM needs a
  // registered child; →TRYING is always allowed (new journey, history kept).
  return withUser(req, [], async ({ user }) => {
    const schema = z.object({ stage: z.enum(['TRYING', 'PREGNANT', 'POSTPARTUM']) });
    const body = await readJson(req, schema);

    const existing = await db.reproductiveProfile.findUnique({ where: { userId: user.id } });
    const from = (existing?.stage ?? 'EXPLORING') as LifecycleStage;
    if (!canTransition(from, body.stage)) {
      return apiError(409, 'INVALID_TRANSITION', transitionError(from, body.stage) ?? 'این تغییر مرحله مجاز نیست | Stage transition not allowed');
    }

    if (body.stage === 'PREGNANT') {
      const active = await db.pregnancy.findFirst({ where: { userId: user.id, status: 'ACTIVE' } });
      if (!active) return apiError(400, 'PREGNANCY_REQUIRED', 'برای فعال‌سازی دوره بارداری، ابتدا اطلاعات بارداری را ثبت کنید | Register pregnancy details first');
    }
    if (body.stage === 'POSTPARTUM') {
      const baby = await db.babyProfile.findUnique({ where: { userId: user.id } });
      if (!baby) return apiError(400, 'CHILD_REQUIRED', 'برای فعال‌سازی دوره پس از زایمان، ابتدا تولد کودک را ثبت کنید | Register the birth first');
    }

    const profile = await db.reproductiveProfile.upsert({
      where: { userId: user.id },
      update: { stage: body.stage },
      create: { userId: user.id, stage: body.stage },
    });
    await db.preference.upsert({
      where: { userId: user.id },
      update: { stage: body.stage },
      create: { userId: user.id, stage: body.stage },
    });

    const pregnancy = body.stage === 'PREGNANT'
      ? await db.pregnancy.findFirst({ where: { userId: user.id, status: 'ACTIVE' } })
      : null;
    const baby = body.stage === 'POSTPARTUM' ? await db.babyProfile.findUnique({ where: { userId: user.id } }) : null;
    await writeStageHistory(user.id, body.stage, {
      pregnancyId: pregnancy?.id,
      childId: baby?.id,
    });

    await logAudit(user.id, 'PROFILE_STAGE_SWITCH', 'ReproductiveProfile', profile.id, { from, to: body.stage }, req.headers.get('x-forwarded-for'));
    return json({ stage: profile.stage });
  });
}
