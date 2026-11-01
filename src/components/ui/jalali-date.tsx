'use client';

/**
 * Wave 18 — Shamsi everywhere (master prompt §4.4: «ورودی تاریخ با تقویم شمسی
 * و امکان تبدیل صحیح به تاریخ استاندارد», extended by the product rule that
 * ALL calendars in NIVA are Jalali, in both UI languages).
 *
 * - fa (RTL): three <select> fields — سال / ماه / روز — driven by
 *   date-fns-jalali (format/parse/newDate), Persian digits, month lengths
 *   correct per Jalali leap years (clamp day when the month shrinks).
 * - en (LTR): the SAME Jalali grid with transliterated month names
 *   (Farvardin … Esfand) and Latin digits — the calendar itself stays Shamsi;
 *   only the presentation language changes. The Gregorian equivalent is shown
 *   beneath the field so the mapping stays transparent.
 * - JalaliDateTimeField pairs the Jalali grid with a native time input for
 *   «تاریخ و ساعت» surfaces (appointments, feeding/care logs) while keeping
 *   the exact datetime-local value contract (yyyy-mm-ddThh:mm, local) that
 *   the API already speaks.
 *
 * All fields emit a plain Gregorian ISO string through onValue — the Jalali
 * calendar is presentation, never storage. The parent keeps a plain ISO
 * string; the calendar choice is presentation.
 */

import { useEffect, useMemo } from 'react';
import { getYear, getMonth, getDate, getDaysInMonth, newDate } from 'date-fns-jalali';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Locale } from '@/lib/i18n';

export const JALALI_MONTHS_FA = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** Latin-script month names for the English UI — the calendar stays Shamsi. */
export const JALALI_MONTHS_EN = [
  'Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar',
  'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand',
];

/** Field chrome per UI language (component-local copy, like the original). */
const LABELS = {
  fa: { year: 'سال', month: 'ماه', day: 'روز', eq: 'معادل میلادی:' },
  en: { year: 'Year', month: 'Month', day: 'Day', eq: 'Gregorian equivalent:' },
} as const;

const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

function localizedNum(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(n);
}

function toFaDigits(s: string): string {
  return s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Jalali (y,m,d) → Gregorian ISO (yyyy-mm-dd). newDate() builds from Jalali parts. */
function isoFromJalali(jy: number, jm: number, jd: number): string | null {
  try {
    // month is 0-based in date-fns-jalali's newDate
    const d = newDate(jy, jm - 1, jd);
    if (Number.isNaN(d.getTime())) return null;
    // Native getters = Gregorian calendar → true ISO string (no TZ shifting:
    // newDate returns midnight local, and we only need the Y/M/D it represents).
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    // Round-trip guard: 1403/12/30 must map back to the same jy/jm/jd.
    const back = jalaliFromIso(iso);
    if (!back || back.jy !== jy || back.jm !== jm || back.jd !== jd) return null;
    return iso;
  } catch {
    return null;
  }
}

/** Gregorian ISO (yyyy-mm-dd) → Jalali components. getYear/Month/Date are Jalali getters. */
function jalaliFromIso(iso: string): { jy: number; jm: number; jd: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  try {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return { jy: getYear(d), jm: getMonth(d) + 1, jd: getDate(d) };
  } catch {
    return null;
  }
}

export interface JalaliDateFieldProps {
  id: string;
  label: string;
  locale: Locale;
  /** Gregorian ISO string (yyyy-mm-dd) or ''. */
  value: string;
  onValue: (iso: string) => void;
  minIso?: string;
  maxIso?: string;
  hint?: string;
}

/** Shamsi date entry for every locale — the only date field in NIVA. */
export function JalaliDateField({ id, label, locale, value, onValue, minIso, maxIso, hint }: JalaliDateFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-year`}>{label}</Label>
      <JalaliPickers id={id} locale={locale} value={value} onValue={onValue} minIso={minIso} maxIso={maxIso} />
      {hint ? <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p> : null}
      {/* Gregorian summary of the resolved date (bidi-safe via dir=auto). */}
      {value ? (
        <p dir="auto" className="text-[11px] text-muted-foreground">
          {LABELS[locale].eq} <span className="num">{value}</span>
        </p>
      ) : null}
    </div>
  );
}

export interface JalaliDateTimeFieldProps {
  id: string;
  label: string;
  /** Small label for the time sub-input (aria + visible). */
  timeLabel: string;
  locale: Locale;
  /** datetime-local contract: 'yyyy-mm-ddTHH:mm' (local) or ''. */
  value: string;
  onValue: (v: string) => void;
  hint?: string;
}

/**
 * Shamsi date + time. The date half is the same Jalali grid; the time half is
 * a native time input (dir=ltr). Emits the same local datetime-local string
 * the previous <input type="datetime-local"> produced — API contract intact.
 */
export function JalaliDateTimeField({ id, label, timeLabel, locale, value, onValue, hint }: JalaliDateTimeFieldProps) {
  const dateIso = value ? value.slice(0, 10) : '';
  const time = value && value.length >= 16 ? value.slice(11, 16) : '';

  const onDate = (iso: string) => {
    if (iso) onValue(`${iso}T${time || '00:00'}`);
  };
  const onTime = (tm: string) => {
    if (dateIso) onValue(`${dateIso}T${tm || '00:00'}`);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-date-year`}>{label}</Label>
      <JalaliPickers id={`${id}-date`} locale={locale} value={dateIso} onValue={onDate} />
      <div className="flex items-center gap-2">
        <Label htmlFor={`${id}-time`} className="shrink-0 text-xs text-muted-foreground">{timeLabel}</Label>
        <input
          id={`${id}-time`} type="time" dir="ltr" value={time}
          onChange={(e) => onTime(e.target.value)}
          aria-label={timeLabel}
          className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-xs"
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p> : null}
    </div>
  );
}

function JalaliPickers({
  id, locale, value, onValue, minIso, maxIso,
}: {
  id: string;
  locale: Locale;
  value: string;
  onValue: (iso: string) => void;
  minIso?: string;
  maxIso?: string;
}) {
  const parts = useMemo(() => jalaliFromIso(value), [value]);
  const jy = parts?.jy ?? 0;
  const jm = parts?.jm ?? 0;
  const jd = parts?.jd ?? 0;

  const minParts = minIso ? jalaliFromIso(minIso) : null;
  const maxParts = maxIso ? jalaliFromIso(maxIso) : null;
  const minYear = minParts?.jy ?? 1395;
  const maxYear = maxParts?.jy ?? 1406;

  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).reverse(),
    [minYear, maxYear],
  );

  const months = locale === 'fa' ? JALALI_MONTHS_FA : JALALI_MONTHS_EN;
  const L = LABELS[locale];

  // Day count for the currently chosen Jalali month (leap-aware).
  const daysInMonth = useMemo(() => {
    if (!jy || !jm) return 31;
    try {
      return getDaysInMonth(newDate(jy, jm - 1, 1));
    } catch {
      return 31;
    }
  }, [jy, jm]);

  // Clamp: switching from 31st of a 30-day month must not silently overflow.
  useEffect(() => {
    if (parts && jd > daysInMonth) {
      const iso = isoFromJalali(jy, jm, daysInMonth);
      if (iso) onValue(iso);
    }
  }, [parts, jd, daysInMonth, jy, jm, onValue]);

  const commit = (ny: number, nm: number, nd: number) => {
    if (!ny || !nm || !nd) return;
    const dim = (() => {
      try { return getDaysInMonth(newDate(ny, nm - 1, 1)); } catch { return 31; }
    })();
    const iso = isoFromJalali(ny, nm, Math.min(nd, dim));
    if (iso) onValue(iso);
  };

  const todayIsoStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  })();
  const todayJ = jalaliFromIso(todayIsoStr) ?? { jy: 1404, jm: 1, jd: 1 };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={jy ? String(jy) : ''} onValueChange={(v) => commit(Number(v), jm || todayJ.jm, jd || Math.min(15, todayJ.jd))}>
        <SelectTrigger id={`${id}-year`} aria-label={L.year} className="min-h-11 bg-background/70"><SelectValue placeholder={L.year} /></SelectTrigger>
        <SelectContent className="max-h-64">
          {years.map((y) => <SelectItem key={y} value={String(y)}>{locale === 'fa' ? toFaDigits(String(y)) : String(y)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={jm ? String(jm) : ''} onValueChange={(v) => commit(jy || todayJ.jy, Number(v), jd || Math.min(15, todayJ.jd))}>
        <SelectTrigger id={`${id}-month`} aria-label={L.month} className="min-h-11 bg-background/70"><SelectValue placeholder={L.month} /></SelectTrigger>
        <SelectContent className="max-h-64">
          {months.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={jd ? String(jd) : ''} onValueChange={(v) => commit(jy || todayJ.jy, jm || todayJ.jm, Number(v))}>
        <SelectTrigger id={`${id}-day`} aria-label={L.day} className="min-h-11 bg-background/70"><SelectValue placeholder={L.day} /></SelectTrigger>
        <SelectContent className="max-h-64">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <SelectItem key={d} value={String(d)}>{localizedNum(d, locale)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
