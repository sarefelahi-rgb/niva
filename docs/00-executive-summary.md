# NIVA Pregnancy Intelligence Platform — Executive Summary (Condensed PRD)

| Field | Value |
| --- | --- |
| Document | 00-executive-summary.md |
| Version | 1.0 (architecture baseline) |
| Task | 2-a — documentation suite |
| Status vocabulary | SPECIFIED / IMPLEMENTED (sandbox build) / DOCUMENTED-TARGET / DEFERRED |
| Related | 01-system-architecture.md, 09-test-plan.md, 10-backlog-risk.md |

This document condenses the Product Requirements into a reference summary. It describes both
what the current sandbox build implements and what is documented as the production target.
The shared worklog (`../worklog.md`) is the live record of what has actually been built and
manually verified in the browser; the acceptance matrix in `09-test-plan.md` records evidence.

## 1. Vision

NIVA is a scientific, interactive, AI-powered pregnancy and postpartum platform. It gives
expecting parents a trustworthy week-by-week companion: a gestational timeline grounded in
recognized obstetric guidance, a scientific 3D fetal visualization studio, evidence-grounded
answers with citations, gentle daily tracking, and a safety layer that escalates warning signs
to professional care instead of guessing. It launches for Persian-speaking users in Iran and
for international English-speaking users, with an architecture that accepts additional
languages without redesign.

NIVA is explicitly positioned as wellness and education software. It is not a diagnostic
device and does not replace medical care. This boundary is normative, not cosmetic; see
`06-medical-safety.md`.

## 2. Product principles

1. Safety before cleverness. Deterministic escalation bypasses the LLM entirely for emergency
   patterns; the AI never has the last word on a red flag.
2. Evidence over vibes. Educational and AI content carries document-level citations to a
   curated knowledge base with traceable scientific sources.
3. Honesty in the product and in the docs. Assets pending clinical review are labeled
   DEMONSTRATION; payments in the sandbox are labeled SANDBOX; no claim of medical approval
   exists anywhere until documented human review evidence exists.
4. Bilingual by construction. Persian (RTL) and English (LTR) are equal citizens, not a port.
5. Privacy as a feature. Consent records, export, delete, and an append-only audit trail are
   part of the core product, not a settings afterthought.

## 3. Personas

| Persona | Summary | Primary needs | Notes |
| --- | --- | --- | --- |
| P1 — Pregnant user (Iran) | 20–38, smartphone-first, Persian RTL, pays via domestic gateways | Gestational timeline, 3D visualization, safe Q&A, tracking, Persian content | Emergency numbers 115 (EMS) / 123 (social emergency); Zarinpal-style payments |
| P2 — Pregnant user (international) | 25–40, English LTR, card payments | Same as P1 with international card billing (Stripe-class adapter) | Local emergency number is shown, never invented |
| P3 — Partner / family member | Read-mostly companion | Limited visibility granted explicitly by P1 (granular, revocable), reminders, education | No access without a grant; alias identity in community |
| P4 — Clinical reviewer | Obstetrically trained reviewer role inside the platform | Review queue for content and 3D assets, approve/reject with reasons, audit-visible decisions | CLINICAL_REVIEWER role; see 06-medical-safety.md |
| P5 — Platform admin | Operator and moderator | User administration, moderation queue, SafetyEvent triage, metrics, entitlements | ADMIN role; see 03-api-spec.md (admin group) |

## 4. Market context

- Iran: Persian-first UX with correct RTL typography (Vazirmatn), domestic payment rails
  (Zarinpal-class), national emergency numbers (115, 123), and locally relevant prenatal
  guidance themes. App-store distribution is constrained by sanctions and policy realities,
  which strengthens the Web/PWA-first channel.
- International: English UX, card-based subscriptions (Stripe-class), GDPR-style privacy
  expectations (lawful basis, export, erasure), and mature competition — NIVA differentiates
  on scientific sourcing, the 3D studio, and the deterministic safety layer.
- Both markets: trust is the scarce resource. Visible citations, honest labeling, and
  clinician-shaped language are the moat.

## 5. Scope matrix (modules A–Y)

Status key: [IMPLEMENTED IN CURRENT BUILD] = present in the sandbox build as described in
worklog and this suite; [PARTIAL] = implemented slice plus a named deferred slice;
[DOCUMENTED-TARGET] = specified here for production, not in the sandbox.

| ID | Module | Status | Notes |
| --- | --- | --- | --- |
| A | Identity, auth, sessions, roles | [IMPLEMENTED IN CURRENT BUILD] | scrypt, session cookies, rotation, logout-all, RBAC guards (01, 07) |
| B | Pregnancy profile + gestational dating | [IMPLEMENTED IN CURRENT BUILD] | LMP and ultrasound-based dating; WHO 2016 contact schedule as reference (02, 03) |
| C | Week-by-week timeline | [IMPLEMENTED IN CURRENT BUILD] | Bilingual weekly content keyed to gestational week (03 content group) |
| D | Scientific 3D fetal studio | [IMPLEMENTED IN CURRENT BUILD] | Parametric procedural fetus, layers, hotspots, guided mode; assets labeled DEMONSTRATION (05) |
| E | AR education | [PARTIAL] | WebXR capability detection implemented; full guided AR scenes [DOCUMENTED-TARGET] |
| F | Health tracking | [IMPLEMENTED IN CURRENT BUILD] | Metrics + symptom entries with trend views (03 tracking group) |
| G | Symptom safety guidance | [IMPLEMENTED IN CURRENT BUILD] | Deterministic bilingual red-flag engine, bypasses LLM, SafetyEvent log (06) |
| H | Reminders | [IMPLEMENTED IN CURRENT BUILD] | In-app reminders; push/email/SMS delivery [DOCUMENTED-TARGET] |
| I | Medical records | [PARTIAL] | Document metadata registry implemented; file upload + malware scanning + object storage [DOCUMENTED-TARGET] |
| J | Evidence-grounded AI assistant | [IMPLEMENTED IN CURRENT BUILD] | In-process RAG, citations, red-flag bypass, injection heuristics, persisted threads (01, 08) |
| K | Nutrition education | [IMPLEMENTED IN CURRENT BUILD] | Bilingual reviewed-pipeline content (06 workflow governs approval) |
| L | Exercise education | [IMPLEMENTED IN CURRENT BUILD] | Same governance as K |
| M | Emotional wellbeing education | [IMPLEMENTED IN CURRENT BUILD] | Same governance as K; crisis language routes to red-flag engine |
| N | Birth preparation | [IMPLEMENTED IN CURRENT BUILD] | Late-pregnancy education track |
| O | Postpartum care | [IMPLEMENTED IN CURRENT BUILD] | Postpartum weeks, recovery education, red flags continue post-birth |
| P | Partner/family access | [IMPLEMENTED IN CURRENT BUILD] | Granular permission grants, revocable, object-level ownership checks (07) |
| Q | Moderated community | [IMPLEMENTED IN CURRENT BUILD] | Invitation-gated posting, alias profiles, keyword misinformation flagging, moderation queue |
| R | Notifications | [PARTIAL] | In-app notification center implemented; push/email/SMS providers [DOCUMENTED-TARGET] |
| S | Subscriptions, billing, entitlements | [PARTIAL] | Provider-adapter pattern with labeled SANDBOX adapter, server-side Entitlement as source of truth; live Zarinpal/Stripe [DOCUMENTED-TARGET] |
| T | Multilingual content management | [IMPLEMENTED IN CURRENT BUILD] | fa/en dictionary i18n + bilingual content records; additional languages [SPECIFIED] |
| U | Clinical review governance | [IMPLEMENTED IN CURRENT BUILD] | DRAFT → IN_REVIEW → APPROVED/REJECTED workflow with audit (06); external reviewer recruitment [DEFERRED] |
| V | Analytics | [PARTIAL] | Internal event/metric recording implemented; product analytics pipeline + dashboards [DOCUMENTED-TARGET] |
| W | Enterprise admin | [PARTIAL] | Admin console (users, review queue, moderation, metrics) implemented; multi-tenant enterprise features [DOCUMENTED-TARGET] |
| X | Privacy, consent, audit | [IMPLEMENTED IN CURRENT BUILD] | Consent records, append-only AuditEvent, export and delete workflows (02, 07) |
| Y | Data portability | [PARTIAL] | JSON export implemented; PDF/human-readable report formats [SPECIFIED] |

## 6. Delivery channels

- Now (current build): responsive web app served by Next.js 16, installable as a PWA
  (manifest + service worker) from the single user-visible route `/`; REST API under `/api/*`.
  This is the primary channel for both markets.
- Documented-target: Android and iOS applications via React Native + Expo sharing the API and
  content pipeline; a Capacitor wrapper of the web app is the fallback option if native
  investment must be deferred. Store compliance work (health-app policies, privacy manifests)
  is scoped in `06-medical-safety.md` and `10-backlog-risk.md`.
- Explicitly out of scope for launch: desktop apps, widgets, wearables.

## 7. Languages and localization

- Launch languages: Persian (fa, RTL) and English (en, LTR), dictionary-based i18n with
  runtime `dir` switching (ADR-007 in `01-system-architecture.md`).
- Architecture supports additional languages: dictionaries are data, content records store
  per-language fields, fonts are loaded per locale (Vazirmatn for fa, Inter for en).
- Localization quality standards (numerals, dates, pluralization, formality register) are in
  `04-design-system.md`; i18n quality risk is tracked in `10-backlog-risk.md`.

## 8. What this sandbox build is and is not

This section is the honesty contract for the whole documentation suite.

This sandbox build IS:

- A single-app modular monolith: Next.js 16 App Router, React 19, strict TypeScript, one
  user-visible route `/` hosting a client-side view router (sandbox gateway constraint,
  ADR-002), about 30 REST API route handlers under `/api/*`, Prisma ORM over SQLite
  (`db/custom.db`).
- A working vertical slice of modules A–Y at the statuses listed in section 5, with
  server-side session auth (scrypt hashing, HttpOnly SameSite=Lax cookies, token rotation on
  login, logout-all), in-memory rate limiting, same-origin checks on mutations, and roles
  USER / CLINICAL_REVIEWER / ADMIN enforced server-side.
- A real 3D studio built on React Three Fiber + drei with a parametric, stage-specific
  procedural fetus (keyframed anatomical proportion tables per gestational week — not a
  single scaled model), uterus/placenta/cord layers, hotspots, guided mode, LOD and
  device-adaptive DPR, reduced-motion mode, and WebXR capability detection.
- A real safety architecture: deterministic bilingual red-flag escalation that bypasses the
  LLM entirely, SafetyEvent logging, prompt-injection heuristics, document-level citations,
  and an LLM gateway (`z-ai-web-dev-sdk`) callable only server-side.
- A payments simulation: a provider-adapter pattern with a fully labeled SANDBOX adapter
  (HMAC-verified, idempotent webhook, unique idempotency keys), where the server-side
  Entitlement table is the single source of truth. Zarinpal and Stripe adapters are specified
  but not wired; no payment credentials exist in the sandbox.
- A governance skeleton: AnatomicalAsset registry with reviewStatus; every current asset is
  honestly labeled DEMONSTRATION pending clinical review.

This sandbox build IS NOT:

- Clinically approved. No content, asset, or answer carries clinical approval until
  documented human review evidence exists (see `06-medical-safety.md`, section 9).
- Connected to real money. No live payment processor is integrated and no real charges occur.
- Production infrastructure. SQLite instead of PostgreSQL, in-process RAG instead of an
  isolated model gateway, in-memory rate limiting instead of Redis, single-node deployment,
  no MFA, no automated test execution in this environment. The gap list and remediation plan
  live in `07-security-privacy.md` (section 14) and `10-backlog-risk.md`.
- Verified by automated suites. Test suites are specified in `08-ai-evaluation.md` and
  `09-test-plan.md`; executed verification in this sandbox is manual browser E2E recorded in
  the worklog.

## 9. Non-goals

- Diagnosis, treatment, prescription, or triage decisions. NIVA educates and refers.
- Real-time fetal monitoring claims of any kind (heart rate, movement counting as a medical
  measurement). See `05-3d-asset-spec.md` scientific integrity rules.
- Storing or processing payment card data; all card handling belongs to the live processors.
- Social features without moderation; anonymous public posting; unreviewed user-generated
  medical advice.
- Advertising or data brokerage. Revenue is subscription-only.

## 10. Success measures (honest form)

Until analytics pipelines and reviewed baselines exist (module V, [DOCUMENTED-TARGET]),
NIVA records only internal engineering metrics (build health, SafetyEvent counts, API
latency) and does not publish product KPI claims. The target KPI set — activation,
retention, safety-escalation correctness, review-queue throughput — is specified in
`09-test-plan.md` quality gates and becomes reportable only after the analytics backlog
item lands.

## 11. Document map

| File | Content |
| --- | --- |
| 00-executive-summary.md | This document |
| 01-system-architecture.md | C4 narrative, bounded contexts, flows, ADR-001..010 |
| 02-data-model.md | 27-entity catalog, ERD, retention, encryption, backup |
| 03-api-spec.md | Authoritative API contract catalog |
| 04-design-system.md | Tokens, RTL/LTR, WCAG 2.2 AA, screens, components |
| 05-3d-asset-spec.md | 3D engine, parametric tables, registry, AR, budgets |
| 06-medical-safety.md | Red-flag taxonomy, governance, regulatory scoping |
| 07-security-privacy.md | STRIDE, authN/authZ, consent, gaps |
| 08-ai-evaluation.md | RAG evaluation, red-flag regression, injection tests |
| 09-test-plan.md | Acceptance matrix, golden-path E2E, quality gates |
| 10-backlog-risk.md | Phase 0–8 backlog, 15-risk register |
