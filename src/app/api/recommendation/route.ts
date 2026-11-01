import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';
import { gestationalAgeAt } from '@/lib/gestational';
import { babyAgeAt } from '@/lib/cycle';
import { correctedAgeAt, dayKeyToDate, localDayKey, stableHash } from '@/lib/lifecycle';

/**
 * Wave 17 — «توصیه امروز نیوا» (feature 1).
 *
 * Selection contract (master prompt §2.4):
 * - Pool = reviewed, PUBLISHED recommendations matching the user's current
 *   lifecycle stage; PREGNANT narrows by gestational week; POSTPARTUM narrows
 *   by the child's age in days (corrected age when the child was preterm —
 *   developmental context, flagged in the response).
 * - Stable for the whole local day (Asia/Tehran by default, client tz hint
 *   accepted), rotates the next day — deterministic hash, no randomness.
 * - Avoids the last 5 shown entries when the pool is wide enough.
 * - Incomplete profile → safe GENERAL fallback (never a blank card).
 * - No LLM-generated medical advice: only seeded, reviewed content surfaces.
 */

const REPEAT_LOOKBACK_DAYS = 5;

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const url = new URL(req.url);
    const tz = url.searchParams.get('tz');
    const dayKey = localDayKey(tz);
    const dayDate = dayKeyToDate(dayKey);

    // ── Resolve the user's stage + week/age context ──
    const [preference, pregnancy, baby] = await Promise.all([
      db.preference.findUnique({ where: { userId: user.id } }),
      db.pregnancy.findFirst({
        where: { userId: user.id, status: { in: ['ACTIVE', 'POSTPARTUM'] } },
        orderBy: { createdAt: 'desc' },
      }),
      db.babyProfile.findUnique({ where: { userId: user.id } }),
    ]);

    const stage = preference?.stage ?? 'EXPLORING';

    let week: number | null = null;
    let childAgeDays: number | null = null;
    let correctedDays: number | null = null;
    if (pregnancy && pregnancy.status === 'ACTIVE') {
      const ga = gestationalAgeAt({ dueDate: new Date(pregnancy.dueDate) });
      if (ga.totalDays >= 0 && ga.weeks >= 2 && ga.weeks <= 42) week = Math.min(Math.max(ga.weeks, 4), 40);
    }
    if (baby) {
      childAgeDays = babyAgeAt(new Date(baby.birthDate)).totalDays;
      correctedDays = correctedAgeAt(new Date(baby.birthDate), baby.gestationalAgeWeeks).correctedDays;
      if (correctedDays !== null && correctedDays !== childAgeDays) {
        // Developmental relevance for preterm children: prefer the corrected
        // band when it differs (still shows both in the UI meta).
        childAgeDays = correctedDays;
      }
    }

    // ── Eligible pool ──
    const published = await db.dailyRecommendation.findMany({
      where: { status: 'PUBLISHED' },
    });
    const inStage = (r: (typeof published)[number]) => {
      if (stage === 'PREGNANT') {
        if (r.stage !== 'PREGNANT') return false;
        const from = r.weekFrom ?? 4;
        const to = r.weekTo ?? 40;
        return week === null ? true : (week >= from && week <= to) || (week < from && r.stage === 'PREGNANT' && (r.weekFrom ?? 4) <= 4);
      }
      if (stage === 'POSTPARTUM') {
        if (r.stage !== 'POSTPARTUM') return false;
        const from = r.ageFromDays ?? 0;
        const to = r.ageToDays ?? 730;
        return childAgeDays === null ? true : childAgeDays >= from && childAgeDays <= to;
      }
      if (stage === 'TRYING') return r.stage === 'TRYING';
      return r.stage === 'GENERAL';
    };

    let pool = published.filter(inStage);

    // Fallback chain: week-band miss → whole-stage → GENERAL → any published.
    if (pool.length === 0 && stage === 'PREGNANT') pool = published.filter((r) => r.stage === 'PREGNANT');
    if (pool.length === 0 && stage === 'POSTPARTUM') pool = published.filter((r) => r.stage === 'POSTPARTUM');
    if (pool.length === 0) pool = published.filter((r) => r.stage === 'GENERAL');
    if (pool.length === 0) pool = published;
    if (pool.length === 0) return json({ recommendation: null, day: dayKey, stage, week, childAgeDays, correctedShown: correctedDays });

    // ── Recent-repeat avoidance (best effort; the day hash still wins) ──
    const since = new Date(dayDate.getTime() - REPEAT_LOOKBACK_DAYS * 86_400_000);
    const recent = await db.recommendationLog.findMany({
      where: { userId: user.id, date: { gte: since, lt: dayDate } },
      select: { recommendationId: true },
    });
    const recentIds = new Set(recent.map((r) => r.recommendationId));
    const fresh = pool.filter((r) => !recentIds.has(r.id));
    const candidates = fresh.length >= 2 ? fresh : pool;

    // ── Deterministic daily pick (priority-weighted: top-8 by priority) ──
    const ordered = [...candidates].sort((a, b) => a.priority - b.priority || a.slug.localeCompare(b.slug));
    const top = ordered.slice(0, Math.min(8, ordered.length));
    const picked = top[stableHash(`${user.id}|${stage}|${week ?? 'x'}|${childAgeDays ?? 'x'}|${dayKey}`) % top.length];

    // Log the shown entry (upsert keeps exactly one row per user per day).
    await db.recommendationLog.upsert({
      where: { userId_date: { userId: user.id, date: dayDate } },
      update: { recommendationId: picked.id, stage },
      create: { userId: user.id, date: dayDate, recommendationId: picked.id, stage },
    });

    return json({
      recommendation: {
        slug: picked.slug,
        title: picked.title,
        titleEn: picked.titleEn,
        summary: picked.summary,
        summaryEn: picked.summaryEn,
        fullContent: picked.fullContent,
        fullContentEn: picked.fullContentEn,
        category: picked.category,
        medicalSource: picked.medicalSource,
        sourceUrl: picked.sourceUrl,
        medicallyReviewedAt: picked.medicallyReviewedAt,
        contentVersion: picked.contentVersion,
      },
      day: dayKey,
      stage,
      week,
      childAgeDays,
      correctedShown: correctedDays,
    });
  });
}
