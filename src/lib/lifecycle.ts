/**
 * NIVA lifecycle engine — Wave 17 (features 3 & 4 of the master prompt).
 *
 * The three-journey state machine: TRYING_TO_CONCEIVE (اقدام) → PREGNANT
 * (بارداری) → POSTPARTUM (پس از زایمان), plus the legacy EXPLORING state.
 * All transitions are validated server-side (see /api/profile + /api/pregnancy
 * TRANSITION); the UI mirrors, never invents, them.
 *
 * Guarantees:
 * - Transitions never destroy prior medical data (history rows in
 *   LifecycleHistory are append-only; stage switching never cascades deletes).
 * - Pure, client-safe helpers; DB writes live in the API routes.
 * - Educational only: age/week math degrades to `null` rather than guessing.
 */

import { asDay } from './cycle';
import { daysBetween } from './gestational';

export type LifecycleStage = 'TRYING' | 'PREGNANT' | 'POSTPARTUM' | 'EXPLORING';

export const LIFECYCLE_STAGES: LifecycleStage[] = ['TRYING', 'PREGNANT', 'POSTPARTUM', 'EXPLORING'];

/** Prompt stages with real journeys; EXPLORING is browse-only. */
export const JOURNEY_STAGES: Array<'TRYING' | 'PREGNANT' | 'POSTPARTUM'> = ['TRYING', 'PREGNANT', 'POSTPARTUM'];

export function isLifecycleStage(v: unknown): v is LifecycleStage {
  return typeof v === 'string' && (LIFECYCLE_STAGES as string[]).includes(v);
}

/**
 * Transition legality (data-requirements are enforced by the caller with the
 * DB — pregnancy row for →PREGNANT, baby profile for →POSTPARTUM).
 *
 *  EXPLORING  → TRYING | PREGNANT | POSTPARTUM   (first questionnaire pick)
 *  TRYING     → PREGNANT                          (pregnancy confirmed)
 *  PREGNANT   → POSTPARTUM                        (birth registered)
 *  POSTPARTUM → TRYING                            (new journey; history kept)
 *  Any stage  → EXPLORING is NOT offered (destructive to personalization).
 */
export function canTransition(from: LifecycleStage, to: LifecycleStage): boolean {
  if (from === to) return true;
  if (from === 'EXPLORING') return to !== 'EXPLORING';
  if (from === 'TRYING') return to === 'PREGNANT';
  if (from === 'PREGNANT') return to === 'POSTPARTUM';
  if (from === 'POSTPARTUM') return to === 'TRYING' || to === 'PREGNANT';
  return false;
}

/** Human-readable transition error keys for the API/UI. */
export function transitionError(from: LifecycleStage, to: LifecycleStage): string | null {
  if (canTransition(from, to)) return null;
  return `lifecycle.transition.${from.toLowerCase()}To${to.charAt(0)}${to.slice(1).toLowerCase()}`;
}

/* ── Child age groups (feature 7 — complementary feeding 6–24 months) ─────── */

export type ChildAgeGroup = 'PRE_SOLID' | '6_8' | '9_11' | '12_15' | '16_18' | '19_24' | 'BEYOND_24';

/** Inclusive day boundaries per prompt §8.2. ~6 months = 183 days. */
export const AGE_GROUP_BOUNDS: Array<{ group: ChildAgeGroup; from: number; to: number }> = [
  { group: 'PRE_SOLID', from: 0, to: 182 },
  { group: '6_8', from: 183, to: 273 },
  { group: '9_11', from: 274, to: 364 },
  { group: '12_15', from: 365, to: 486 },
  { group: '16_18', from: 487, to: 577 },
  { group: '19_24', from: 578, to: 730 },
];

export function ageGroupForDays(totalDays: number): ChildAgeGroup {
  if (totalDays < 0) return 'PRE_SOLID';
  for (const b of AGE_GROUP_BOUNDS) {
    if (totalDays >= b.from && totalDays <= b.to) return b.group;
  }
  return 'BEYOND_24';
}

/** i18n keys per age group (nutrition view tabs). */
export function ageGroupKey(group: ChildAgeGroup): string {
  if (group === 'PRE_SOLID') return 'nut.agePreSolid';
  if (group === 'BEYOND_24') return 'nut.ageBeyond';
  return `nut.age${group.replace('_', '_')}`;
}

/* ── Corrected age (feature 4 — postpartum dashboard) ──────────────────────── */

export interface CorrectedAge {
  /** Chronological age in days (never negative). */
  chronologicalDays: number;
  /** Corrected age in days = chronological − (40 − gestationalWeeks)·7. Null when not preterm/unknown. */
  correctedDays: number | null;
  /** True when corrected age is scientifically relevant (born <37 weeks). */
  applies: boolean;
}

/**
 * Corrected age matters for preterm children (<37 weeks) when assessing
 * growth/development — never replaces the clinician's assessment.
 */
export function correctedAgeAt(birthDate: Date | string, gestationalAgeWeeks: number | null | undefined, at: Date = new Date()): CorrectedAge {
  const chronologicalDays = Math.max(0, daysBetween(asDay(birthDate), asDay(at)));
  const weeks = typeof gestationalAgeWeeks === 'number' && gestationalAgeWeeks >= 20 && gestationalAgeWeeks <= 42 ? gestationalAgeWeeks : null;
  if (weeks === null || weeks >= 37) {
    return { chronologicalDays, correctedDays: null, applies: false };
  }
  const shortfallDays = (40 - weeks) * 7;
  return { chronologicalDays, correctedDays: Math.max(0, chronologicalDays - shortfallDays), applies: true };
}

/* ── Local-day bucketing (feature 1 — day-stable recommendation) ──────────── */

/**
 * Local calendar-day key (YYYY-MM-DD) in the given IANA timezone.
 * Falls back to Asia/Tehran (primary audience) on unknown zones.
 */
export function localDayKey(timeZone: string | null | undefined, at: Date = new Date()): string {
  let tz = timeZone ?? '';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined }).format(at);
  } catch {
    tz = 'Asia/Tehran';
  }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
    return parts; // en-CA gives YYYY-MM-DD
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/** UTC-midnight Date for a local-day key — stable bucket for SQLite. */
export function dayKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/**
 * Deterministic 32-bit string hash (FNV-1a) — same inputs → same pick, so a
 * user's recommendation stays fixed all day and rotates naturally at midnight.
 */
export function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
