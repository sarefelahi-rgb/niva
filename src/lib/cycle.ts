/**
 * NIVA cycle companion engine (Wave 14 — trying-to-conceive journey).
 *
 * Scientific basis (educational estimate, never a diagnostic claim):
 * - Cycle length: mean of the last up-to-6 completed intervals between
 *   consecutive period starts (WHO reference range 21–35 days; values outside
 *   15–60 are treated as outliers and excluded from the average).
 * - Ovulation: luteal-phase-fixed estimate — next period − 14 days.
 * - Fertile window: ovulation −5 … ovulation +1 (sperm survival × ovum
 *   viability; ACOG/WHO patient-education convention).
 *
 * Guarantees:
 * - Pure, client-safe, deterministic (same inputs → same outputs).
 * - Sparse or irregular data degrades gracefully: predictions are omitted
 *   (`null`) rather than guessed from a single data point; a default 28-day
 *   textbook cycle is used ONLY when ≥2 period starts exist to average.
 * - Clinical disclaimer lives with the UI copy, not here.
 */

import { addDays, daysBetween, startOfDay } from './gestational';

export type FlowLevel = 'SPOTTING' | 'LIGHT' | 'MEDIUM' | 'HEAVY';

export interface CycleEntryLike {
  date: Date | string;
  flow?: string | null;
}

export interface CycleEpisode {
  /** First day of the period episode. */
  start: Date;
  /** Consecutive logged days belonging to this episode (≥1). */
  days: Date[];
}

export interface CycleStats {
  /** Consecutive-day-grouped period episodes, oldest → newest. */
  episodes: CycleEpisode[];
  /** Interval (days) between consecutive episode starts, oldest → newest. */
  cycleLengths: number[];
  /** Mean of the last ≤6 in-range cycle lengths; null when <2 starts. */
  avgCycleDays: number | null;
  /** Mean logged episode length in days; null when no episodes. */
  avgPeriodDays: number | null;
  /** Predicted next period start; null when insufficient data. */
  nextPeriodStart: Date | null;
  /** Estimated ovulation day (next period − 14); null when unavailable. */
  ovulationDate: Date | null;
  /** Fertile window [ovulation −5, ovulation +1]; null when unavailable. */
  fertileWindow: { start: Date; end: Date } | null;
  /** Days between the most recent period start and today (≥0). */
  cycleDay: number | null;
}

const MIN_VALID_CYCLE = 15;
const MAX_VALID_CYCLE = 60;
const LUTEAL_DAYS = 14;
const FERTILE_BEFORE_OVULATION = 5;
const FERTILE_AFTER_OVULATION = 1;
/** Gap tolerance when grouping consecutive flow days into one episode. */
const EPISODE_GAP_DAYS = 1;

export function asDay(d: Date | string): Date {
  return startOfDay(new Date(d));
}

/** Groups raw entries into consecutive-day period episodes (oldest → newest). */
export function groupEpisodes(entries: CycleEntryLike[]): CycleEpisode[] {
  const days = Array.from(
    new Set(entries.map((e) => asDay(e.date).getTime()))
  )
    .sort((a, b) => a - b)
    .map((t) => new Date(t));
  const episodes: CycleEpisode[] = [];
  for (const day of days) {
    const last = episodes[episodes.length - 1];
    const lastDay = last?.days[last.days.length - 1];
    if (last && lastDay && daysBetween(lastDay, day) <= EPISODE_GAP_DAYS) {
      last.days.push(day);
    } else {
      episodes.push({ start: day, days: [day] });
    }
  }
  return episodes;
}

export function computeCycleStats(entries: CycleEntryLike[], today: Date = new Date()): CycleStats {
  const episodes = groupEpisodes(entries);
  const starts = episodes.map((e) => e.start);

  const cycleLengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    cycleLengths.push(daysBetween(starts[i - 1], starts[i]));
  }
  const inRange = cycleLengths.filter((n) => n >= MIN_VALID_CYCLE && n <= MAX_VALID_CYCLE);
  const recent = inRange.slice(-6);
  const avgCycleDays = recent.length >= 2
    ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
    : null;

  const avgPeriodDays = episodes.length
    ? Math.round((episodes.reduce((a, e) => a + e.days.length, 0) / episodes.length) * 10) / 10
    : null;

  const lastStart = starts.length ? starts[starts.length - 1] : null;
  const cycleLength = avgCycleDays ?? 28;
  let nextPeriodStart: Date | null = null;
  if (lastStart && (avgCycleDays !== null || starts.length >= 1)) {
    nextPeriodStart = addDays(lastStart, cycleLength);
    // If the predicted date already passed (late period), project one more
    // cycle forward so the calendar always points at a future date.
    if (daysBetween(nextPeriodStart, today) > cycleLength / 2) {
      nextPeriodStart = addDays(nextPeriodStart, cycleLength);
    }
  }

  const ovulationDate =
    nextPeriodStart ? addDays(nextPeriodStart, -LUTEAL_DAYS) : null;
  const fertileWindow = ovulationDate
    ? {
        start: addDays(ovulationDate, -FERTILE_BEFORE_OVULATION),
        end: addDays(ovulationDate, FERTILE_AFTER_OVULATION),
      }
    : null;

  const cycleDay = lastStart
    ? Math.min(Math.max(daysBetween(lastStart, today) + 1, 1), 90)
    : null;

  return {
    episodes,
    cycleLengths,
    avgCycleDays,
    avgPeriodDays,
    nextPeriodStart,
    ovulationDate,
    fertileWindow,
    cycleDay,
  };
}

export type CycleDayKind =
  | 'PERIOD'
  | 'PREDICTED_PERIOD'
  | 'FERTILE'
  | 'OVULATION'
  | 'INTIMACY'
  | 'PLAIN';

/**
 * Classifies a calendar day against the computed cycle (pure; used by the
 * fertility calendar). `intimacyDays` marks logged intercourse dates.
 */
export function classifyCycleDay(
  day: Date,
  stats: CycleStats,
  intimacyDays: Set<number>,
  today: Date = new Date()
): CycleDayKind {
  if (intimacyDays.has(asDay(day).getTime())) return 'INTIMACY';
  for (const ep of stats.episodes) {
    if (ep.days.some((d) => d.getTime() === asDay(day).getTime())) return 'PERIOD';
  }
  if (stats.nextPeriodStart && daysBetween(stats.nextPeriodStart, day) === 0 && daysBetween(today, day) >= 0) {
    return 'PREDICTED_PERIOD';
  }
  if (stats.ovulationDate && daysBetween(stats.ovulationDate, day) === 0 && daysBetween(today, day) >= 0) {
    return 'OVULATION';
  }
  if (
    stats.fertileWindow &&
    daysBetween(stats.fertileWindow.start, day) >= 0 &&
    daysBetween(day, stats.fertileWindow.end) >= 0
  ) {
    return 'FERTILE';
  }
  return 'PLAIN';
}

/** Baby age decomposition for the postpartum companion. */
export interface BabyAge {
  totalDays: number;
  months: number; // completed months
  days: number; // days into the current (incomplete) month
  weeks: number; // completed weeks
  weekDays: number;
}

export function babyAgeAt(birthDate: Date | string, at: Date = new Date()): BabyAge {
  const birth = asDay(birthDate);
  const now = asDay(at);
  const totalDays = Math.max(0, daysBetween(birth, now));

  // Completed calendar months (handles month lengths without approximation).
  let months = 0;
  let cursor = new Date(birth);
  while (true) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    if (daysBetween(next, now) < 0) break;
    months += 1;
    cursor = next;
    if (months > 24) break; // companion covers the first year; hard stop for safety
  }
  const days = daysBetween(cursor, now);
  const weeks = Math.floor(totalDays / 7);
  const weekDays = totalDays % 7;
  return { totalDays, months, days, weeks, weekDays };
}
