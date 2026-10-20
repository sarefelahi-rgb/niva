# NIVA — Architecture Decision Records (Phase 0 Baseline Set)

Format: lightweight ADR. Status: Proposed (unless noted Accepted) — user ratification requested at gate review.

---

## ADR-001 — Retain modular monolith on Next.js; extract services only on measured need

- **Status:** Accepted (aligns with mission non-negotiable #8)
- **Context:** Single Next.js 16 service hosts API, RAG, 3D logic, admin. Audit found no scale evidence (sandbox traffic) but clear integrity debts (transactions, quota races, logging).
- **Decision:** Keep one deployable. Introduce bounded-context boundaries *in code* (`src/modules/{identity,pregnancy,medical-content,studio,ai,journal,family,community,subscription,notification,admin,analytics}`) so future extraction is mechanical. Background jobs arrive as a queue abstraction inside the same service (Phase 9) before any separate worker is justified.
- **Consequences:** +operational simplicity, faster iterations; −in-process coupling risk mitigated by module boundaries and dependency rules (modules import via their public index only).

## ADR-002 — Migrate client-side view routing to App Router routes per view

- **Status:** Proposed
- **Context:** 21 views statically imported into one client component (`page.tsx`); no deep links, no per-view SEO, no code splitting, landing flash for logged-in users, view state lost on reload.
- **Decision:** Phase 2–4 migration to real routes (`/`, `/login`, `/onboarding`, `/app/dashboard`, `/app/timeline`, `/studio`, `/admin`, …) preserving zustand for UI state only. URL becomes the source of truth for navigation; `booted` gates render to stop flash. Route-level metadata + `generateMetadata` for public pages. Regression guard: existing users' flows re-tested via browser automation.
- **Consequences:** +SEO, shareability, code splitting, back-button correctness; −migration risk (mitigated by incremental route adoption and E2E checks).

## ADR-003 — Database: SQLite now, PostgreSQL at production gate; migrations discipline replaces `db:push --accept-data-loss`

- **Status:** Accepted for sandbox; migration execution gated (Phase 9) on user approval (destructive-risk protocol)
- **Context:** SQLite file DB is fine for the sandbox; production needs concurrency, transactions, and operational maturity. Current workflow has no migration history.
- **Decision:** 1) Immediately adopt `prisma migrate dev/deploy` as the canonical workflow in the sandbox (baseline migration from current schema; `db:push` retained only for scratch resets, never for tracked schema). 2) Phase 9: rehearse backup → PostgreSQL migrate → verification → rollback; switch via env `DATABASE_URL` with no code change (Prisma portability).
- **Consequences:** +real migration history, prepared rollback story; −one-time baseline commit discipline.

## ADR-004 — Authentication: hybrid session (HttpOnly cookie primary; Bearer bridge for embedded contexts)

- **Status:** Accepted (shipped in hotfix-login-1; hardening scheduled)
- **Context:** Preview panels embed the app cross-origin; third-party cookie blocking breaks cookie-only sessions. localStorage tokens trade XSS risk for embed capability.
- **Decision:** Keep the hybrid but harden: token mirrored to localStorage ONLY for embed contexts; CSP scheduled (Phase 14) to reduce XSS blast radius; logout/revocation applies to both channels (Bearer bridged via `proxy.ts`); session rotation on login; server-side revocation list is the source of truth. CSRF: keep same-origin policy but fail closed when an Origin header is present and mismatched; token-authenticated (non-cookie) requests are inherently CSRF-safe.
- **Consequences:** +works everywhere today; −token-in-JS risk accepted with compensating controls and documented (risk R-13).

## ADR-005 — Medical safety architecture: deterministic-first, independent of LLM

- **Status:** Accepted (existing pattern preserved; coverage completed in Phase 6/7)
- **Context:** Red-flag detection must never depend on an LLM. Current: 14 bilingual deterministic rules; EMERGENCY bypasses LLM entirely; same scanner guards tracking input.
- **Decision:** Keep deterministic scanner as the single source of emergency truth; extend coverage to journal + community; add LLM **output-side** re-scan before persistence/delivery; CAUTION class gets templated cautionary framing; all escalations raise SafetyEvents + staff alerting once notification channels exist. Translate medical content via independent review track (never machine-only).
- **Consequences:** +auditable safety path; −some over-triggering accepted in exchange for sensitivity (recall over precision for emergencies).

## ADR-006 — 3D studio: parametric real-time renders + professionally authored asset pipeline

- **Status:** Proposed (extends accepted earlier direction for natural/realistic 3D)
- **Context:** Current studio = MarchingCubes parametric fetus w/ 12 gestational keyframes, 3 quality tiers; pre-rendered PNGs in `download/` are dev evidence only (verified unused). User directive: "natural 3D" realism; master prompt requires professionally authored, medically reviewed assets, no implied diagnostic precision.
- **Decision:** Dual-track pipeline: (a) keep and harden the parametric engine for interactive exploration (fix GPU leaks, memory budget tests, LOD validation, WebGL fallback UX); (b) add a versioned GLB/glTF authored-asset pipeline (Blender → Draco/meshopt + KTX2 compression, LOD chains, CDN object storage, integrity-checked manifests) for hero realism moments; both tracks feed the same medical metadata registry (`AnatomicalAsset`/`AnimationAsset`) and the same review workflow. Educational disclaimer ("illustrative, not diagnostic") remains mandatory UI.
- **Consequences:** +realism +scalable quality; −asset production cost, size budgets enforced via perf tests.

## ADR-007 — Brand identity: master-prompt palette with reference-image layout language

- **Status:** Proposed
- **Context:** Master prompt mandates lavender/ivory/coral/sage palette, WCAG-validated; uploaded reference image shows a premium mint→pink gradient mobile aesthetic (rounded soft cards, 3D illustrated character, circular week dial, calendar strip).
- **Decision:** Adopt the mandated palette as the token foundation (Phase 1) while importing the reference image's **composition language**: soft gradient canvases, oversized rounded cards, circular progress dials, friendly 3D character illustration as mascot component, generous whitespace. Fonts: Vazirmatn (fa) + Inter (en) as variable self-hosted with license verification. All tokens oklch; contrast pairs pre-validated; dark mode derived (deep aubergine base already present).
- **Consequences:** +differentiated, warm premium identity; −requires token migration sweep across 20 views (mechanical, token-driven).

## ADR-008 — Payments: server-side PSP abstraction; client never touches signing

- **Status:** Proposed
- **Context:** R-01: client mints valid webhook signatures via exposed GET; hardcoded secret fallback; no PSP.
- **Decision:** Introduce `PaymentProvider` interface (create/verify/refund/webhook-verify) with regional (e.g., Zarinpal) + international (e.g., Stripe) implementations behind server routes only. Webhook secret env-only, fail closed, rate-limited, idempotent via unique event id. Entitlement transitions transactional with period-end cancellation and grace. Sandbox mode stays available via explicit `PAYMENTS_MODE=sandbox` that visibly labels test state in UI.
- **Consequences:** +revenue integrity; −requires provider contracts before Phase 12 exit.

## ADR-009 — Background work: in-process queue first (outbox pattern), worker extraction deferred

- **Status:** Proposed
- **Context:** Reminders/notifications are dead rows without a scheduler; no email/push channels exist.
- **Decision:** Implement a transactional outbox + in-process scheduler (interval worker inside Next server via singleton) delivering to in-app notifications first; email/push providers (consent-gated) plug into the same outbox. Extract to a separate worker only when measurements show pressure (ADR-001 symmetry).
- **Consequences:** +unblocks reminder/escalation value now; −in-process scheduling limits horizontal scaling (acceptable pre-multi-instance).

## ADR-010 — Testing & CI: gates block merge; no green-by-suppression

- **Status:** Proposed
- **Context:** Zero tests, zero CI, build suppressions enabled.
- **Decision:** Phase 14 establishes: Vitest unit + API contract tests; Playwright E2E for golden paths (auth, onboarding, dating, safety escalation, quota, deletion, consent); axe a11y checks; lint/type/build gates; dependency scanning; medical-content review lifecycle tests; AI safety regression fixtures. CI blocks merge on any failure; suppression of checks is prohibited by policy (checked in review).
- **Consequences:** +verifiable quality bar; −slower PRs (accepted).
