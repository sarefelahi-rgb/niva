# Release Checklist & Launch Operations — NIVA

Wave 6.6 · Status: **PLAN + DRILL SCRIPTS (sandbox-authored, not executed against production)**

This document is the single launch gate. It consolidates every operational
artifact produced in Waves 0–6 and states, per item, what is **verified** vs
what remains a **production action**. Nothing here may be marked done without
evidence linked below it.

---

## 1. Environment parity (dev → staging → production)

Every environment variable must exist in all three environments with the same
name; only values differ. `.env.example` is the canonical list. Current
inventory (verified against code, Wave 0–6):

| Variable | Purpose | Sandbox state | Prod action |
|---|---|---|---|
| `DATABASE_URL` | SQLite (sandbox) / Postgres (prod) | set (file: `db/`) | provision Postgres; run §4 drill |
| `SCHEDULER_SECRET` | scheduler mini-service ↔ tick auth | **MISSING in sandbox env files** (tick works via admin session; mini-service must hold the same value) | generate 32-byte hex; set in app + service |
| `NIVA_PAYMENT_WEBHOOK_SECRET` | PSP webhook HMAC (fail-closed 503 when unset) | set (dev-only value) | rotate; register webhook URL at PSP |
| `NIVA_PSP` + PSP credentials (`NIVA_ZARINPAL_MERCHANT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) | adapter selection | unset → SandboxAdapter guaranteed | set only after §6 clinical sign-off; see docs/audit/10-psp.md §7 |
| `NIVA_PUSH_VAPID_PUBLIC_KEY` / `NIVA_PUSH_VAPID_PRIVATE_KEY` / `NIVA_PUSH_SUBJECT` | web-push | set (sandbox keypair) | generate production keypair; keys are env-only |
| `SMTP_URL` | appointment/reminder email twins | unset → EMAIL channel dormant (honest) | set via secrets manager |
| `NIVA_AI_RERANK`, `NIVA_AI_DAILY_LLM_CALLS` | AI cost controls | defaults | review per launch economics |
| `NIVA_LOG_LEVEL`, `NIVA_LOG_DB_QUERY` | observability floor | default info / false | keep DB query log OFF in prod (R-05) |
| `NIVA_SITE_URL` | metadataBase, sitemap | unset → localhost fallback (honest) | set to canonical URL |
| `PAYMENTS_MODE` | sandbox confirm route gate | `sandbox` | unset/`live` → client-confirm disabled by code |

**Parity rule:** a deploy is blocked if any env var used by `src/` is absent —
the route-level fail-closed pattern (503 CONFIG) is the enforcement backstop.

## 2. CI/CD (exists — Wave 5.5)

- `.github/workflows/ci.yml`: typecheck (strict, no suppression) → lint →
  prisma generate → schema push to throwaway DB → production build →
  `bun audit` (advisory) → secret scan → smoke job boots the app and runs
  `scripts/verify-contracts.ts` (19/19 must pass).
- `.github/dependabot.yml`: bun weekly, actions monthly.
- **Prod action:** branch protection on `main` (require CI green) — one-time
  GitHub settings task, cannot be done from the repo alone.

## 3. Deploy strategy — canary / blue-green

Chosen: **blue-green with a 10% canary soak** (single-container simplicity,
fast rollback; matches a small-team ops reality).

1. Deploy build `N` to the idle slot (blue/green).
2. Smoke: `/api/health`-equivalent (GET `/` 200 + `/robots.txt` 200 +
   `verify-contracts` against the staging DB).
3. Route 10% traffic to new slot for **30 minutes**.
4. Gates during soak (observability, §5): 5xx rate < 1%, p95 API latency
   within 20% of baseline, no new SAFETY events, `billing` tick reports
   `error` never.
5. Promote to 100%; keep old slot warm for 24h (instant rollback = re-point).
6. DB migrations are expand-only at deploy time; contract-changing migrations
   follow the §4 rehearsal (freeze → migrate → verify → go/no-go).

## 4. Database — backup/restore & migration drills

- Migration rehearsal (non-destructive, Postgres): **docs/audit/06-postgres-rehearsal.md**
  — freeze → export → migrate → 6 verify gates → go/no-go → rollback < 30 min.
  NOT yet executed (needs a real production environment + approval).
- **Backup drill** (`scripts/release-backup-drill.sh`, added this wave):
  nightly `pg_dump` → verify (row counts + checksum) → restore into a scratch
  DB → `verify-contracts` against restored data → report. First execution is a
  production action; the script is the drill.
- RPO 24h / RTO 30 min targets; restore rehearsal must be recorded with dates
  before launch sign-off.
- SQLite sandbox note: invoice counter uses a Setting row — Postgres swap must
  use the atomic counter variant documented in docs/audit/10-psp.md §3.3.

## 5. Observability (exists — Waves 5.3, 3.2)

- Structured JSON logs with source-level redaction; `x-request-id` tracing;
  per-process request counters; `/api/admin/platform-metrics` (uptime, status
  breakdown, top routes, 5xx rate); AI metrics `/api/admin/ai-metrics`;
  safety events + audit trail.
- **Prod action:** ship logs to an external sink (documented target; in-memory
  counters are per-process and reset on deploy), add uptime probe alerting.

## 6. Launch gate — ordered sign-offs

| # | Gate | Evidence required | State |
|---|---|---|---|
| 1 | Type/lint zero-suppression | CI green | ✅ enforced |
| 2 | API contract harness 19/19 | `docs/audit/api-contract-report.json` | ✅ passing (re-run each deploy) |
| 3 | AI eval 26/26 | `docs/audit/ai-eval-report.json` | ✅ passing (re-run on KB/prompt change) |
| 4 | a11y zero axe violations | `docs/audit/a11y-report.json` | ✅ passing (re-run per view change) |
| 5 | Bidi/formatting QA | `docs/audit/11-bidi-qa.md` | ✅ engine verified; screenshots = release task |
| 6 | Privacy pack | `docs/audit/07-privacy-pack.md` | ✅ authored; retention crons + DPA list = launch tasks |
| 7 | Store compliance assets | `docs/audit/09-store-compliance.md` | icons ✅; screenshots/feature-graphic = release task |
| 8 | PSP go-live | `docs/audit/10-psp.md` §7 runbook executed | ⬜ blocked on real credentials |
| 9 | DB migration rehearsal executed | 06-postgres-rehearsal §verify gates output | ⬜ needs prod env |
| 10 | Backup/restore drill executed | §4 script output + date | ⬜ needs prod env |
| 11 | **Clinical sign-off** | named reviewer + date reviewing: educational content, disclaimers, emergency-routing bypass, AI citations, asset review workflow (ClinicalReview rows) | ⬜ **REQUIRED before ANY paid-plan or public launch** |
| 12 | Legal sign-off (privacy/ToS, jurisdiction pack) | counsel review of 07-privacy-pack + terms versions | ⬜ |

Gate 11 scope (what the clinical reviewer must actually check):
1. Every educational surface carries the "not a medical device" disclaimer.
2. Emergency red-flag routing bypasses the AI entirely (safety-view paths).
3. AI answers show citations + refusal behavior for out-of-scope/unsafe asks
   (eval harness suites safety/refusal are the regression net).
4. 3D studio assets labeled educational; review state machine enforced.
5. No diagnosis/treatment claims anywhere (grep sweep + manual pass).

## 7. Post-launch (first 48h)

- Watch: platform-metrics 5xx, ai-metrics refusal/safety rates, payment
  anomalies (`logSafetyEvent PAYMENT_ANOMALY`), ticket queue, push failure
  ratio (removed/sent).
- Rollback trigger: any gate-4 regression, 5xx > 1% for 10 min, or a safety
  event cluster — re-point to the warm slot, then diagnose.

## 8. Honest state summary

What is **done** in this repo: CI gates, contract/eval/a11y harnesses,
observability, PSP abstraction with fail-closed webhooks, privacy pack,
store-compliance doc, this checklist, drill scripts.
What is **not done** (needs a production environment or external parties):
Postgres rehearsal execution, backup drill execution, real PSP credentials +
webhook registration, production VAPID/SMTP keys, screenshots for stores,
clinical + legal sign-offs, external log sink. None of these are faked by
sandbox code — every UI surface states its real state.
