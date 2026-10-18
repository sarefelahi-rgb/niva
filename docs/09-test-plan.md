# NIVA — Test Plan & Acceptance Matrix

| Field | Value |
| --- | --- |
| Document | 09-test-plan.md |
| Version | 1.0 (architecture baseline) |
| Task | 2-a |
| Related | 08-ai-evaluation.md, 04-design-system.md §9, 07-security-privacy.md, 10-backlog-risk.md |

## 1. Scope and method vocabulary

Verification methods used in the acceptance matrix:

- **automated-specified** — the test is specified in this suite (or in `08-ai-evaluation.md`)
  to become an automated check; not executed in this sandbox.
- **manual-verified-in-browser** — executed manually in the running app; evidence recorded in
  the shared worklog per §8.
- **deferred** — consciously postponed to a later phase (`10-backlog-risk.md`).

The current sandbox has no test runner configured for automated suites; honesty about this
is part of the quality gates (§8).

## 2. Environments

| Environment | Description |
| --- | --- |
| Sandbox dev | The single build: dev server on port 3000, SQLite `db/custom.db`, labeled SANDBOX payments |
| Production target | Described in `01-system-architecture.md` §10; all deferred items assume it |

## 3. Acceptance matrix (modules A–Y)

| Module | Acceptance criterion | Method |
| --- | --- | --- |
| A — Identity/auth | Register, login, logout, logout-all work; session cookie HttpOnly; role guards block unauthorized admin routes (401/403) | manual-verified-in-browser |
| A | Passwords stored scrypt-hashed; failed login audited; rate limit 10/min/IP | automated-specified |
| B — Pregnancy/dating | Profile creation; LMP and ultrasound dating produce consistent due dates; method shown transparently | manual-verified-in-browser |
| B | Dating math unit tests (week computation edges) | automated-specified |
| C — Timeline | Week content renders for fa/en; only APPROVED content visible | manual-verified-in-browser |
| C | Content gating rejects non-approved rows (API-level) | automated-specified |
| D — 3D studio | Parametric fetus renders across weeks 4–40; layers toggle; hotspots open panels; DEMONSTRATION badge always visible | manual-verified-in-browser |
| D | LOD tier degradation; budget check (05 §7) | manual-verified-in-browser (fps monitor) |
| E — AR | WebXR detection hides AR button when unsupported; shows affordance where supported | manual-verified-in-browser |
| E | Guided AR scenes | deferred |
| F — Tracking | Metric + symptom entries persist; trends render | manual-verified-in-browser |
| F | Symptom write-path triggers red-flag engine on red-flag notes | automated-specified + manual probe |
| G — Symptom safety | Red-flag note produces escalation card; SafetyEvent(OPEN) row created; numbers 115/123 shown | manual-verified-in-browser |
| G | Full pattern catalog bypass (18-row minimum) | automated-specified (`08` §4) |
| H — Reminders | Create/complete/snooze/dismiss; due ordering | manual-verified-in-browser |
| H | Push/email/SMS delivery | deferred |
| I — Documents | Metadata registry create/delete; privacy of list | manual-verified-in-browser |
| I | File upload + AV scan pipeline | deferred |
| J — AI assistant | Grounded answer with citations; empty-retrieval referral; out-of-scope refusal | manual-verified-in-browser |
| J | Injection probes PI-01..07 rejected | automated-specified (`08` §6) |
| J | LLM called only server-side (no key/client exposure) | manual-verified-in-browser (network inspection) |
| K–O — Education | Nutrition/exercise/emotional/birth-prep/postpartum tracks render with citations | manual-verified-in-browser |
| K–O | Review workflow blocks unapproved publication | automated-specified |
| P — Family | Grant create/revoke; partner sees only granted scopes; journal excluded unless explicitly granted | manual-verified-in-browser |
| P | Grant enforcement at API level (IDOR probes) | automated-specified |
| Q — Community | Invitation-gated posting; alias display; keyword flagging; moderation queue actions | manual-verified-in-browser |
| Q | Flagging rule unit tests | automated-specified |
| R — Notifications | In-app notification center lists events; mark read | manual-verified-in-browser |
| R | Push/email/SMS channels | deferred |
| S — Subscriptions | Sandbox checkout→webhook→entitlement flow with idempotent replay; SANDBOX labeling everywhere | manual-verified-in-browser |
| S | Webhook HMAC + idempotency unit tests; replay returns same result | automated-specified |
| T — i18n | fa/en switch updates dir/lang, fonts, dates; no untranslated strings in golden paths | manual-verified-in-browser |
| T | Dictionary completeness lint (missing keys) | automated-specified |
| U — Clinical review | DRAFT→IN_REVIEW→APPROVED/REJECTED with audit rows; admin cannot approve own draft | manual-verified-in-browser |
| U | External reviewer recruitment + qualification ops | deferred |
| V — Analytics | Admin metrics endpoint returns SafetyEvent counts and health snapshot | manual-verified-in-browser |
| V | Product analytics pipeline | deferred |
| W — Admin | User list, review queue, moderation tabs function with role guard | manual-verified-in-browser |
| W | Multi-tenant enterprise features | deferred |
| X — Privacy | Consent grant/withdraw persists; export produces valid JSON archive; delete cascade respects retention table | manual-verified-in-browser |
| X | Audit append-only property (no update/delete path) | automated-specified |
| Y — Portability | Export imports conceptually (schema matches `niva.export.v1`); rate limit 2/hour | manual-verified-in-browser |
| Y | PDF/human-readable export | deferred |

## 4. Golden-path E2E scripts (manual browser scripts)

G1 — Register → onboard → dashboard: register user (fa), complete onboarding incl. dating,
land on dashboard with correct week card; RTL direction and Vazirmatn confirmed.

G2 — 3D studio: open studio from dashboard; scrub weeks 8→40; toggle placenta/cord; open a
hotspot; confirm DEMONSTRATION label; leave without console errors.

G3 — AI happy path: ask a nutrition question; answer arrives with ≥1 citation badge; follow
a citation to its source record.

G4 — AI escalation: send "خونریزی شدید دارم"; escalation card appears with 115/123; SafetyEvent
visible in admin; LLM bypassed (latency near-zero).

G5 — Tracking: add symptom entries (normal + red-flag note); trends update; escalation card on
the red-flag note.

G6 — Journal: create, edit, delete entry; private by default.

G7 — Subscription sandbox: choose plan; SANDBOX checkout; webhook (simulated) activates
entitlement; replay webhook → no duplicate entitlement; SANDBOX badges visible.

G8 — Admin: open admin console; review queue shows a draft; approve; content appears to users
(when published) — in the sandbox, approvals are engineering-role actions only and confer no
clinical approval (06 §9).

G9 — Privacy: export downloads valid JSON; delete request flow shows consequences; consent
switches persist.

G10 — i18n/theme: switch fa↔en and light/dark; direction, fonts, contrast remain correct on
dashboard, studio, AI, admin.

Each run is recorded per §8 with pass/fail and notes.

## 5. Performance test protocol

- Targets: API p95 < 400 ms (non-AI), AI end-to-end p95 < 8 s, studio interaction at 60 fps
  HIGH / 30 fps LOW (`05` §7), first contentful interaction < 2.5 s on dev hardware.
- Method now: manual observation with devtools network/performance panels and the studio fps
  monitor; recorded as evidence rows.
- Automated (target): Lighthouse CI budgets and API load smoke in the CI phase.

## 6. Security test protocol

- Checklist mapping to OWASP ASVS L2 topics: session management, access control (IDOR probe
  set over every object route), input validation, rate-limit behavior, error envelope
  hygiene, secrets absence in client bundle, payment webhook signature tests.
- IDOR probes: for each object route, request another user's id → expect 403/404.
- Rate-limit probes: burst each limited route → expect 429 with Retry-After.
- Method now: manual checklist per release; automated (target) via contract tests + CI
  checks (`03` §6, `07` §12).

## 7. Accessibility protocol (WCAG 2.2 AA)

- Automated (specified): axe-style static checks; contrast verification of §2 token pairs;
  dictionary lint for aria-label keys.
- Manual: keyboard-only pass of the 20 screens (`04` §7); focus-visible on dark theme;
  target-size spot checks (44 px); form error announcement; screen-reader spot check
  (NVDA/VoiceOver) on dashboard, AI, escalation cards; 3D accessibility alternatives
  (`05` §9) exercised.
- Escalation cards: `role="alert"` and immediate focus handling verified manually.

## 8. Evidence recording convention

- Every executed verification becomes a worklog line: `EVD-### <date> <what> <result>`.
- Evidence ids are referenced in PR descriptions/commit messages and may be cited in this
  matrix's follow-ups. Failed evidence lines are never removed — follow-up rows supersede.
- Automated suites, once they exist, attach run ids in the same convention. The worklog
  remains the single source of verification truth for this project.

## 9. Quality gates

| Gate | Requirement |
| --- | --- |
| G-QA1 | TypeScript strict typecheck + ESLint clean |
| G-QA2 | Production build succeeds |
| G-QA3 | Prisma schema push/migrate clean against fresh DB |
| G-QA4 | Golden paths G1–G10 pass (manual while automated suites are absent) |
| G-QA5 | Red-flag catalog §3 of 08 executed (manual until runner exists) with 100% bypass |
| G-QA6 | 3D budgets met (`05` §7) |
| G-QA7 | No untranslated key visible in fa/en golden paths |
| G-QA8 | SANDBOX/DEMONSTRATION labels present on all payment/3D surfaces |
| G-QA9 | Release notes updated; worklog entry appended |

A release that cannot claim a gate records the failure honestly in the worklog rather than
skipping the row.
