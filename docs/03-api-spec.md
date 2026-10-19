# NIVA — API Specification (Authoritative Contract Catalog)

| Field | Value |
| --- | --- |
| Document | 03-api-spec.md |
| Version | 1.0 (architecture baseline) |
| Task | 2-a |
| Related | 01-system-architecture.md §8, 02-data-model.md, 06-medical-safety.md, 07-security-privacy.md |

This document is the **authoritative contract** the API implementation follows. Route
handlers under `src/app/api/*` implement this catalog; when code and contract disagree, one
of them is wrong and the discrepancy is fixed in both places (never only in one). Types are
TypeScript-style; every request body is validated with zod at the handler boundary.

## 1. Conventions

- Base path `/api`; JSON bodies and responses; `Content-Type: application/json` required
  for mutations.
- Authentication: opaque session token in an HttpOnly `SameSite=Lax` cookie
  (`niva_session`); the server maps it to a Session row (02-data-model.md §2).
- Mutation requests must pass a same-origin check (Origin/Referer match) — 403 otherwise.
- Roles: `USER`, `CLINICAL_REVIEWER`, `ADMIN`. "auth" below = any authenticated role;
  ownership checks are additional to role checks (07-security-privacy.md §4).
- All timestamps are ISO-8601 UTC strings.

## 2. Error envelope

```ts
type ErrorEnvelope = {
  error: {
    code:
      | "VALIDATION_ERROR"      // 400
      | "MALFORMED_REQUEST"     // 400
      | "UNAUTHENTICATED"       // 401 (no/invalid session)
      | "SESSION_EXPIRED"       // 401
      | "FORBIDDEN"             // 403 (role)
      | "OWNERSHIP_VIOLATION"   // 403 (object-level)
      | "ENTITLEMENT_REQUIRED"  // 403 (paywall)
      | "NOT_FOUND"             // 404
      | "CONFLICT"              // 409 (state/duplicate)
      | "IDEMPOTENCY_CONFLICT"  // 409 (same key, different payload)
      | "RATE_LIMITED";         // 429
    message: string;            // user-safe, localized key
    details?: unknown;          // zod issues / field hints
  };
};
```

The client maps `code` (not message text) to UI behavior. 5xx uses `INTERNAL` without
internal details; details go to server logs.

## 3. Rate limits (in-memory buckets in the current build)

| Scope | Limit | Key |
| --- | --- | --- |
| Global | 120 req/min | IP |
| auth (register/login) | 10 req/min | IP |
| ai.chat | 10 req/min per user; daily quota by plan | user |
| subscription.checkout | 5 req/min | user |
| privacy.export | 2 req/hour | user |
| community POST | 10 req/min | user |

429 responses include `Retry-After`. In-memory store resets on process restart (honest
limitation; Redis target in 07-security-privacy.md §14).

## 4. Route groups

### 4.1 auth

| Method + Path | Role | Notes |
| --- | --- | --- |
| POST `/api/auth/register` | anon | 10/min/IP; creates User + Consent + Session |
| POST `/api/auth/login` | anon | rotates session token (old token revoked) |
| POST `/api/auth/logout` | auth | revokes current session |
| POST `/api/auth/logout-all` | auth | revokes all sessions of user |
| GET `/api/auth/session` | anon | returns current principal or `{ user: null }` |

```ts
// POST /api/auth/register  { email, password, name?, locale: "fa" | "en", consent: boolean }
type RegisterResponse = { user: { id: string; email: string; role: "USER"; locale: "fa" | "en" } };
// POST /api/auth/login     { email, password }
type LoginResponse = RegisterResponse; // sets new cookie; 401 on bad credentials
// GET /api/auth/session
type SessionResponse = { user: null } | { user: { id: string; email: string; role: Role; locale: string } };
```

### 4.2 pregnancy

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/pregnancy` | auth | active Pregnancy + latest GestationalDating + current week |
| POST `/api/pregnancy` | auth | create profile (one ACTIVE per user; else 409) |
| POST `/api/pregnancy/dating` | auth | add GestationalDating entry (LMP/ultrasound) |

```ts
type PregnancyResponse = {
  pregnancy: { id: string; status: "ACTIVE" | "COMPLETED" | "LOST" | "ARCHIVED"; dueDate: string | null };
  dating: { method: "LMP" | "ULTRASOUND_CRL" | "IVF" | "ADJUSTED"; gestationalAgeDays: number; dueDate: string } | null;
  currentWeek: number | null;
};
```

### 4.3 tracking

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/tracking/metrics` | auth | metric series (weight, BP-home-record, mood) for range |
| POST `/api/tracking/metrics` | auth | append metric point |
| GET `/api/tracking/symptoms` | auth | own SymptomEntry list |
| POST `/api/tracking/symptoms` | auth | runs red-flag engine; may return escalation card |

```ts
// POST /api/tracking/symptoms { category, severity: 1|...|10, notes? }
type SymptomCreateResponse = {
  entry: { id: string; category: string; severity: number; redFlagTriggered: boolean };
  escalation: null | { severity: "HIGH" | "CRITICAL"; emergency: boolean; messageKey: string };
};
```

### 4.4 journal

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/journal` | auth | own entries, paginated |
| POST `/api/journal` | auth | create entry |
| DELETE `/api/journal/{id}` | auth (owner) | 404 if not owner's |

### 4.5 appointments

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/appointments` | auth | own list |
| POST `/api/appointments` | auth | create |
| PATCH `/api/appointments/{id}` | auth (owner) | status/time updates |

### 4.6 reminders

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/reminders` | auth | own list, due-first ordering |
| POST `/api/reminders` | auth | create |
| PATCH `/api/reminders/{id}` | auth (owner) | done/snooze/dismiss |
| DELETE `/api/reminders/{id}` | auth (owner) | remove |

### 4.7 documents

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/documents` | auth | own metadata registry |
| POST `/api/documents` | auth | register metadata (file upload target: 07 §6) |
| DELETE `/api/documents/{id}` | auth (owner) | remove metadata (+ object when storage lands) |

### 4.8 content (education & timeline)

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/content` | auth | list by `module`, `week`, `locale`; only APPROVED served |
| GET `/api/content/{slug}` | auth | detail incl. citation list |

```ts
type ContentItem = {
  slug: string; module: "C" | "K" | "L" | "M" | "N" | "O";
  title: string; body: string; // locale-selected text
  version: number; sources: { id: string; title: string; publisher: string; year: number }[];
};
```

### 4.9 assets (3D registry)

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/assets` | auth | registry entries for studio (see 05 §5) |
| GET `/api/assets/{assetId}` | auth | full asset descriptor incl. parametric table version |

### 4.10 ai

| Method + Path | Role | Notes |
| --- | --- | --- |
| POST `/api/ai/chat` | auth | the only LLM entry; safety-first pipeline (section 5) |
| GET `/api/ai/conversations` | auth | own thread list |
| GET `/api/ai/conversations/{id}` | auth (owner) | thread with messages + citations |

```ts
// POST /api/ai/chat { conversationId?: string; message: string; locale: "fa" | "en" }
type ChatResponse =
  | { kind: "answer"; conversationId: string; content: string;
      citations: { docId: string; title: string; sourceId?: string }[] }
  | { kind: "escalation"; conversationId: string; severity: "HIGH" | "CRITICAL";
      emergency: { iran: string[]; note: string }; messageKey: string };
// escalation shape means the LLM was NOT called (deterministic bypass, 06 §4)
```

### 4.11 family

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/family/grants` | auth (owner) | list grants I issued |
| POST `/api/family/grants` | auth (owner) | invite partner with permission flags |
| DELETE `/api/family/grants/{id}` | auth (owner) | revoke immediately |

```ts
// POST /api/family/grants { partnerEmail, permissions: { viewTimeline: boolean; viewTracking: boolean; viewAppointments: boolean; viewJournal: boolean } }
type GrantResponse = { grant: { id: string; status: "INVITED"; permissions: Permissions } };
```

A partner authenticates as their own USER; every read they perform passes both the grant
check and object-level ownership rules (07 §4).

### 4.12 community

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/community/posts` | auth (invited) | feed; hidden posts excluded |
| POST `/api/community/posts` | auth (invited) | invitation-gated; alias required |
| POST `/api/community/posts/{id}/report` | auth | user report |
| GET `/api/community/moderation` | ADMIN | flagged queue |
| POST `/api/community/moderation/{postId}/action` | ADMIN | CLEAR \| HIDE \| DELETE \| WARN |

Misinformation keyword flagging runs on create (`flagStatus: FLAGGED`) per
`00-executive-summary.md` module Q; flagged posts await moderation, they are not
auto-published as advice.

### 4.13 subscription

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/subscription` | auth | current Subscription + Entitlements |
| POST `/api/subscription/checkout` | auth | create Payment(PENDING) with unique idempotencyKey |
| POST `/api/subscription/webhook` | provider (HMAC) | idempotent; verifies signature; activates Entitlement |
| GET `/api/subscription/entitlements` | auth | effective feature flags |

```ts
// POST /api/subscription/checkout { plan: "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL"; idempotencyKey: string }
type CheckoutResponse =
  | { status: "REDIRECT"; provider: "SANDBOX" | "ZARINPAL" | "STRIPE"; checkoutUrl: string }
  | { status: "ALREADY_PROCESSED"; paymentId: string }; // idempotent replay
// POST /api/subscription/webhook — headers: X-NIVA-Signature (HMAC-SHA256 of raw body)
type WebhookBody = { paymentRef: string; state: "SUCCEEDED" | "FAILED"; providerRef: string };
// replay or late duplicate => same 200 response, no state change
```

The current build exposes the SANDBOX adapter only and labels every payment surface in the
UI (ADR-006). Entitlement changes happen server-side only; the client never self-grants.

### 4.14 notifications

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/notifications` | auth | own list, unread first |
| POST `/api/notifications/{id}/read` | auth (owner) | mark read |
| POST `/api/notifications/read-all` | auth | bulk mark |

### 4.15 privacy

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/privacy/export` | auth | JSON export of owned data (2/hour) |
| POST `/api/privacy/delete` | auth | request account deletion (verifies password; grace period) |
| GET `/api/privacy/consent` | auth | consent history |
| PUT `/api/privacy/consent` | auth | grant/withdraw purpose consent |

```ts
type ExportResponse = {
  format: "niva.export.v1";
  exportedAt: string;
  user: { id: string; email: string; locale: string };
  pregnancies: unknown[]; symptoms: unknown[]; journal: unknown[];
  appointments: unknown[]; reminders: unknown[]; conversations: unknown[];
  documents: unknown[]; consents: unknown[];
};
```

### 4.16 admin

| Method + Path | Role | Notes |
| --- | --- | --- |
| GET `/api/admin/review-queue` | CLINICAL_REVIEWER \| ADMIN | DRAFT/IN_REVIEW content + assets |
| POST `/api/admin/review-queue/{subjectId}/decision` | CLINICAL_REVIEWER | APPROVED/REJECTED/CHANGES_REQUESTED + comments; audited |
| GET `/api/admin/users` | ADMIN | user administration list |
| GET `/api/admin/metrics` | ADMIN | SafetyEvent counts, moderation load, API health snapshot |

## 5. AI pipeline contract obligations

`/api/ai/chat` handlers MUST, in order: authenticate; enforce quotas; run the deterministic
bilingual red-flag scan before any LLM call; on match, persist SafetyEvent(OPEN), skip the
LLM entirely, and return the `escalation` variant; otherwise run prompt-injection
heuristics, retrieval with citations, response validation, and persistence. Contract details
in `06-medical-safety.md` §4–§6; evaluation in `08-ai-evaluation.md`.

## 6. OpenAPI adoption path (DOCUMENTED-TARGET)

1. Export zod schemas to OpenAPI 3.1 via a schema-to-OAS generator; one `openapi.yaml` per
   release tag.
2. Serve `/api/openapi.json` (anon, non-sensitive) and a redoc page for reviewers.
3. Generate typed client + contract tests (schema-validated request/response fixtures per
   endpoint) so `09-test-plan.md` gains an automated layer.
4. CI gate: `openapi.yaml` diff review required for any route change.
