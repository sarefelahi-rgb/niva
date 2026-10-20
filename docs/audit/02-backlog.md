# NIVA — Prioritized Reengineering Backlog (Phase 0 Output)

Ordering: security/medical-safety first, then revenue integrity, then brand/experience, then scale.
Each item maps to a master-prompt phase (P#) and lists acceptance evidence required before "IMPLEMENTED" status.

## Wave 0 — Immediate integrity hotfixes (can ship within current sprint)

| # | Item | P# | Acceptance evidence |
| --- | --- | --- | --- |
| 0.1 | Remove demo→ADMIN fallback; demo route returns USER-role account only; env-gate demo+seed in production builds | P3/P9 | Code diff + route test: demo never yields ADMIN |
| 0.2 | Kill client-side payment signature minting (`GET /api/subscription/cancel` signing); webhook secret env-only, fail closed; rate-limit webhook | P12 | Negative test: forged/self-minted signature rejected |
| 0.3 | Env-gate Prisma query logging (dev-only default); no query logs in production mode | P9 | `NODE_ENV=production` boot shows no query lines |
| 0.4 | tsconfig: remove `noImplicitAny:false`, exclude `examples/`+`skills/`; next.config: remove `ignoreBuildErrors`, enable `reactStrictMode` (verify app tolerates double-render) | P14 | `tsc --noEmit` clean incl. flags; lint clean; app smoke-tested |
| 0.5 | Fix brand font tokens (`--font-niva-sans/-rtl`) + self-hosted fonts decision | P1 | Computed font-family in browser shows Vazirmatn/Inter |
| 0.6 | Transactionalize top write chains: pregnancy dating, appointment+reminder+notification, webhook writes | P9 | Code review + partial-failure test |
| 0.7 | Atomic AI daily quota (unique-constraint counter or conditional updateMany) | P7 | Concurrency test: 10 parallel requests → exactly 5 succeed on FREE |
| 0.8 | True consent withdrawal (no `withdrawAt` reset); unpaywall data export | P11 | API test: withdraw → `withdrawAt` set; export 200 on FREE |
| 0.9 | Dispose studio GPU resources; remove dead per-frame allocation | P5 | Profile: no geometry/texture count growth over 100 week-changes |
| 0.10 | Fix a11y: ≥44px delete buttons, no hover-only controls, valid tablist ARIA | P14 | axe scan + keyboard-only walkthrough |

## Wave 1 — Brand & premium landing (Phases 1–2)

| # | Item | P# |
| --- | --- | --- |
| 1.1 | Brand identity package: positioning, story, archetype, messaging framework (EN+FA), tone/microcopy rules | P1 |
| 1.2 | Logo system (wordmark, monogram, icon, responsive variants), favicon/app-icon set, export specs | P1 |
| 1.3 | Design tokens v2: lavender/ivory/coral/sage palette with WCAG-validated text pairs, oklch, dark mode, motion, elevation, radii (reconcile with mint/pink reference layout) | P1 |
| 1.4 | Typography: self-hosted Vazirmatn + Inter variable fonts, licensing check, RTL/LTR strategies | P1 |
| 1.5 | Design system docs + Figma-ready component spec + brand guidelines doc | P1 |
| 1.6 | Landing rebuild: hero w/ lightweight 3D, journey, science section, assistant boundaries, features, transparent pricing, advisory methodology, trust/privacy, FAQ, legal, footer | P2 |
| 1.7 | CWV budgets measured (LCP≤2.5s, INP≤200ms, CLS≤0.1 p75), code splitting, structured data, sitemap, hreflang | P2 |
| 1.8 | Privacy-preserving analytics + consent-gated A/B | P2/P12 |

## Wave 2 — Identity, dashboard, content foundation (Phases 3–4, 6)

| # | Item | P# |
| --- | --- | --- |
| 2.1 | Account security: verification, recovery, optional MFA (mandatory for admin), session rotation/revocation list | P3 |
| 2.2 | Onboarding: stage selection, dating with uncertainty display, progressive profiling, preferences, resumable tour | P3 |
| 2.3 | Dashboard v2: gestational clock w/ uncertainty, growth education, calendar/checklists, offline-tolerant states | P4 |
| 2.4 | Medical CMS hardening: evidence grading fields, review/expiration workflow, provenance rendering, translation review track | P6 |
| 2.5 | Safety-coverage completion: scan journal/community; output-side AI re-scan; BP alert SafetyEvent; staff escalation path | P6/P7 |

## Wave 3 — AI assistant & 3D studio excellence (Phases 5, 7)

| # | Item | P# |
| --- | --- | --- |
| 3.1 | RAG v2: chunked versioned KB, embeddings + lexical hybrid, re-ranking, per-locale retrieval, evaluation harness (safety/hallucination/refusal/multilingual/adversarial) | P7 |
| 3.2 | Provider abstraction + cost controls + safe-content caching + fallbacks; AI observability w/o PHI | P7 |
| 3.3 | Studio asset pipeline: separation of anatomy content/parameters/geometry/materials; professional authored assets path; review workflow per model | P5 |
| 3.4 | Studio performance: memory budget tests on device matrix, LOD validation, WebGL fallback UX, annotation accuracy pass | P5 |
| 3.5 | Narrated education + contextual annotations + scientifically appropriate size comparisons | P5 |

## Wave 4 — Ecosystem completion (Phase 8)

| # | Item | P# |
| --- | --- | --- |
| 4.1 | Community full loop: moderation queue UI+API, approve/reject, reports, anti-harassment, ModerationAction FK repair | P8 |
| 4.2 | Partner access real flow: invitation/accept, scoped partner read endpoints, revocation propagation | P8 |
| 4.3 | Nutrition/exercise/sleep/mood modules w/ reviewed content contracts | P8 |
| 4.4 | Birth prep persistence + contraction timer (logging utility) + postpartum + feeding education + baby journal | P8 |
| 4.5 | Notification center + scheduler (job queue) + consent-gated push/email | P8/P9 |

## Wave 5 — Platform hardening (Phases 9, 14)

| # | Item | P# |
| --- | --- | --- |
| 5.1 | Bounded contexts documentation + API contract versioning + validation schemas audit | P9 |
| 5.2 | Postgres migration rehearsal (backup → migrate → verify → rollback), migrations replace db:push | P9 |
| 5.3 | Structured logging w/ redaction, tracing, metrics, alerting; secret management | P9 |
| 5.4 | Test pyramid: unit → API contract → E2E (auth boundaries, IDOR, CSRF, quota, webhook replay, deletion, consent) + a11y + visual regression + perf | P14 |
| 5.5 | CI/CD gates blocking on build/type/lint/tests/security; OWASP ASVS verification + threat model | P14 |
| 5.6 | Object storage/CDN for 3D/media with versioned manifests + integrity checks | P9 |

## Wave 6 — Monetization, admin, i18n, distribution, launch (Phases 10–13, 15)

| # | Item | P# |
| --- | --- | --- |
| 6.1 | Real PSP adapter (regional + international), webhook idempotency/reconciliation, refunds, invoices, period-end cancellation, trials, localized pricing | P12 |
| 6.2 | Admin v2: role spectrum (super admin/editor/reviewer/support/finance/moderator), user mgmt, tickets, incidents, flags wired to features, staged rollout | P10 |
| 6.3 | ICU message formatting, pluralization, locale dates/units, bidi QA, localized SEO | P11 |
| 6.4 | Jurisdiction privacy review pack (GDPR + target-market laws), data residency decisions, age gating | P11 |
| 6.5 | PWA polish (offline UX, cache budgets), push, native wrapper evaluation, store compliance assets | P13 |
| 6.6 | Release: env parity, CI/CD, canary/blue-green, backup/restore drills, observability, launch checklist incl. clinical sign-off | P15 |

## Explicit non-goals / guards

- No fabricated testimonials, reviews, clinical approvals, or payment transactions — ever.
- Emergency/red-flag information remains free, unpaywalled, and independent of the AI layer.
- No destructive schema change without backup + rehearsal + rollback + explicit user approval.
