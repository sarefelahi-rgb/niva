# NIVA — Jurisdiction Privacy Review Pack (Wave 6.4, backlog item 6.4)

Status: **DELIVERED (sandbox scope)** — prepared for the GDPR review + target-market
(Iran) review. Every claim about *existing* functionality in this document was
cross-checked against the actual code on 2026 (verification date of Wave 6.4;
routes verified are listed in §9). Claims that depend on production
infrastructure or legal counsel are explicitly marked.

Scope honesty rule used throughout: **"exists today"** means it is implemented
and was exercised in this sandbox build; **"production task"** means it must be
built/procured before a real launch. This pack complements (does not replace)
`docs/07-security-privacy.md` (production security design) and
`docs/audit/06-postgres-rehearsal.md` (data-layer migration drill).

---

## 1. Data inventory & lawful bases (GDPR Art. 6 / Art. 9)

Schema at review time: `prisma/schema.prisma`, **44 models**. Groups below follow
the bounded-contexts split (`docs/audit/05-bounded-contexts.md`). All user-owned
rows carry `userId` FK → `User` with `onDelete: Cascade` unless noted.

| Group | Models | Data categories | Lawful basis (Art. 6) | Special category (Art. 9) handling | Retention today (honest) | Production task |
|---|---|---|---|---|---|---|
| Identity & session | `User`, `Session`, `Entitlement`, `Preference` | email, name, locale, role, password hash (scrypt), session tokens, plan, UI prefs (stage/goals/units) | **Contract** (account + service delivery, Art. 6(1)(b)) | none | Rows live until account deletion (`POST /api/privacy/delete` cascades). Sessions expire by `expiresAt` (7d) and are revoked by logout-all/per-session DELETE; **no expired-session sweep cron exists** | Retention cron for expired `Session` rows; email/name change flow (see §3) |
| Age gate / consent | `Consent` | termsVersion, privacyVersion, feature-scoped consent flags (`dataProcessing`, `healthAnalytics`, `marketing`, `familySharingAck`, `emailReminders`), `withdrawnAt`, **`birthYear` (self-declared year only), `ageConfirmedAt`** | **Consent** (Art. 6(1)(a)) for feature-scoped flags; contract for the core ToS acceptance record. Age-gate fields: legal obligation re: minors' access rules + consent | Birth-year alone is designed to be **non-health, low-intrusion**; no full DOB stored (§6) | Deleted with account cascade. Withdrawal (`withdrawnAt`) is stamped and never auto-reset by the consent API | Versioned notice history (currently a single `termsVersion: "1.0"` string — no per-version consent ledger); re-consent-after-withdrawal flow (comment in the consent route marks this "Phase 3") |
| Pregnancy health data | `Pregnancy`, `GestationalDating`, `PregnancyEvent`, `SymptomEntry` (incl. weight, BP, kick counts, notes), wellness trackers `NutritionEntry`, `ExerciseEntry`, `SleepEntry`, `MoodEntry`, `BirthPlanItem`, `ContractionEntry`, `FeedingEntry`, `BabyCareEntry` | Health data (Art. 9(1)) — pregnancy timeline, symptoms, vitals, mental-health mood self-reports | **Explicit consent** — `Consent.dataProcessing` accepted at registration + `healthAnalytics` flag for analytics use; processing is strictly user-initiated and user-scoped | Art. 9(2)(a) explicit consent. `healthAnalytics` defaults **false**; the analytics processor path is consent-gated | Deleted with account cascade. No per-record TTL exists | Production retention schedule (e.g. N-year purge of dormant accounts) — needs a cron + policy decision |
| Journal | `JournalEntry` | Free-text diary + mood enum — often reveals health context (Art. 9(1)) | Explicit consent (same consent stack as above) | Art. 9(2)(a) | Cascade-deleted with account; per-entry DELETE exists (`/api/journal`), **no per-entry edit** (rectify = delete + re-create) | Per-entry edit endpoint (rectification UX) |
| Medical records | `MedicalDocument` | Metadata only (title, category, fileName, fileType, sizeKb, notes) — **file bytes are not stored in this build** | Explicit consent (health data context) | Art. 9(2)(a) | Cascade-deleted with account | Object storage + signed URLs (Wave 5 residual 5.6) and its retention policy |
| Community | `CommunityPost`, `ModerationAction` | **Pseudonymous by design** (`authorAlias`), post body, topic, language, moderation state/notes | **Legitimate interest** (Art. 6(1)(f)) for operating/moderating the community + consent to post | Post bodies may voluntarily contain health context — moderation policy treats them as sensitive; AI moderation + human queue | Cascade-deleted with account. Removal decisions (`REMOVED` + note) persist while account exists | Anonymization-on-delete option for post history (keep threads coherent without identity) |
| Family sharing | `PartnerAccess` | Grantor/partner links, scope of shared records | **Consent** — explicit per-grant + `familySharingAck` | Shared health data only with an explicitly granted partner | Cascade-deleted with either account's deletion | Partner-side notification on revocation |
| Payments | `Subscription`, `Payment`, `Invoice`, `Refund` | Plan, status, amount (minor units), currency, provider (`SANDBOX` today), `providerRef`, idempotency keys. **No card data ever touches NIVA** (PSP-hosted flow, ADR-008) | **Contract** + **legal obligation** (Art. 6(1)(c)) for accounting records | none | **Cascade-deleted with the user account today** — this conflicts with statutory accounting-retention duties | Redesign: on erasure, anonymize (not delete) financial rows and retain for the statutory period [verify with counsel for jurisdiction-specific period] |
| AI assistant | `AIConversation`, `AIMessage` (user prompts + assistant answers with citations), `AIUsageLog`, `SafetyEvent` | Chat content (can include health context, Art. 9(1)); usage telemetry is **PHI-free by construction** | Contract for the feature; explicit consent stack for health processing; legitimate interest for abuse/safety telemetry | Content minimized upstream (§5): prompt budget 6 000 chars, completion 2 000, daily LLM-call cap (default 30), safety-level gating, injection screening | Conversations cascade-deleted; exportable via the export route; no per-conversation delete today | Per-conversation delete; `AIUsageLog` TTL cron (today: grows unbounded, content-free rows only) |
| AI observability | `AIUsageLog` | HMAC-SHA256(userId)[0:24], char counts, latency, top-k retrieval **scores** (no text), stable error codes, provider name | Legitimate interest (service quality/security) | Designed **non-sensitive**: verified no message content, no raw ids, no emails (see `src/lib/ai-observability.ts` header + Wave 3 verification) | Retained indefinitely (content-free) | TTL cron; salt rotation procedure (salt in `NIVA_AI_OBS_SALT`) |
| Notifications | `Notification`, `PushSubscription` | Title/body (service messages), scheduledFor/sentAt, channel; push: endpoint URL + WebPush keys + locale | Contract (service messages); consent for EMAIL channel (`Consent.emailReminders`) and for push (subscribe action) | none by design; reminder titles are user-authored (could reference health) | Per-row DELETE in the bell UI; cascade with account | Push pipeline completion (in flight — see §5); push-token TTL/refresh policy |
| Audit & security | `AuditEvent`, `SafetyEvent`, `Incident` | Action, entity, **ip**, metadata JSON (emails only as sha256[0:16] hash), safety type/severity/detail | **Legal obligation** (accountability, Art. 5(2)) + legitimate interest (fraud/abuse prevention) | Safety `detail` may include red-flag symptom context for clinical-safety response | **Retained deliberately**: `AuditEvent.actor` and `SafetyEvent.user` are `onDelete: SetNull` — account deletion nullifies identity but keeps the trail (documented in the delete route comment) | IP retention period + hash-at-rest decision [verify with counsel]; audit TTL policy |
| Support | `SupportTicket`, `TicketMessage` | Subject, category (incl. PRIVACY), message bodies | Contract (support delivery) | Bodies may contain health context volunteered by the user | Cascade-deleted with account | Support-agent data-handling training + redaction norms |
| Platform/content (no personal data) | `EducationalContent`, `ScientificSource`, `AnatomicalAsset`, `ClinicalReview` (reviewer identity only), `Setting`, `LandingMetric` | Curated content, review states, aggregate daily counters (`LandingMetric`: day/name/variant/count — **no user id, no IP, no UA, no cookies**; consent-gated client-side, verified in `/api/analytics/landing`) | Content ops; legitimate interest for aggregate analytics | none | n/a | n/a |

Lawful-basis summary: NIVA's processing posture is **consent-forward** —
registration creates the `Consent` row (`dataProcessing: true`,
`termsVersion/privacyVersion: "1.0"`), feature-scoped flags default to the
private state (analytics/marketing/email **false**), and withdrawal is a
first-class API semantic (`withdrawnAt`, never silently reset). Where consent is
the basis, withdrawal also means the feature stops (EMAIL channel checks
`Consent.emailReminders` at send time in the scheduler).

### Retention — the honest picture

What exists today: user-initiated **erasure** (full account cascade), per-row
deletes (journal, sessions, notifications), session expiry metadata, and
consent withdrawal. What does **not** exist: any automatic retention cron
(expired sessions, AIUsageLog, audit IP, dormant accounts). Production needs a
scheduled purge job per the table above before launch.

---

## 2. Data subject rights runbook (GDPR Ch. III)

| Right | Implementation today (verified) | Route / mechanism | Residual |
|---|---|---|---|
| **Access / portability** (Art. 15/20) | `GET /api/privacy/export` → single JSON download, `format: "NIVA export v1 (JSON)"`, audited (`DATA_EXPORT`), **free for every account** (no 402 paywall — the settings UI comment historically allowed one; the route itself never gates). Payload: account, consent, pregnancies (+events, datings), symptomEntries, journalEntries, appointments, reminders, medicalDocuments, aiConversations (+messages) | `src/app/api/privacy/export/route.ts`; UI: Settings → "Export my data (JSON)" | Export **omits** newer groups: wellness entries, birth-plan/contraction/feeding/baby-care, notifications, community posts, subscriptions/payments → production task to extend the export payload |
| **Erasure** (Art. 17) | `POST /api/privacy/delete` → audit (`ACCOUNT_DELETE`, emailHash only) → destroy all sessions → `user.delete()`. **All** `userId` FK relations cascade (including payments/invoices — see residual). Audit/Safety rows persist with identity **SetNull** | `src/app/api/privacy/delete/route.ts`; UI: Settings → destructive confirm dialog (USER role only) | Financial-row cascade conflicts with accounting retention (§1); add pre-delete export prompt in UI (nice-to-have); delete drill in §8 |
| **Rectification** (Art. 16) | Password change with re-auth (`POST /api/auth/password`); today's symptom entry is upsert/replace semantics (correctable); journal entries deletable; consent flags toggleable live | `src/app/api/auth/password`, `/api/tracking`, `/api/journal`, `/api/privacy/consent` | **No email/name change endpoint exists** (verified: the only `user.update` in the codebase is the password change). Production task: profile-edit route with email re-verification |
| **Objection / restriction** (Art. 18/21) | Consent withdrawal: `POST /api/privacy/consent {"withdraw": true}` → `withdrawnAt = now`, audited (`CONSENT_WITHDRAWN`), never auto-reset; feature-scoped flags (analytics/marketing/email) each withdraw independently | `src/app/api/privacy/consent/route.ts` | Re-consent flow is explicitly deferred (Phase 3 comment in route) — today a withdrawn user toggling flags again does **not** clear `withdrawnAt` |
| Response SLAs | Not implemented (no ticketing SLA timer) | — | Define: GDPR one month, extendable +2 [verify with counsel]; track via `SupportTicket` category PRIVACY |
| Identity verification of the requester | Today the rights are **self-service over an authenticated session** (password/session = authenticator) — strong binding, no support-agent impersonation path in code | — | For support-mediated requests: define verification steps (e.g. confirmed email + in-app message) before manual action |

Rate limiting protecting these endpoints: auth routes 5 req/min (`register`),
export/delete run behind session auth (no separate quota today) — production
should add per-account DSR quotas.

---

## 3. Data residency — ADR-012

**Decision (recommended): primary hosting in an EU datacenter (GDPR single
market), with an explicit re-evaluation gate for an Iran datacenter once
Iranian data-protection law is finalized and NIVA establishes an Iranian legal
presence.** Status: PROPOSED — ratify before production provisioning.

Context: primary market is Persian-speaking (fa/RTL first-class). Target users
are in Iran; the service also must be reviewable under GDPR the moment any EU/
UK user or processor relationship exists.

| Option | Latency for Iranian users | Data-localization expectations | GDPR posture | Operational tradeoffs |
|---|---|---|---|---|
| **Iran datacenter** (e.g. Tehran) | **Best** (domestic routes, no international transit instability) | Best aligns with localization nudges in Iranian drafts/sectoral rules and with `eNamad`-style trust signals [verify current legal force with counsel] | NIVA would be controller established **outside** the EU → still GDPR Art. 3(2) obligations for EU users; transfers *into* Iran of EU users' data are the problem (no EU adequacy decision for Iran) → would need **geo-separation**: EU users' data never lands in the Iranian region | Sanctions/payment-rail complexity, hardware procurement, provider maturity for managed Postgres; disaster-recovery planning is on us |
| **EU datacenter** (recommended) | Acceptable: 80–200 ms RTT typical; static assets via CDN + the PWA shell mitigate (Wave 6.5) | No localization issue for EU; Iranian users' data leaving Iran is the open question under drafts [verify with counsel] — mitigation: document Transfers Impact Assessment, offer data-minimization (already strong: year-only age gate, PHI-free AI telemetry) | **Cleanest**: controller/processor both in GDPR single market; SCCs only for the few processors outside (§4) | Managed Postgres/backup ecosystem mature (`docs/audit/06-postgres-rehearsal.md` targets Postgres); sanctions screening still applies to some EU clouds for Iranian customers — choose provider accordingly |
| **US datacenter** | Worst latency (200 ms+); no regional benefit for the target market | Weakest alignment with Iranian localization expectations; CLOUD Act access concerns for both EU and Iranian stakeholders | Lawful but heaviest transfer machinery (EU→US relies on the adequacy framework/DPF for certified processors — processor-by-processor check [verify with counsel]) | Easiest managed ecosystem, but zero product reason to prefer it |

Rationale for EU-primary: (1) it is the only option that is simultaneously
lawful-default for EU exposure and defensible for Iranian users under either
residency outcome; (2) the **Postgres migration dependency** must land before
*any* production hosting decision — the rehearsal plan and go/no-go gates are
already documented in `docs/audit/06-postgres-rehearsal.md` (SQLite sandbox →
Postgres, `prisma migrate deploy`, row-count parity, verify-contracts 19/19,
p95 budget, rollback < 30 min box). Residency choice is meaningless until that
cutover executes; (3) an Iran-region replica can be added later as a
read/localized-deployment cell without re-architecture (bounded contexts keep
user data partitionable by deployment cell — `docs/audit/05-bounded-contexts.md`).

Consequences: DPA chain signed with the EU host; backups stay in-region;
`NIVA_DISABLE_DEMO=true` and seeded demo accounts never ship to production
either way.

---

## 4. International transfers & processors

Processors/sub-processors that touch user data in this build (verified against
code; sandbox state honest):

| Processor | Touches | Data | Minimization in place | Transfer machinery (production) |
|---|---|---|---|---|
| **AI provider** (z-ai SDK, server-side only — `src/lib/ai-gateway.ts`) | AI chat | The **prompt text** the user sends (may include health context) + retrieved KB context | Server-side key (never client); prompt budget 6 000 chars / completion 2 000; daily LLM-call cap (default 30); deterministic/template fallbacks answer without any LLM; **telemetry stored about these calls is PHI-free** (HMAC user hash, char counts, scores — no content); cache keyed on SHA-256 of normalized question; KB retrieval happens locally — the KB is not sent out | SCCs (or provider DPA + adequacy where applicable) [verify with counsel]; TIA; consider EU-hosted model endpoint at production |
| **Email transport** (SMTP_URL, **dormant in sandbox**) | Notifications | Recipient email (already stored for identity), message body (appointment/reminder nudges, localized) | Hard consent gate `Consent.emailReminders` checked at send time; zero EMAIL rows exist unless SMTP_URL is configured (verified in Wave 4: consent on + no transport → `emailTransportConfigured: false`, no rows) | ESP DPA; SCCs if outside EEA [verify with counsel] |
| **Push service** (Web Push; `PushSubscription` model) | Notifications | Endpoint URL + WebPush public keys (`p256dh`, `auth`) + locale — **no payload content in our DB**; payloads are constructed at send time | Consent = explicit subscribe action; locale copied at subscribe time | Standard Web Push protocol to the browser vendor's push service (Google/Apple/Mozilla) — covered by their terms; payload encryption (p256dh) built into the protocol. Pipeline completion is in flight in the parallel Wave 6.5 work stream (model + client/server helpers present; **treat as unverified until that stream merges**) |
| **PSP** (payments) | Subscription | Today `provider: "SANDBOX"` — **no real PSP integrated, no card data, no money movement**. Webhook endpoint verifies HMAC-SHA256 signature (403 `BAD_SIGNATURE` + `PAYMENT_ANOMALY` safety event on failure) | Server-side PSP abstraction (ADR-008): client never touches signing; NIVA stores only ids/amounts/status | At production: Zarinpal (Iran rails) and/or Stripe (EU) each need their own DPA; data differs per rail → per-rail mapping in the DPIA [verify with counsel] |
| **Hosting/DB** | Everything | §3 decision governs | — | In-region by construction after ADR-012 |
| **No third-party web analytics / ad SDKs** | Landing | Aggregate counters only (`LandingMetric`: day/name/variant/count), consent-gated client-side, verified in `/api/analytics/landing` (no uid/IP/UA/cookies accepted) | Already anonymous | none needed |

Cross-border summary: today, in the sandbox, the only off-box processor is the
AI provider (chat content) — and its telemetry is PHI-free. The production
transfer map must be signed off together with ADR-012.

---

## 5. Age gating & minors

**Implemented today (verified in `src/app/api/auth/register/route.ts`):**

- Registration requires `birthYear` — zod `int, min 1900, max currentYear`.
  Age computed as `currentYear − birthYear`; **`< 13` → `403 AGE_BLOCKED`** with
  a bilingual (fa+en) message, **before any user/consent row is created** (hard
  block, explicit by design — nothing to enumerate because nothing exists).
- The same rate limit as the rest of the route applies (5/min per IP).
- On success the `Consent` row is created with `birthYear` +
  `ageConfirmedAt = now` alongside `termsVersion/privacyVersion` and
  `dataProcessing: true`.
- The consent API (`GET/POST /api/privacy/consent`) exposes
  `birthYear`/`ageConfirmedAt` **only** to the authenticated owner's GET; the
  POST schema deliberately omits both fields, so a client can never forge or
  alter an age confirmation. **No admin route reads the `Consent` model at all**
  (verified by grep over `src/app/api/admin/*` and `admin-view.tsx`: zero
  references) — administrators can therefore never see a minor's birth year;
  there is also no admin surface that exposes `ageVerified`. Settings shows the
  owner a verification chip ("سن تأیید شده: ۱۳+ / Age verified: 13+" with the
  `ageConfirmedAt` date localized; the year itself is intentionally **not**
  displayed — data minimization in the UI too).
- Client (`src/components/views/auth-view.tsx`): 4-digit numeric input,
  `inputMode="numeric"`, `autoComplete="bday-year"`, accepts Persian (۰-۹) and
  Arabic (٠-٩) digits normalized to Latin before submit; client pre-checks
  mirror the server (`auth.ageInvalid`, `auth.ageUnder13`); the privacy note
  (`auth.ageNote`) is shown inline with the field.

**Why year-only (privacy-minimal design):** collecting the full date of birth
would create a durable quasi-identifier for every user to solve an edge case.
Year-only arithmetic can admit a user who turns 13 later in the current year;
that one-sided bias is accepted deliberately (documented in the route). No full
DOB is ever requested, stored, or transmitted.

**Legal floors:** US COPPA directs the 13-year floor for collecting personal
information from children (self-declaration is not a COPPA-compliant
verification method for *actually serving* under-13s — but NIVA blocks them
outright, so no child data is collected). The GDPR requires parental consent
for information-society services offered to children below 16, with member
states able to lower the threshold to 13 [verify with counsel per deployment
member state].

**Demo bypass (documented honestly):** the seeded demo account
(`demo@niva.health`, `prisma/seed.ts`) **bypasses the age gate** — it is
pre-provisioned by seed with a `Consent` row that has **no** `birthYear` and
**no** `ageConfirmedAt` (the settings chip correctly renders "Age not
verified" for it). Rationale: it is a non-privileged sandbox demonstration
account containing scripted demo rows, no real child's data exists, and the
endpoint is hard-gated off in production via `NIVA_DISABLE_DEMO=true`
(verified in `src/app/api/auth/demo/route.ts`).

**Production tasks:** (1) jurisdiction-configurable `MIN_AGE` (13–16) per
deployed region; (2) parental-consent flow for minors where the deployed
jurisdiction requires it (verifiable-guardian step) — out of sandbox scope;
(3) age re-attestation is unnecessary since year-only data never goes stale.

---

## 6. Iran target-market notes (neutral, factual)

- **Legislative status:** Iran has had a comprehensive personal-data protection
  bill (لایحه حفاظت از داده‌های شخصی) in the legislative pipeline since it was
  submitted to the government/parliament process in 2021–2022. Its final text,
  entry into force, and enforcing authority have been in flux; this pack
  deliberately avoids quoting article numbers from a moving draft.
  **[verify with counsel at launch — determine the enacted text, scope, and
  whether NIVA falls under it as a domestic or foreign processor.]**
- **General expectations reflected in the drafts/sectoral practice:** defined
  lawful bases for processing, data-subject rights (access/correction/erasure)
  broadly analogous to GDPR, localization nudges for certain categories
  (identity/financial data are the recurring examples — pregnancy-wellness data
  is not explicitly named in public drafts), and registration/licensing touches
  for data processors [verify with counsel].
- **Trust marks / e-commerce:** Iranian consumers expect the national
  e-commerce trust symbol (اینماد / eNamad) and, for payments, integration with
  domestic PSP rails (e.g. Zarinpal — already the named non-sandbox provider
  enum in the `Subscription` model). eNamad listing is a practical trust
  prerequisite for Iranian traffic and conversion, independent of data law
  [verify current issuance requirements].
- **How ADR-012 accounts for this:** EU-primary hosting keeps the platform
  GDPR-clean now; the bounded-context split keeps user data partitionable so an
  Iran-region cell can be added if the enacted law (or market reality) demands
  local residency. The payment model already carries a provider enum
  (`SANDBOX | ZARINPAL | STRIPE`) matching a dual-rail future. Persian-first
  RTL product surface (fa locale, Vazirmatn typography) reduces the risk of
  de-facto exclusion of the primary market while the legal posture settles.
- **Sanctions/compliance reality check:** infrastructure procurement, payment
  rails, and even cloud-vendor terms for Iranian customers carry sanctions
  screening complexity that no schema change can fix — flag for the business
  workstream, not engineering. [verify with counsel]

---

## 7. DPIA trigger note (informational)

Large-scale processing of Art. 9 health data of a vulnerable audience → a DPIA
is mandatory under GDPR Art. 35 before production launch. The inventory (§1),
residency decision (§3), transfer map (§4), and minors analysis (§5) are the
raw material for it. Production task: appoint DPO/contact, run the formal DPIA
[verify with counsel].

---

## 8. DSR / deletion drill (ops runbook — run before launch)

Operational self-check in the spirit of `scripts/verify-contracts.ts` (19/19
contract gate) and `scripts/ai-eval/run-eval.ts` — **not unit tests**; run
against a scratch database, record the transcript. Every command below was
executed for Wave 6.4 evidence (§9); automate as `scripts/verify-privacy.ts`
in production onboarding.

1. **Create** — `POST /api/auth/register` with a clearly-marked test email,
   `birthYear: 1994` → expect `201` + token. *(Negative gate:* repeat with
   `birthYear: 2020` → expect `403 AGE_BLOCKED`; `POST /api/auth/login` with the
   same email must return `401` — proves no row was created.)*
2. **Verify consent persistence** — `GET /api/privacy/consent` with the token →
   expect `birthYear: 1994` and `ageConfirmedAt` non-null, `withdrawnAt` null.
3. **Seed activity** — add a pregnancy + journal entry + AI conversation
   through the normal API so cascades have something to cascade.
4. **Export** — `GET /api/privacy/export` → expect JSON with all §2 groups
   populated; spot-check the journal text appears (portability evidence).
5. **Withdraw** — `POST /api/privacy/consent {"withdraw": true}` → expect
   `withdrawnAt` set; re-GET confirms it persists after a preference toggle.
6. **Delete** — `POST /api/privacy/delete` → expect `{ ok: true }`; the session
   is now dead (any authed call → `401`).
7. **Verify DB cascades** — read-only Prisma query (e.g.
   `bun -e "…prisma…"`): `user`, `consent`, `pregnancy`, `journalEntry`,
   `aIConversation`, `session` counts for that id == 0; `auditEvent` rows for
   the actions still exist with `actorId == null` (SetNull retained-trail
   design, §1).
8. **Record** — append the transcript (statuses + counts) to the ops log; any
   deviation is a launch blocker.

---

## 9. Verified routes appendix (code cross-check for this pack)

| Route | Files read | Claim supported |
|---|---|---|
| `POST /api/auth/register` | `src/app/api/auth/register/route.ts` | Age gate, 403 `AGE_BLOCKED`, rate limit 5/min, consent creation with `birthYear`+`ageConfirmedAt` |
| `POST /api/auth/demo` | `src/app/api/auth/demo/route.ts` | Demo bypass rationale, `NIVA_DISABLE_DEMO` hard gate, USER-role integrity guard |
| `GET/POST /api/privacy/consent` | `src/app/api/privacy/consent/route.ts` | Own-row-only GET (owner sees `birthYear`), POST cannot mutate age fields, `withdrawnAt` semantics, audit |
| `GET /api/privacy/export` | `src/app/api/privacy/export/route.ts` | Portability payload + format + audit + free-for-all |
| `POST /api/privacy/delete` | `src/app/api/privacy/delete/route.ts` | Erasure flow, session destruction, cascade claim, audit SetNull retention |
| `GET/DELETE /api/auth/sessions`, `POST /api/auth/logout-all`, `POST /api/auth/password` | routes + `src/lib/auth.ts` | Session rights, password rectification, `hashEmail` (sha256[0:16]) |
| `GET /api/auth/me` | `src/app/api/auth/me/route.ts` | `/me` returns no consent fields (age data not leaked through profile) |
| `POST /api/analytics/landing` | `src/app/api/analytics/landing/route.ts` | Aggregate-only analytics claim |
| `POST /api/subscription/webhook` | `src/app/api/subscription/webhook/route.ts` | HMAC signature enforcement, `PAYMENT_ANOMALY` on failure |
| `src/app/api/admin/**` (grep) + `admin-view.tsx` | — | **Zero** references to `Consent`/`birthYear`/`ageConfirmedAt` — no admin exposure of minors' data |
| `src/lib/ai-gateway.ts`, `src/lib/ai-observability.ts`, `src/lib/ai-cache.ts` | — | Prompt/completion budgets, daily cap, PHI-free telemetry, hashed cache keys |
| `src/lib/rate-limit.ts`, `src/lib/api.ts` | — | Rate-limit + shared envelope/CSRF/ceiling claims |
| `prisma/schema.prisma`, `prisma/seed.ts` | — | 44 models, cascade/SetNull map, demo seeding without age fields |
| `docs/audit/06-postgres-rehearsal.md`, `docs/audit/05-bounded-contexts.md`, `docs/audit/03-adrs.md` | — | ADR-012 dependency chain, ADR numbering (010 was last — 012 assigned here, 011 reserved for API versioning per Wave 5 notes) |

*Prepared by Wave 6.4 (task wave6-d). Review triggers: production hosting
decision, any new processor, any change to the Consent model, and the enacted
Iranian data-protection text.*
