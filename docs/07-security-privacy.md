# NIVA — Security & Privacy Architecture

| Field | Value |
| --- | --- |
| Document | 07-security-privacy.md |
| Version | 1.0 (architecture baseline) |
| Task | 2-a |
| Related | 02-data-model.md §12–§14, 03-api-spec.md §1–§3, 06-medical-safety.md, 08-ai-evaluation.md §6, 10-backlog-risk.md |

Reference posture: OWASP ASVS Level 2 is the production target; OWASP Top 10 categories are
mapped in the backlog. The current sandbox build implements the core of this document and
carries a small, honestly listed set of gaps (§14).

## 1. Threat model summary (STRIDE highlights)

| Threat | Relevant asset | Current posture |
| --- | --- | --- |
| Spoofing | Session cookies | Opaque server-side tokens, HttpOnly + SameSite=Lax, rotation on login, logout-all; password scrypt hashing |
| Tampering | API inputs, payment webhooks | zod validation on every body; HMAC-verified payment webhook; idempotency keys |
| Repudiation | Privileged actions | Append-only AuditEvent on auth, review, moderation, privacy, entitlement actions (02 §14) |
| Information disclosure | Health data, other users' rows | Ownership-scoped queries (§4), least-privilege role guards, error envelope without internals; LLM never receives other users' data |
| Denial of service | API availability | In-memory per-IP/per-route rate limits; AI stricter quota; single-node caveat (§14) |
| Elevation of privilege | Roles | Role checks server-side in every privileged handler; admins cannot approve own drafts (06 §7) |
| Prompt injection (AI-specific) | LLM answers, citations | Heuristics + instruction hierarchy + output validation; no tool execution from model output (§9) |

## 2. Authentication design

- Registration: email + password; scrypt with per-user random salt; password policy
  (minimum length 8; no composition rules that hurt usability); duplicate email → 409.
- Sessions: opaque random token; stored as sha-256 hash; cookie `HttpOnly; SameSite=Lax;
  Secure (behind TLS); Path=/`. Expiry with sliding window; expired sessions rejected as
  `SESSION_EXPIRED`.
- Rotation: every login issues a new token and revokes the old; logout revokes current;
  logout-all revokes all rows for the user.
- Brute force: login/register limited to 10/min/IP (in-memory), plus audit of failed
  logins. Account lockout and MFA are documented gaps (§14).
- No OAuth/social login at launch (ADR-003).

## 3. Authorization model

- RBAC: `USER`, `CLINICAL_REVIEWER`, `ADMIN`. Each handler declares its required role
  (`03-api-spec.md`); guards run before any data access.
- Object-level ownership: every user-scoped query includes `where: { userId: session.user.id }`
  (or verifies the row's owner) — IDOR prevention is a query-shape rule, not a UI rule.
  Cross-context reads (partner viewing a timeline) require an ACTIVE PartnerAccess grant
  with the specific permission flag, checked server-side on every request.
- Privileged separation: CLINICAL_REVIEWER can act only in the review queue; ADMIN can act
  in moderation/users/metrics but cannot approve clinical content alone.
- Entitlements: feature gates resolve server-side from the Entitlement table (ADR-006);
  the client's gates are cosmetic.

## 4. Input validation

- Every POST/PATCH/PUT body is parsed by a zod schema derived from the same types that
  generate responses; unknown fields are stripped; failures return 400 with field details.
- Query parameters are validated (pagination bounds, enum filters, week ranges).
- Identifiers in paths are format-checked; malformed ids → 404, not 500.
- Free-text lengths capped (chat 4,000 chars, journal 20,000, community 2,000).

## 5. Secure upload posture

Current build: documents are metadata-only (title/kind/notes) — no binary upload endpoint
exists, which is itself the safe posture for this stage. Target (module I completion):
pre-signed S3 uploads, size and MIME allowlist, server-side malware scan gate
(scanStatus CLEAN before visibility), antivirus + content-type sniffing, objects named by
UUID, private bucket, short-lived signed read URLs, download audit events.

## 6. Rate limiting and same-origin/CSRF posture

- Limits per `03-api-spec.md` §3; in-memory token buckets keyed by IP and (where authed)
  user; 429 + `Retry-After`; AI daily quota by plan.
- Mutations require same-origin (Origin/Referer check) + JSON content type + SameSite=Lax
  cookie. Combined with no state-changing GETs and no cross-site form posts, this is the
  CSRF strategy; a traditional token is unnecessary under these constraints and is noted as
  such for reviewers.
- Production target moves buckets to Redis so limits survive restarts and scale horizontally.

## 7. Secrets management

- Secrets live in environment variables; `.env` is not committed; the LLM gateway key is
  read only in server code. Payment credentials do not exist in the sandbox (ADR-006).
- Target: managed secret store, rotation policy, per-environment separation, no secrets in
  logs (log scrubbing in the audit helper).

## 8. Encryption boundaries

In transit: TLS terminated at the gateway; HSTS expected; internal sandbox traffic is local.
At rest: per `02-data-model.md` §13 — passwords scrypt-hashed; sessions hashed; SQLite file
unencrypted in the sandbox (host disk only, honest gap); target adds volume encryption plus
application-level envelope encryption for journal bodies, symptom notes, and document notes
with KMS-managed keys. Backups (target) are encrypted; current file backups must be stored
with host-only permissions.

## 9. Prompt-injection defenses

1. Input heuristics: known instruction-override phrasings in fa/en ("ignore previous
   instructions", "you are now", system-prompt mimicry) are flagged; high-confidence
   injection attempts get a safe refusal without an LLM call, others get the standard
   grounded pipeline with hardened instructions.
2. Instruction hierarchy: system contract (06 §5) is prepended at call time; retrieved
   documents are delimited as data, never as instructions; user content is delimited as
   untrusted.
3. Output validation: answers are checked for forbidden behaviors (diagnosis, dosing,
   fabricated citations — citation ids must exist in the retrieved set).
4. No tool execution: the model cannot trigger actions (payments, deletes, emails);
   its only effect is the reply text.
5. Regression cases in `08-ai-evaluation.md` §6 lock these behaviors in.

## 10. Consent and lawful-basis model

- Purposes recorded per user (02 §2): DATA_PROCESSING (contract/legitimate operation),
  AI_ASSISTANT, COMMUNITY, PARTNER_ACCESS, ANALYTICS (target, opt-in). Consent rows are
  append-only history with policy version.
- Health-adjacent data is minimized: the platform stores what tracking requires; AI
  conversations store only what the user sends; no third-party trackers (no analytics SDKs
  in the current build).
- Withdrawal: consent switches in Settings (v-settings) call the privacy API; withdrawal of
  COMMUNITY/AI purposes disables the corresponding features immediately; DATA_PROCESSING
  withdrawal equals account deletion.
- The GDPR-style mapping (lawful bases, DPIA trigger, residency) is a scoping question for
  qualified counsel (06 §12), not a self-certification.

## 11. Data export and deletion workflows

- Export (`GET /api/privacy/export`): JSON archive of owned data per
  `03-api-spec.md` §4.15; rate-limited; audited; format versioned (`niva.export.v1`).
- Deletion (`POST /api/privacy/delete`): password-confirmed request → grace period →
  cascade per retention rules (02 §12): user content purged; financial rows anonymized but
  retained; SafetyEvents and AuditEvents retained with pseudonymized actor ids; community
  posts tombstoned. Final state verifiable via admin tooling.
- Partner grants die with the owner's account; partners lose access immediately upon
  revocation or owner deletion.

## 12. Dependency and supply-chain path

Current: lockfile (bun.lock) pinned; manual review when adding packages; LLM SDK isolated
behind server-only import boundaries. Target: `npm audit`/renovate-style update automation
in CI, license scanning, build SBoM, and a policy that health-critical dependencies require
a documented review in the worklog. No automated scanner runs in this sandbox (§14).

## 13. Backup and DR

Per `02-data-model.md` §15: current SQLite file backup with documented restore drill;
target managed PITR (RPO ≤ 5 min, RTO ≤ 1 h) with quarterly drills. DR runbook content
(who/what/order) is part of the production phase backlog.

## 14. Known gaps in the current sandbox (honest list) and remediation plan

| # | Gap | Why it matters | Remediation (backlog ref) |
| --- | --- | --- | --- |
| 1 | No MFA for privileged accounts | ADMIN/REVIEWER takeover impact | TOTP for ADMIN + CLINICAL_REVIEWER in production phase (10-backlog-risk.md, Phase 9+) |
| 2 | In-memory rate limiting | Resets on restart; no cross-node view | Redis-backed buckets with the production infra phase |
| 3 | Single-node deployment | Availability SPOF; DoS blast radius | Stateless deploy + LB + managed services (Phase 9+) |
| 4 | SQLite unencrypted at rest; file backups manual | Data-at-rest exposure on host compromise | Managed Postgres w/ encryption + PITR; application-level field encryption (02 §13) |
| 5 | No CSP/security headers management in sandbox | XSS blast-radius reduction missing | Header policy (CSP, frame-ancestors, referrer) at gateway in hardening phase; fonts CDN pinned |
| 6 | No dependency scanner in CI | Vulnerable-dep risk | Audit automation per §12 |
| 7 | No automated security tests | Regressions possible | ASVS-mapped checklist (09 §7) now; automated contract + security tests with OpenAPI work (03 §6) |
| 8 | Session fixation surface minimal but no device/IP binding | Token theft from logs/hosts | Token hashing already; add re-auth for sensitive ops (delete account, checkout) in hardening phase |
| 9 | Penetration testing not performed | Unknown unknowns | Professional pen test before public launch (06 §12 adjacency; Phase 9+) |
| 10 | Logs may contain IPs/user agents | Privacy minimization | Retention + scrubbing policy with audit storage target |

Each gap is also a row (or feeding row) in `10-backlog-risk.md`; nothing on this list is
secret or de-scoped silently.
