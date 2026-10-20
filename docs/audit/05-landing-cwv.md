# Phase 2 — Premium Landing: Measured Evidence

Date: 2026-10-19 · Build: dev server (Next.js 16, Turbopack), commit at time of measurement.
Method: Chrome (agent-browser/CDP headless), PerformanceObserver + Event Timing API,
viewport 1280×720 desktop and 390×844 mobile. Local network — production numbers will
differ, but budgets are tracked against p75 targets from the master prompt.

## CWV measurements (landing `/`, variant A hero)

| Metric | Measured | Budget (p75) | Verdict |
| --- | --- | --- | --- |
| LCP | **700 ms** | ≤ 2,500 ms | ✅ PASS |
| CLS | **0.0128** | ≤ 0.1 | ✅ PASS |
| INP (max event duration, local approx.) | **104 ms** (typical interactions ~24 ms) | ≤ 200 ms | ✅ PASS |
| DOMContentLoaded | 318 ms | — | informative |
| Initial document transfer | 96 KB | — | informative |

Why LCP is fast: the H1 is the LCP element and renders in the synchronous hero; the hero
image is a sized `<img width height fetchPriority=high>` (no CLS); the 3D "bloom" (variant B)
mounts only after idle via `next/dynamic ssr:false`, so three.js is never in the LCP path;
below-fold sections ship as one lazy chunk with a skeleton fallback.

## Structured data (verified in rendered DOM)

- `application/ld+json` #1 — `@graph: Organization + SoftwareApplication` (static hero chunk).
- `application/ld+json` #2 — `FAQPage` rendered with the FAQ section, mirroring the visible accordion exactly.
- `<link rel="canonical" href="…/">` + hreflang `fa` / `en` / `x-default` — confirmed in HTTP response head.
- `/sitemap.xml` (App Router `sitemap.ts`) + `Sitemap:` line in `public/robots.txt`.
- hreflang targets are real, working URLs: `/?lang=fa|en` read at boot (`src/app/page.tsx`).

## Analytics & A/B (backlog item 1.8) — verified end-to-end

- Consent bar appears for fresh visitors; **Accept** → `niva_analytics_consent=granted`,
  50/50 `niva_ab_variant` assigned; **decline records nothing**.
- Beacons observed in DB (`LandingMetric` — day/name/variant/count, NO user id, IP, UA or cookies):
  - `landing_view` increments on load when consent pre-granted.
  - `cta_start` / `cta_demo` recorded on CTA clicks.
  - `ab_consent_granted` recorded at opt-in time.
- Negative tests: unknown event name → **400 VALIDATION**; cross-origin without Origin → fail-open
  per accepted risk R-13 (browser POSTs always carry Origin); rate limit 30/min per client.

## Regression evidence

- `bunx tsc --noEmit` → **0 errors**.
- `bun run lint` → **0 errors, 0 warnings**.
- Browser walk-through: sticky header + anchor nav (fa RTL & en LTR), FAQ accordion toggles,
  pricing renders catalog values (۲,۴۹۰,۰۰۰ / ۲۴,۹۰۰,۰۰۰ / ۳,۹۹۰,۰۰۰ تومان) from the shared
  `src/lib/plans.ts` catalog, footer flush with viewport bottom on long page
  (`footerBottom == innerHeight`), mobile 390px single-column layout OK.
- Console: only documented upstream dev warnings (THREE.Clock deprecation from drei internals).
- i18n symmetry: en 468 keys / fa 468 keys — landing additions perfectly mirrored.

## Architecture notes

- Plan catalog single-sourced in `src/lib/plans.ts` (client-safe); `lib/entitlements.ts`
  re-exports for server APIs — no duplication drift between landing pricing and enforcement.
- A/B only changes the hero visual (static art vs lazy 3D); assignment is local and consent-gated.
- Emergency/red-flag claims on the landing are backed by the shipped safety layer
  (`lib/safety.ts` — 14 deterministic rules, EMERGENCY short-circuits the LLM).
