# 11 — Bidi, ICU Formatting & Localized SEO QA (Wave 6.3)

Deliverables: `src/lib/format.ts` (locale primitives), `src/lib/icu.ts` (ICU-lite
message engine), 4 wired call-site files, localized metadata + `sitemap.ts` +
`robots.ts` + JSON-LD, this document. Evidence run against the live dev server
(:3000) on 2026-10-20. Screenshots-level browser QA is the **orchestrator's**
task (see §9) — this file covers code-level and curl-level verification.

---

## 1. Formatting engine — public API

### `src/lib/format.ts` (client-safe, pure, zero side effects)

| Export | Purpose |
|---|---|
| `formatNumber(value, locale, opts?)` | fa → `fa-IR` (Persian digits), en → `en-US`. Memoized formatters. |
| `formatMoney(amountMinor, currency, locale)` | `currency` limited to `'IRR' \| 'USD'` (throws otherwise — silently guessing minor units is how money bugs happen). See §2. |
| `formatDate(date, locale, style?)` | fa → **Jalali** calendar via `fa-IR-u-ca-persian`, en → Gregorian. `style: 'short' \| 'medium' \| 'long' \| 'full'` (default `medium`). Invalid input → `''` (documented; callers render their own placeholder). |
| `formatDateTime(date, locale, style?)` | date + `hour/minute 2-digit` (fa: 24h clock). |
| `formatRelativeTime(date, locale, now?)` | `Intl.RelativeTimeFormat` with `numeric:'auto'` — fa «دیروز», «۲ ساعت بعد»; en "yesterday", "in 2 hours". CLDR-style unit thresholds (±45s/±45min/±22h/±26d/±9mo). |
| `formatWeeksDays(weeks, days, locale)` | fa «هفته ۱۲ و ۳ روز» (Persian digits, no plural inflection — CLDR fa has only one/other and no adjective agreement); en `12 weeks + 3 days` / `1 week + 1 day` via `Intl.PluralRules('en-US')`; `days === 0` omits the day segment. |
| `toFaDigits(s)` / `toLatinDigits(s)` | Canonical bidirectional digit normalizers: Latin→Persian; Persian **and** Arabic (٠-٩ / ۰-۹) → Latin. |
| `ltrEmbed(s)` / `bdiWrap(s)` | Unicode isolates: `LRI … PDI` (U+2066/2069, forced LTR island) and `FSI … PDI` (U+2068/2069, auto-detecting — string equivalent of `<bdi>`). Usage guide in §6.3. |

### `src/lib/icu.ts` — `formatMessage(locale, pattern, params)`

**Honest scope: ICU-*lite*, not full ICU MessageFormat.** Supported subset,
documented in the module header:

- `{name}` — interpolation; numbers render with locale digits, `Date` via `formatDate`.
- `{name, number}` — plus styles `::integer`, `::%`.
- `{name, date}` — plus skeletons `::yMMMMd`, `::yMd`, `::Hm` (fa renders Jalali).
- `{name, plural, one {…} other {…}}` — **real CLDR plural categories** via
  `Intl.PluralRules(locale)` (en: one/other; fa: `one` for ۱, `other` otherwise
  — the engine's CLDR data is authoritative, no hand-rolled rules). `#` inside
  a branch re-renders the count with locale digits. Exact `=N {…}` matches
  checked first; unknown categories → `other` fallback. String counts with
  Persian/Arabic digits are normalized before parsing.
- `{name, select, key {…} other {…}}`.
- Quoting: `''` → literal apostrophe; `'{` / `'}` → literal braces.
- Nesting: one level (interpolation/formatters inside plural/select branches;
  the renderer is recursive but only one level is exercised).
- **Not supported** (fails safe, documented): `offset:`, `selectordinal`,
  deeply-nested plurals, complex number skeletons (use `formatNumber` opts at
  the call site instead).
- Missing param → renders the literal `{name}` (visible in dev rather than
  silently empty). Unbalanced braces → treated as literal text.

---

## 2. Money minor-unit convention (VERIFIED — do not change silently)

Read from `src/lib/plans.ts` (catalog rows), `src/lib/psp/index.ts`
(ZarinpalAdapter: *"amounts in Rials, which is exactly our IRR minor unit, so
amountMinor passes through 1:1"*; StripeAdapter: *"unit_amount IS our
amountMinor"*) and the pre-existing `formatToman` in `src/store/app.ts`:

| Currency | `amountMinor` means | Display (fa) | Display (en) |
|---|---|---|---|
| IRR | **whole RIALS** (Zarinpal request `amount` = amountMinor 1:1). ISO 4217 nominally gives IRR a 2-digit exponent but no real subunit circulates — NIVA defines minor unit = 1 rial and never relies on Intl's IRR fraction digits. | Toman = rial ÷ 10, Persian digits + «تومان» | `2,490,000 Toman` (same ÷10, matches `formatToman` label) |
| USD | **cents** (Stripe `unit_amount` 1:1) | `$۶٫۹۰` via Intl currency | `$6.90` |

Evidence: `formatMoney(24_900_000, 'IRR', 'fa')` → `۲٬۴۹۰٬۰۰۰ تومان`
(= 24.9M rials = 2.49M Toman, exactly the PREMIUM_MONTHLY IRR row in
plans.ts); `formatMoney(690, 'USD', 'en')` → `$6.90`.

---

## 3. Calendar verification (Jalali via ICU)

Anchor date checked in the wave demo run:

```
formatDate('2026-03-21', 'fa')            → ۱ فروردین ۱۴۰۵   ✓ (Nowruz 1405)
formatDate('2026-03-21', 'fa', 'long')    → ۱۴۰۵ فروردین ۱, شنبه   (see quirk below)
formatDate('2026-03-21', 'en')            → March 21, 2026
formatDateTime('2026-03-21T10:30:00','fa') → ۱ فروردین ۱۴۰۵ ساعت ۱۰:۳۰
```

**Known ICU quirk (documented, worked around):** this platform's ICU/CLDR
build renders fa styles containing a weekday (`long`, `full`, and
`dateStyle:'full'`) year-first («۱۴۰۵ فروردین ۱, شنبه») — that is the CLDR
data, not a bug in our code. All wired call sites therefore use `medium`
(month names, correct «۱ فروردین ۱۴۰۵») or `short` (numeric
«۱۴۰۵/۱/۱»). Weekday display for fa is a production polish task
(§9).

## 4. Relative-time verification

```
formatRelativeTime(now+2h, 'fa')  → ۲ ساعت بعد
formatRelativeTime(now-26h, 'fa') → دیروز      (numeric:'auto' — no «۱ روز پیش»)
formatRelativeTime(now+24h, 'en') → tomorrow
```

---

## 5. Wired call sites (4 files, all real)

| File | Site | What replaced what |
|---|---|---|
| `dashboard-view.tsx` | `fmtDate` helper | `toLocaleDateString(fa-IR/en-US)` → `formatDate` (fa now Jalali with month names) |
| | weeks+days hero (`formatWeeksDays(ga.weeks, ga.days, locale)`) + `GestationalClock` `aria-label` (was a bare Latin digit) | hand-assembled `{weeks} weeks + {days} days` |
| | days-to-go line | `formatMessage` ICU plural — fixes en "1 days to go" class bugs, fa renders «۱۵ روز باقی مانده» with Persian digits (was Latin digits). Inline bilingual pattern matches this view's existing inline-fa convention (`VISIT_CADENCE`); dict migration is §9 follow-up |
| | next appointment | `toLocaleString` → `formatDateTime` (Jalali) |
| | reminders dueAt, due-date + range spans | `formatDate`; `.num` (LTR embed) → `dir="auto"` (§6.2) |
| | greeting name | `bdiWrap(user.name.split(' ')[0])` — Latin names can't flip the RTL heading |
| `appointments-view.tsx` | "Upcoming" section header | new CLDR-plural count chip `{count, plural, one {# appointment} other {# appointments}}` / `{count, plural, other {# نوبت}}` |
| | reminder + upcoming/past dates | `formatDate`/`formatDateTime`, `.num` → `dir="auto"` |
| `wellness-view.tsx` | `fmtDay` (4 history rows) | → `formatDate(iso, locale, 'short')` — short stays digits-only («۱۴۰۵/۱/۱»), safe inside the remaining `.num` containers, fits `w-24` |
| `onboarding-view.tsx` | due-date preview | `toLocaleDateString` → `formatDate` (Jalali), `.num` → `dir="auto"` |
| | gestational-age line | `formatWeeksDays` |

**Adoption ledger (deliberately NOT migrated this wave):** remaining inline
`toLocaleDateString(locale === 'fa' …)` sites = 9 across 7 files
(admin-view ×1 — parallel-owned wave6-b; community, journal, records, review,
tracking ×1 each, settings ×3); the `fill()` helper in subscription-view and
the `.replace('{n}',…)` in admin-view (both excluded/parallel-owned). These
are mechanical swaps to `formatDate`/`formatMessage` listed as a production
follow-up; no behavior change was forced into files this stream doesn't own.

---

## 6. Bidi QA

### 6.1 Manual audit checklist (per review; run before every release)

1. **Punctuation pairing** — ASCII `(` `)` around Latin tokens inside Persian
   sentences (paren mirroring breaks when a Latin run + neutral adjoins the
   closing paren). Prefer Persian-context parens directly around Persian
   words; isolate Latin runs (§6.3).
2. **Embedded Latin product names/identifiers** (NIVA, JSON, CRL, IVF,
   emails, `NivaAdmin!2025`) inside fa sentences — must sit in an isolate
   (`<bdi>` element or `bdiWrap()`), never bare.
3. **Numbers in RTL runs** — pure-number strings are fine anywhere; mixed
   number+word strings («۱۵ روز») must NOT be in `.num` (LTR embed).
4. **Mixed-direction labels** — trailing neutrals (·, :, !) after a Latin run
   jump to the wrong side in RTL context; isolate the Latin run first.
5. **Percent/± signs** — `±۲۱ روز` verified OK (`±` = ET, binds to the EN
   digit run). `%` after Latin digits inside fa needs the run isolated.
6. **Form-field digits** — user-entered Persian/Arabic digits must normalize
   (`toLatinDigits`) before validation/serialization (register flow already
   does; §9 adoption note).
7. **Dates with month words** — never inside `.num` (§6.2).

### 6.2 Code-audit findings (grep-driven, real)

| # | Finding (file:line at audit time) | Severity | Status |
|---|---|---|---|
| F1 | `.num` is `direction:ltr; unicode-bidi:embed` (`globals.css:228`) but was used as a generic "numbers" class around **strings with RTL words** — e.g. dashboard due-date/reminder spans once they render Jalali month names → visual reordering | High | **Fixed at all wired sites** (dashboard/appointments/onboarding switched to `dir="auto"`); `.num` retained only for digits-only output (wellness short dates, admin numeric amounts) |
| F2 | `i18n.ts:519` fa `auth.adminHint` — Latin emails + `(گذرواژه: NivaAdmin!2025)` inside a Persian sentence (ASCII parens + trailing `!` after Latin) | Medium | Open — render-side isolate needed (`<bdi>` around values); auth-view is parallel-owned this wave |
| F3 | `i18n.ts:523` «سونوگرافی (CRL)», `(IVF)`, `i18n.ts:617` «(JSON)» — Latin acronyms in ASCII parens within fa strings | Low | Open — acceptable (short runs render correctly in practice); isolate if a visual regression appears |
| F4 | `dashboard-view.tsx:44` hardcoded lowercase `week` label under the clock (English-only, no key) | Low | Open — needs an i18n key (dict frozen this wave; §9) |
| F5 | Enum badges rendered raw (`{a.type}` = CHECKUP/ULTRASOUND…, appointment types, statuses) — English enums surface in fa UI | Low | Pre-existing platform-wide pattern; out of 6.3 scope |
| F6 | fa `±۲۱ روز` / `کیفیت (۱–۵)` (`i18n.ts:536/724`) | — | Checked **OK** (ET/EN binding; Persian digits are EN class) |

### 6.3 Isolate-helper usage guide

- **DOM elements**: prefer `<bdi>` (or `dir="auto"`) — no invisible characters
  in the DOM. Used at every wired date/mixed-text site this wave.
- **String contexts** (aria-labels, toasts, template-literal sentences, API
  echo copy): use `bdiWrap(s)` (auto-detecting, for user content like names)
  or `ltrEmbed(s)` (forced LTR, for known-Latin identifiers/units). Wired:
  dashboard greeting (`bdiWrap`). Codepoints verified:
  `ltrEmbed('X') → 2066 58 2069`, `bdiWrap('Sara') → 2068 … 2069`.
- **Rule of thumb**: isolate at the *innermost* varying segment (the name,
  the code, the number) — not the whole sentence.

### 6.4 Browser-level QA

Screenshots-level RTL visual pass (Persian dates, chips, greeting isolates on
light/dark, mobile widths) is the **orchestrator task** for this wave —
code-level + curl-level evidence above; the wired sites are deterministic
pure-function outputs, all captured in the demo run (§8 worklog).

---

## 7. Localized SEO (truthful-metadata audit)

- `layout.tsx`: `metadataBase` = `NIVA_SITE_URL` → falls back to
  `NIVA_PUBLIC_URL` (pre-6.3 env) → `http://localhost:3000` (dev default,
  honestly noted in-file: **production must set NIVA_SITE_URL** or canonical/
  OG/sitemap URLs point at localhost). Title default «NIVA — نیوا | بارداری
  هوشمند» + template `%s | NIVA`; description = the fa `app.description` dict
  string (single source, no invented copy); `openGraph.locale fa_IR` +
  `alternateLocale en_US`; twitter `summary_large_image`; robots
  index/follow + googleBot (`max-image-preview:large`, `max-snippet:-1`).
  `icons` block untouched (wave6-e). Language alternates kept — they are real
  working URLs (`/?lang=` is read at boot in `page.tsx`).
- `sitemap.ts`: single `/` URL, `lastModified` build time, monthly, priority 1,
  hreflang alternates → working `?lang=` deep links.
- `robots.ts`: allow all, `Disallow: /api/`, sitemap ref. **A stale static
  `public/robots.txt` (hard-coded `https://niva.health` sitemap, no /api/
  rule) conflicted with the metadata route (Next 500s on
  `/robots.txt`) — removed; the metadata route is now authoritative.**
- JSON-LD (`WebApplication`): name/alternateName, `HealthApplication`,
  `operatingSystem Web`, `inLanguage [fa,en]`, `isAccessibleForFree true`,
  `Offer price 0 IRR` (the always-free FREE plan in `plans.ts` — true), and
  the verbatim fa educational disclaimer inside `description`
  (`landing.disclaimer`). **No ratings, no review counts, no medical claims,
  no fabricated URLs.**

## 8. Verification evidence (2026-10-20)

- `bunx tsc --noEmit` → **0 errors**; `bun run lint` → **0 errors** (after all wiring).
- Demo run (script executed, output captured in worklog, then deleted):
  en plural 1/2 → "You have 1 appointment"/"2 appointments"; fa plural →
  «شما یک قرار دارید» / «شما ۲ قرار دارید»; `formatMoney` IRR/USD per §2;
  `formatDate('2026-03-21','fa')` → **۱ فروردین ۱۴۰۵**; relative fa «۲ ساعت
  بعد»/«دیروز»; `toFaDigits`/`toLatinDigits` round-trip ✓; isolate codepoints ✓.
- `curl /robots.txt` → 200 (`User-Agent: * Allow: / Disallow: /api/` + sitemap);
  `curl /sitemap.xml` → 200, single URL + hreflang alternates, `changefreq monthly`;
  view-source of `/` contains `application/ld+json` block. `dev.log`: `GET /robots.txt 200`,
  `GET /sitemap.xml 200`, `GET / 200`; the pre-fix 500 line documents the
  static-file conflict resolution.

## 9. Known limitations & production tasks

1. **Full ICU not bundled** — the documented subset covers NIVA's current
   patterns; `@formatjs/intl` (or full `intl-messageformat`) is the swap-in if
   `selectordinal`/offset/multiple-nesting become needed.
2. **Per-locale hreflang path URLs** (`/fa/`, `/en/`) need i18n routing
   (locale segments or middleware); current alternates use real `?lang=`
   deep links. Production task alongside the marketing-site split.
3. **NIVA_SITE_URL** must be set in production (metadataBase/sitemap/robots).
4. **Adoption ledger** (§5): 9 remaining inline date-format sites + `fill()`/
   `.replace('{n}')` migration; i18n dict key additions for the inline ICU
   patterns (dict append-only, other streams own it this wave).
5. **auth-view digit normalization**: adopt the canonical `toLatinDigits`
   (replace the inline copy from wave6-d) — auth-view frozen this wave.
6. **fa weekday date styles** render year-first in this ICU build (§3) —
   compose via `formatToParts` if weekday-first Persian dates are wanted.
7. **Screenshots-level bidi QA** = orchestrator browser pass (§6.4).
