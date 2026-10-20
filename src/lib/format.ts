/**
 * NIVA locale formatting primitives — client-safe, pure, zero side effects.
 * Wave 6.3 (backlog item 6.3). Companion: src/lib/icu.ts (message syntax) —
 * this module holds the locale-aware primitives that both icu.ts and call
 * sites use directly.
 *
 * Conventions (all verified against the codebase, see docs/audit/11-bidi-qa.md):
 *
 * ── Calendar ────────────────────────────────────────────────────────────────
 * fa → Intl 'fa-IR-u-ca-persian' (explicit Jalali/Persian calendar, Persian
 * digits come with the locale's arabext numbering system). en → 'en-US'
 * Gregorian. Sanity anchor: 2026-03-21 → «۱ فروردین ۱۴۰۵» (verified in the
 * wave 6.3 demo run and in docs/audit/11-bidi-qa.md §7).
 *
 * ── Money minor units (NIVA convention — verified in src/lib/plans.ts +
 * src/lib/psp/index.ts, must never change silently) ─────────────────────────
 * - IRR: amountMinor = whole RIALS, passed 1:1 to the Zarinpal PG v4 request
 *   (`amount` field — see ZarinpalAdapter comment "exactly our IRR minor unit").
 *   ISO 4217 nominally gives IRR a 2-digit exponent, but no real subunit is in
 *   circulation; NIVA therefore defines its own minor unit = 1 rial and never
 *   relies on Intl's IRR fraction digits (we format Toman ourselves).
 * - Display unit for IRR is TOMAN = 10 rials → formatMoney divides by 10 and
 *   rounds (same rule as the pre-existing formatToman in src/store/app.ts and
 *   the admin finance views). 24,900,000 rials → 2,490,000 Toman.
 * - USD: amountMinor = cents (Stripe `unit_amount` passes through 1:1) →
 *   formatted with Intl currency style on amountMinor / 100.
 *
 * ── Digits ──────────────────────────────────────────────────────────────────
 * toFaDigits/toLatinDigits are the canonical bidirectional digit normalizers
 * (fa ۰-۹ U+06F0–06F9 and Arabic ٠-٩ U+0660–0669 both normalize to ASCII).
 * The register flow (auth-view.tsx wave6-d) currently carries an inline copy
 * of this logic — adopting this helper there is a documented follow-up
 * (auth-view is owned by another stream this wave; do NOT duplicate elsewhere).
 *
 * ── Bidi isolates ───────────────────────────────────────────────────────────
 * ltrEmbed(s)  → U+2066 (LRI) + s + U+2069 (PDI): force an LTR island (use
 *                for Latin identifiers, codes, units like "cm").
 * bdiWrap(s)   → U+2068 (FSI) + s + U+2069 (PDI): auto-detecting isolate —
 *                the right default for user-generated content (names) whose
 *                direction is unknown. Equivalent of the <bdi> element for
 *                string contexts (aria-labels, toasts, template literals).
 * These are needed because the CSS `.num` class (globals.css) is an LTR
 * *embed* — correct for pure numbers, WRONG for strings that contain RTL
 * words (e.g. «۱ فروردین ۱۴۰۵» inside .num visually reorders). Wired call
 * sites list: docs/audit/11-bidi-qa.md §5.
 */

import type { Locale } from './i18n';

export type DateStyle = 'short' | 'medium' | 'long' | 'full';
export type MoneyCurrency = 'IRR' | 'USD';
export type DateInput = Date | string | number;

/* ── internal: formatter caches (per resolved key; keeps hot paths cheap) ── */

const numberFmtCache = new Map<string, Intl.NumberFormat>();
const dateFmtCache = new Map<string, Intl.DateTimeFormat>();

function numLocale(locale: Locale): string {
  return locale === 'fa' ? 'fa-IR' : 'en-US';
}

/** fa explicitly pins the Persian (Jalali) calendar; en stays Gregorian. */
function dateLocale(locale: Locale): string {
  return locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US';
}

function toDate(value: DateInput): Date {
  const d = value instanceof Date ? value : new Date(value);
  return d;
}

/* ── numbers ──────────────────────────────────────────────────────────────── */

/** Locale-aware number: fa → Persian digits ('fa-IR'), en → 'en-US'. */
export function formatNumber(value: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  const tag = numLocale(locale);
  const key = `${tag}|${opts ? JSON.stringify(opts) : ''}`;
  let fmt = numberFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(tag, opts);
    numberFmtCache.set(key, fmt);
  }
  return fmt.format(value);
}

/**
 * Localized money from the NIVA minor-unit amounts described in the header.
 * - IRR → Toman (amountMinor ÷ 10, rounded — matches formatToman convention).
 * - USD → Intl currency style (amountMinor = cents).
 * Non-catalog currencies throw: silently guessing a minor unit is how money
 * bugs happen; callers must state the currency they hold.
 */
export function formatMoney(amountMinor: number, currency: MoneyCurrency, locale: Locale): string {
  if (currency === 'IRR') {
    const toman = Math.round(amountMinor / 10);
    return `${formatNumber(toman, locale)} ${locale === 'fa' ? 'تومان' : 'Toman'}`;
  }
  return new Intl.NumberFormat(numLocale(locale), { style: 'currency', currency: 'USD' }).format(
    amountMinor / 100,
  );
}

/* ── dates (Jalali for fa, Gregorian for en) ──────────────────────────────── */

function formatDateWith(locale: Locale, date: Date, options: Intl.DateTimeFormatOptions): string {
  const key = `${dateLocale(locale)}|${JSON.stringify(options)}`;
  let fmt = dateFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(dateLocale(locale), options);
    dateFmtCache.set(key, fmt);
  }
  const out = fmt.format(date);
  return Number.isNaN(date.getTime()) ? '' : out;
}

const DATE_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { year: 'numeric', month: 'numeric', day: 'numeric' },
  medium: { year: 'numeric', month: 'long', day: 'numeric' },
  long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  full: { dateStyle: 'full' },
};

/**
 * Localized date. fa renders the Jalali calendar with month names, e.g.
 * 2026-03-21 → «۱ فروردین ۱۴۰۵» (medium). Invalid input → '' (documented;
 * callers render their own placeholder, most use '—').
 *
 * ⚠️ The result contains RTL month words for fa — do NOT place it inside a
 * `.num` span (LTR embed reorders it); use a plain span / dir="auto" / bdi.
 */
export function formatDate(date: DateInput, locale: Locale, style: DateStyle = 'medium'): string {
  return formatDateWith(locale, toDate(date), DATE_STYLES[style]);
}

/** Localized date + time (fa: Jalali date, 24h clock; en: Gregorian, US clock). */
export function formatDateTime(date: DateInput, locale: Locale, style: DateStyle = 'medium'): string {
  return formatDateWith(locale, toDate(date), {
    ...DATE_STYLES[style],
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RTF_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'second', ms: 1_000 },
  { unit: 'minute', ms: 60_000 },
  { unit: 'hour', ms: 3_600_000 },
  { unit: 'day', ms: 86_400_000 },
  { unit: 'week', ms: 604_800_000 },
  { unit: 'month', ms: 2_629_800_000 }, // avg Gregorian month (CLDR-ish approximation)
  { unit: 'year', ms: 31_557_600_000 },
];

/** CLDR-style unit thresholds (≈ ±45s / ±45min / ±22h / ±26d / ±9mo). */
function relativeUnit(diffMs: number): { unit: Intl.RelativeTimeFormatUnit; value: number } {
  const abs = Math.abs(diffMs);
  if (abs < 45 * RTF_UNITS[0].ms) return { unit: 'second', value: Math.round(diffMs / RTF_UNITS[0].ms) };
  if (abs < 45 * RTF_UNITS[1].ms) return { unit: 'minute', value: Math.round(diffMs / RTF_UNITS[1].ms) };
  if (abs < 22 * RTF_UNITS[2].ms) return { unit: 'hour', value: Math.round(diffMs / RTF_UNITS[2].ms) };
  if (abs < 26 * RTF_UNITS[3].ms) return { unit: 'day', value: Math.round(diffMs / RTF_UNITS[3].ms) };
  if (abs < 9 * RTF_UNITS[5].ms) return { unit: 'week', value: Math.round(diffMs / RTF_UNITS[4].ms) };
  if (abs < 345 * RTF_UNITS[3].ms) return { unit: 'month', value: Math.round(diffMs / RTF_UNITS[5].ms) };
  return { unit: 'year', value: Math.round(diffMs / RTF_UNITS[6].ms) };
}

/**
 * Natural relative time, `numeric: 'auto'` so fa gets «دیروز/امروز» style
 * output and en gets "yesterday"/"tomorrow" instead of "1 day ago".
 */
export function formatRelativeTime(date: DateInput, locale: Locale, now: Date = new Date()): string {
  const diff = toDate(date).getTime() - now.getTime();
  const { unit, value } = relativeUnit(diff);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
}

/* ── pregnancy-specific ───────────────────────────────────────────────────── */

/**
 * Gestational week/day label. fa: «هفته ۱۲ و ۳ روز» (no plural inflection in
 * Persian — one fixed pattern, Persian digits). en: ICU plural
 * week/weeks, day/days (1 week + 1 day, 12 weeks + 3 days). days = 0 → the
 * day segment is omitted (aria-labels pass week-only values). Both call-site
 * families wired this wave render exactly this (dashboard hero + clock
 * aria-label, onboarding preview).
 */
export function formatWeeksDays(weeks: number, days: number, locale: Locale): string {
  if (locale === 'fa') {
    return days === 0
      ? `هفته ${formatNumber(weeks, 'fa')}`
      : `هفته ${formatNumber(weeks, 'fa')} و ${formatNumber(days, 'fa')} روز`;
  }
  const wCat = new Intl.PluralRules('en-US').select(weeks) === 'one' ? 'week' : 'weeks';
  const w = `${formatNumber(weeks, 'en')} ${wCat}`;
  if (days === 0) return w;
  const dCat = new Intl.PluralRules('en-US').select(days) === 'one' ? 'day' : 'days';
  return `${w} + ${formatNumber(days, 'en')} ${dCat}`;
}

/* ── digit normalization (canonical helpers) ──────────────────────────────── */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'; // U+06F0–06F9 (Extended Arabic-Indic)
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'; // U+0660–0669 (Arabic-Indic)

/** Latin digits → Persian digits (numbers embedded in fa UI text). */
export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/**
 * Persian AND Arabic digits → Latin digits. Canonical version of the
 * normalizeDigits logic introduced in auth-view.tsx (wave6-d) — adoption of
 * this helper there is a documented follow-up (file frozen this wave).
 */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[\u06F0-\u06F9]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[\u0660-\u0669]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

/* ── bidi isolates ────────────────────────────────────────────────────────── */

/** Force an LTR island inside RTL text: LRI … PDI (U+2066/U+2069). */
export function ltrEmbed(s: string): string {
  return `\u2066${s}\u2069`;
}

/**
 * Auto-detecting bidi isolate (string equivalent of <bdi>): FSI … PDI
 * (U+2068/U+2069). Default for user-generated content (names) of unknown
 * direction embedded in fa sentences.
 */
export function bdiWrap(s: string): string {
  return `\u2068${s}\u2069`;
}
