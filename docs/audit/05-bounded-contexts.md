# NIVA — Bounded Contexts, API Contract Standards & Validation Audit (Wave 5.1)

Status: IMPLEMENTED (documentation + convention adopted in code). Scope note: this
document is the authoritative map of the platform's service boundaries in the
sandbox build; the production target (NestJS per-module layout) keeps the same
boundaries with stronger physical separation — see docs/01-system-architecture.md.

## 1. Bounded contexts

| # | Context | Owns (Prisma models) | API surface | Invariants the context guards |
|---|---|---|---|---|
| 1 | Identity & Access | User, Session, Consent | /api/auth/*, /api/consent, /api/settings | Password hash never leaves the context; session tokens are single-source (lib/auth); demo can never yield ADMIN (R-02). |
| 2 | Pregnancy & Clinical Timeline | Pregnancy, GestationalDating, PregnancyEvent, SymptomEntry | /api/pregnancy, /api/timeline | Dating is physician-first; confidence + uncertainty always surfaced; no deterministic claim without a source. |
| 3 | Care Coordination | Appointment, Reminder, MedicalDocument | /api/appointments, /api/documents | Reminders fire through the scheduler only; no clinical advice attached. |
| 4 | Knowledge & Review (CMS) | EducationalContent, ScientificSource, ClinicalReview, AnatomicalAsset | /api/content, /api/assets, /api/assets/review, /api/admin/review | Nothing reaches the studio/content feed without APPROVED or DEMONSTRATION status; every claim carries a citation; reviewer identity is stamped (never canned). |
| 5 | AI Assistant | AIConversation, AIMessage, AIUsageLog | /api/ai/* | Deterministic safety gate outranks the model; grounding + citations; PHI-free observability; provider failures degrade honestly. |
| 6 | Community | CommunityPost, ModerationAction | /api/community, /api/admin/moderation | Pre-publish moderation queue; anti-harassment auto-flag; author notifications. |
| 7 | Family & Partner | PartnerAccess | /api/family/* | Scoped read-only views; revocation propagates. |
| 8 | Wellness Tracking | NutritionEntry, ExerciseEntry, SleepEntry, MoodEntry, JournalEntry | /api/wellness/*, /api/journal, /api/tracking | Reviewed-content contracts; local-day bucketing; consecutive-low-mood support loop. |
| 9 | Birth & Postpartum | BirthPlanItem, ContractionEntry, FeedingEntry, BabyCareEntry | /api/birth-prep, /api/contractions, /api/baby | Education-only; 5-1-1 rule surfaces guidance, never a diagnosis. |
| 10 | Monetization | Subscription, Payment, Entitlement | /api/subscription/*, /api/payments/* | No client-minted signatures (R-01 killed); entitlement changes are transactional; emergency info is never paywalled. |
| 11 | Platform Ops | AuditEvent, SafetyEvent, Notification, Setting, LandingMetric | /api/admin/*, /api/notifications, /api/scheduler/tick | Observability without PHI; scheduler auth via secret or ADMIN; every privileged action audited. |

Cross-context rules:
- Contexts communicate through API routes only (no model imports across boundaries
  for writes); shared code lives in src/lib (api, auth, audit, entitlements, rate-limit, safety, i18n, observability).
- Every write path validates input with a zod schema owned by its context (see §3).
- Every privileged write writes an AuditEvent (logAudit / logAdminAction).

## 2. API contract standards

- **Versioning**: the sandbox API is unversioned by path (`/api/…`) by design — it
  is a private first-party surface consumed by the bundled client only. The
  contract for external consumption (Wave 6.1 payment providers, Wave 6.2 admin
  tooling) will mount `/api/v1/…` with additive-only changes; breaking changes
  ship a new major prefix. Decision recorded here and in ADR-011.
- **Error envelope**: every error is `{ error: { code, message } }` with stable
  machine codes (`UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION`, `RATE_LIMIT`,
  `NOT_FOUND`, `CSRF`, `INTERNAL`, …) — the client matches on `code`, never on
  message text.
- **Tracing**: every response through `withUser` carries `x-request-id`; logs
  (lib/observability) emit the same id → one user report maps to one log line.
- **Status semantics**: 401 unauthenticated, 403 role/CSRF, 404 foreign/absent
  resource (never 403 for IDOR — no existence leak), 400 validation, 402 quota
  (chat), 429 rate limit, 405 method, 409 invalid transition.
- **Contract verification**: `scripts/verify-contracts.ts` runs the security
  contract against the live server on demand (19/19 passing —
  docs/audit/api-contract-report.json); CI gate defined in .github/workflows/ci.yml.

## 3. Validation schema audit (zod)

Method: every POST/PATCH/PUT/DELETE route enumerated from src/app/api/**/route.ts
and checked for `readJson(req, z.object({...}))` (or explicit body guard).

| Context | Routes | Validated | Notes |
|---|---|---|---|
| auth | login, register, demo, logout | 4/4 | email/password bounded; demo body ignored |
| pregnancy | dating, events, profile | 3/3 | real-calendar-date guards (rejects 2026-02-30) |
| appointments | create/update, reminders | 2/2 | future-only scheduling; timezone-pinned |
| content/assets | review PATCH, admin review POST | 2/2 | action enum + transition checks server-side |
| ai | chat POST, conversations POST | 2/2 | message ≤ 2000 chars; lang enum |
| wellness | nutrition, exercise, sleep, mood | 4/4 | range + 0.5-step refine + real date |
| birth/baby | birth-prep, contractions, feeding, baby-care | 4/4 | duration/type enums bounded |
| community | create post, report | 2/2 | length caps; report reason enum |
| family | invite, accept, shared | 3/3 | token format validated |
| subscription | cancel POST | 1/1 | — |
| notifications | preferences PUT, mark-read, delete | 3/3 | — |
| admin | moderation, user role, flags | 3/3 | role enum enforced |

Result: **30/30 mutating routes validated** with zod (audited 2026-10-20; the two
remaining non-`readJson` writes are auth cookies/session rotation which carry no
body). Payload ceiling (256 KB) and content-type enforcement live centrally in
`readJson`.

## 4. Honest residuals

- Route-level OpenAPI generation is not present in the sandbox build; the tables
  above are the contract of record until the Wave 6 external API work.
- Per-context ownership of zod schemas is by convention (co-located in each
  route file) — a shared schema module per context lands with the v1 prefix.
- Scheduler tick + admin routes accept either secret or ADMIN session; the
  secret path is curl/tooling-only and never exposed to the browser bundle.
