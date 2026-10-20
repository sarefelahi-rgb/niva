# Task wave6-c — ICU formatting + locale dates/units + bidi QA + localized SEO (complete)

Agent: full-stack-developer. Full detail in `worklog.md` (Task ID: wave6-c) and `docs/audit/11-bidi-qa.md`.

## Created
- `src/lib/format.ts` — locale primitives: `formatNumber`, `formatMoney` (IRR amountMinor = RIALS → Toman ÷10; USD = cents — verified against plans.ts/psp), `formatDate`/`formatDateTime` (fa = Jalali `fa-IR-u-ca-persian`), `formatRelativeTime`, `formatWeeksDays`, `toFaDigits`/`toLatinDigits` (canonical), `ltrEmbed`/`bdiWrap` (Unicode isolates).
- `src/lib/icu.ts` — `formatMessage(locale, pattern, params)`: ICU-lite (interpolation, number/date args, real CLDR plurals via `Intl.PluralRules`, select, quoting, one-level nesting; missing param renders `{name}`; scope honestly documented in module header).
- `src/app/robots.ts`, `docs/audit/11-bidi-qa.md`, (temp demo script deleted after capture).

## Modified
- `src/app/layout.tsx` — metadata/SEO only: metadataBase (`NIVA_SITE_URL`→`NIVA_PUBLIC_URL`→localhost, honest note), fa title default + `%s | NIVA` template, fa description from dict, OG fa_IR/en_US, twitter card, robots+googleBot, **icons block intact**, truthful JSON-LD WebApplication (no ratings/claims).
- `src/app/sitemap.ts` — single `/`, monthly, hreflang `?lang=` deep links (real URLs), production-task header.
- Wired views: `dashboard-view.tsx`, `appointments-view.tsx`, `onboarding-view.tsx`, `wellness-view.tsx` (formatWeeksDays/formatDate/formatDateTime/formatMessage + bdiWrap; `.num`→`dir="auto"` on mixed-text spans).
- Removed stale `public/robots.txt` (conflicted with metadata route → 500).

## NOT touched (per ownership contract)
`src/lib/i18n.ts` (imported only), admin-view, app-shell, auth/subscription/settings views, all API routes, prisma schema.

## Status
tsc 0, lint 0, /robots.txt 200, /sitemap.xml 200, JSON-LD served, demo outputs captured in worklog. Residuals: adoption ledger (9 inline date sites), i18n key migration for inline ICU patterns, auth-view digit-helper adoption, per-locale path URLs, prod NIVA_SITE_URL — all documented in docs/audit/11-bidi-qa.md §9.
