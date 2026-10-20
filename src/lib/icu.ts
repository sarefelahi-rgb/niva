/**
 * NIVA ICU-lite message formatting — Wave 6.3 (backlog item 6.3).
 * Client-safe, pure, fully typed. Companion primitives: src/lib/format.ts.
 *
 * ── HONEST SCOPE: this is ICU-*lite*, NOT full ICU MessageFormat ────────────
 * Supported (documented subset):
 *   {name}                        → interpolation (string as-is; number via
 *                                   locale formatter → Persian digits for fa;
 *                                   Date via formatDate)
 *   {name, number}                → formatNumber (optional style after second
 *                                   comma: '::integer' → max 0 fraction
 *                                   digits, '::%' → percent)
 *   {name, date}                  → formatDate (optional skeleton:
 *                                   '::yMMMMd' | '::yMd' | '::Hm')
 *   {name, plural, one {...} other {...}}
 *                                 → real CLDR plural categories via
 *                                   Intl.PluralRules(locale) (en: one/other;
 *                                   fa: one for ۱, other otherwise — the
 *                                   engine's CLDR data is authoritative, no
 *                                   hand-rolled rules). '#' inside a plural
 *                                   branch renders the count with locale
 *                                   digits. Exact matches ('=0 {...}') are
 *                                   checked first; unknown categories fall
 *                                   back to 'other'.
 *   {name, select, key {...} other {...}}
 *                                 → exact-match selection with 'other' fallback.
 *   '{' '}' ''                    → quoting: doubled '' = literal apostrophe,
 *                                   '{' and '}' emit literal braces.
 *   Nesting                       → one level (plural/select branches contain
 *                                   interpolations and simple formatters).
 *                                   The renderer is recursive, but only one
 *                                   nesting level is exercised/tested.
 * Not supported (falls back to raw/other, documented honestly):
 *   offset:, selectordinal, full nested plurals beyond one level, complex
 *   number skeletons (Intl option bags are available via format.ts
 *   formatNumber at call sites instead), XML-ish argument syntax.
 *
 * Missing-parameter behavior: a `{name}` whose param is absent renders the
 * literal `{name}` (visible in dev rather than silently empty).
 *
 * Adoption path: the two pre-existing interpolation idioms are (a) manual
 * `.replace('{n}', …)` (admin-view — parallel-owned this wave) and (b) a local
 * `fill()` helper (subscription-view — excluded this wave). New/wired sites
 * use formatMessage(translate(locale, key), params) so plural categories come
 * from CLDR instead of hand-written branching. Migrating the existing dict
 * entries' placeholders is a documented follow-up (i18n.ts frozen this wave —
 * a parallel stream appends keys; do not edit).
 */

import type { Locale } from './i18n';
import { formatDate, formatNumber, toLatinDigits, type DateInput } from './format';

export type MessageParam = string | number | Date;
export type MessageParams = Record<string, MessageParam>;

/** Date skeletons intentionally limited (see header). '::' prefix optional. */
const DATE_SKELETONS: Record<string, Intl.DateTimeFormatOptions> = {
  yMMMMd: { year: 'numeric', month: 'long', day: 'numeric' },
  yMd: { year: 'numeric', month: 'numeric', day: 'numeric' },
  Hm: { hour: '2-digit', minute: '2-digit' },
};

/** Renders an already-extracted argument clause (`name, type, style`). */
function formatArg(locale: Locale, arg: string, params: MessageParams, countForHash: number | undefined): string {
  // Split name / type / style at the first two top-level commas. Style may
  // itself contain braces (plural branches) — only split on the first two.
  const first = arg.indexOf(',');
  if (first === -1) {
    return interpolate(locale, arg.trim(), params, countForHash);
  }
  const name = arg.slice(0, first).trim();
  const rest = arg.slice(first + 1);
  const second = rest.indexOf(',');
  const type = (second === -1 ? rest : rest.slice(0, second)).trim();
  const style = (second === -1 ? '' : rest.slice(second + 1)).trim();

  if (!(name in params)) return `{${name}}`; // visible missing-param fallback

  const value = params[name];
  switch (type) {
    case 'number': {
      if (typeof value !== 'number') return String(value);
      if (style === '::integer' || style === 'integer') return formatNumber(Math.trunc(value), locale, { maximumFractionDigits: 0 });
      if (style === '::%' || style === 'percent') return formatNumber(value / 100, locale, { style: 'percent' });
      return formatNumber(value, locale);
    }
    case 'date': {
      const skeleton = style.replace(/^::/, '');
      if (skeleton && skeleton in DATE_SKELETONS) {
        return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', DATE_SKELETONS[skeleton]).format(
          value instanceof Date ? value : new Date(value as Exclude<DateInput, Date>),
        );
      }
      return formatDate(value, locale);
    }
    case 'plural':
    case 'select': {
      const branches = parseBranches(style);
      let key: string;
      if (type === 'plural') {
        const n = typeof value === 'number' ? value : Number(toLatinDigits(String(value)));
        if (Number.isNaN(n)) return String(value);
        if (`=${n}` in branches) key = `=${n}`;
        else key = new Intl.PluralRules(locale).select(n);
        return render(locale, branches[key] ?? branches.other ?? '', params, n);
      }
      key = String(value);
      return render(locale, branches[key] ?? branches.other ?? '', params, countForHash);
    }
    default:
      // Unknown type → interpolate the raw value (never throw in render path).
      return interpolate(locale, String(value), params, countForHash);
  }
}

/** Parses `one {...} other {...} =0 {...}` branch bodies (balanced braces). */
function parseBranches(style: string): Record<string, string> {
  const branches: Record<string, string> = {};
  let i = 0;
  while (i < style.length) {
    while (i < style.length && /\s/.test(style[i])) i++;
    if (i >= style.length) break;
    // Optional offset: prefix (documented unsupported → ignored).
    if (style.startsWith('offset:', i)) {
      const sp = style.indexOf(' ', i);
      i = sp === -1 ? style.length : sp + 1;
      continue;
    }
    let sel = '';
    while (i < style.length && style[i] !== '{') {
      sel += style[i];
      i++;
    }
    sel = sel.trim();
    if (style[i] !== '{') break;
    let depth = 1;
    let j = i + 1;
    while (j < style.length && depth > 0) {
      if (style[j] === '{') depth++;
      else if (style[j] === '}') depth--;
      j++;
    }
    if (depth !== 0) break; // unbalanced → stop, keep what we have
    if (sel) branches[sel] = style.slice(i + 1, j - 1);
    i = j;
  }
  return branches;
}

function interpolate(locale: Locale, raw: string | number, params: MessageParams, countForHash: number | undefined): string {
  if (typeof raw === 'number') return formatNumber(raw, locale);
  return render(locale, raw, params, countForHash);
}

/** Core scanner: literals, quoting, `{…}` args, and `#` (plural count). */
function render(locale: Locale, pattern: string, params: MessageParams, countForHash: number | undefined): string {
  const out: string[] = [];
  let lit = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "'") {
      if (pattern[i + 1] === "'") {
        lit += "'";
        i += 2;
        continue;
      }
      const close = pattern.indexOf("'", i + 1);
      const inner = close > i ? pattern.slice(i + 1, close) : null;
      if (inner && (inner.startsWith('{') || inner.startsWith('}'))) {
        lit += inner; // '{' / '}' escape — emit verbatim
        i = close + 1;
        continue;
      }
      lit += "'"; // lone apostrophe → literal
      i += 1;
      continue;
    }
    if (ch === '#' && countForHash !== undefined) {
      out.push(lit);
      lit = '';
      out.push(formatNumber(countForHash, locale));
      i += 1;
      continue;
    }
    if (ch === '{') {
      let depth = 1;
      let j = i + 1;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === '{') depth++;
        else if (pattern[j] === '}') depth--;
        j++;
      }
      if (depth !== 0) {
        lit += pattern.slice(i); // unbalanced → treat rest as literal
        i = pattern.length;
        continue;
      }
      out.push(lit);
      lit = '';
      out.push(formatArg(locale, pattern.slice(i + 1, j - 1), params, countForHash));
      i = j;
      continue;
    }
    lit += ch;
    i += 1;
  }
  out.push(lit);
  return out.join('');
}

/**
 * ICU-lite message formatting. See module header for the exact supported
 * subset and fallback behavior.
 */
export function formatMessage(locale: Locale, pattern: string, params: MessageParams = {}): string {
  return render(locale, pattern, params, undefined);
}
