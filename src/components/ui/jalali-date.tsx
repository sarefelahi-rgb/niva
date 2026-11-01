'use client';

/**
 * Wave 17 — bilingual date entry with a real Jalali calendar (master prompt
 * §4.4: «ورودی تاریخ با تقویم شمسی و امکان تبدیل صحیح به تاریخ استاندارد»).
 *
 * - fa (RTL): three native <select> fields — سال / ماه / روز — driven by
 *   date-fns-jalali (format/parse/newDate), Persian digits, month lengths
 *   correct per Jalali leap years (clamp day when the month shrinks).
 * - en (LTR): native ISO date input.
 * Both produce the same ISO string (yyyy-mm-dd Gregorian) through onValue.
 * The parent keeps a plain ISO string; the calendar choice is presentation.
 */

import { useEffect, useMemo } from 'react';
import { getYear, getMonth, getDate, getDaysInMonth, newDate } from 'date-fns-jalali';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Locale } from '@/lib/i18n';

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);
const enNum = (n: number) => new Intl.NumberFormat('en-US').format(n);

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

export function JalaliDateField({ id, label, locale, value, onValue, minIso, maxIso, hint }: JalaliDateFieldProps) {
  // ── English: native Gregorian input (LTR), same output contract ──
  if (locale === 'en') {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <input
          id={id} type="date" dir="ltr" className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-xs"
          value={value} min={minIso} max={maxIso}
          onChange={(e) => onValue(e.target.value)}
        />
        {hint ? <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p> : null}
      </div>
    );
  }

  return <JalaliSelects id={id} label={label} value={value} onValue={onValue} minIso={minIso} maxIso={maxIso} hint={hint} />;
}

function JalaliSelects({ id, label, value, onValue, minIso, maxIso, hint }: Omit<JalaliDateFieldProps, 'locale'>) {
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
    <div className="space-y-2">
      <Label htmlFor={`${id}-year`}>{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        <Select value={jy ? String(jy) : ''} onValueChange={(v) => commit(Number(v), jm || todayJ.jm, jd || Math.min(15, todayJ.jd))}>
          <SelectTrigger id={`${id}-year`} aria-label="سال" className="min-h-11 bg-background/70"><SelectValue placeholder="سال" /></SelectTrigger>
          <SelectContent className="max-h-64">
            {years.map((y) => <SelectItem key={y} value={String(y)}>{toFaDigits(String(y))}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={jm ? String(jm) : ''} onValueChange={(v) => commit(jy || todayJ.jy, Number(v), jd || Math.min(15, todayJ.jd))}>
          <SelectTrigger id={`${id}-month`} aria-label="ماه" className="min-h-11 bg-background/70"><SelectValue placeholder="ماه" /></SelectTrigger>
          <SelectContent className="max-h-64">
            {JALALI_MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={jd ? String(jd) : ''} onValueChange={(v) => commit(jy || todayJ.jy, jm || todayJ.jm, Number(v))}>
          <SelectTrigger id={`${id}-day`} aria-label="روز" className="min-h-11 bg-background/70"><SelectValue placeholder="روز" /></SelectTrigger>
          <SelectContent className="max-h-64">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <SelectItem key={d} value={String(d)}>{faNum(d)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hint ? <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p> : null}
      {/* Persian-digit summary of the resolved Gregorian date (bidi-safe via dir=auto). */}
      {value ? (
        <p dir="auto" className="text-[11px] text-muted-foreground">
          معادل میلادی: <span className="num">{value}</span>
        </p>
      ) : null}
    </div>
  );
}
