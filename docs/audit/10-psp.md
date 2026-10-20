# 10 — PSP Adapter Architecture, Invoices, Refunds, Trials (Wave 6.1)

Status: **IMPLEMENTED + VERIFIED (sandbox scope)** — real-money adapters are wired and
shape-correct but dormant until credentials exist. This document is the production swap-in
runbook and the record of invariants.

## 1. Architecture

```
src/lib/psp/index.ts        PSPAdapter interface + Sandbox/Zarinpal/Stripe + getPSP() factory
src/lib/billing.ts          issueInvoice / reconcileExpiredSubscriptions / refundPayment / planForAmount
src/lib/plans.ts            PLAN_CATALOG (IRR + USD rows) + priceForPlan / catalogForLocale / localeCurrency
src/app/api/subscription/*  checkout, confirm (sandbox), webhook, cancel, trial, invoices
src/app/api/admin/finance/* finance GET (payments + refunds ledger), refund POST
```

Every payment-flow route talks to the **adapter**, never to a PSP directly:

| Interface method | Purpose |
|---|---|
| `createCheckout({paymentId, amountMinor, currency, callbackUrl, locale})` | Returns `{redirectUrl}` (hosted PSP page) or `{redirectView}` (in-app sandbox view), plus optional `providerRef`/`detail` persisted to `Payment.providerRef`/`statusDetail`. |
| `verifyAndParseWebhook(req)` | Returns `{ok, paymentRef, result, detail, configError?, retryable?}`. `configError` → route answers **503 fail-closed**; `!ok` → 403 + PAYMENT_ANOMALY safety event; `retryable` → 503 so the PSP retries. |
| `refund({paymentId, amountMinor, currency, reason, providerRef?, providerDetail?})` | Returns `{status: PENDING\|SUCCEEDED\|FAILED, providerRef?, detail?}`. Called **before** the DB transaction (no network inside tx). |

### Adapter matrix

| | SANDBOX (default) | ZARINPAL | STRIPE |
|---|---|---|---|
| Currency / minor unit | IRR (rials) + USD (cents) | IRR — rials, **amountMinor passes 1:1** | USD — cents, `unit_amount` **is** amountMinor |
| Checkout | `redirectView: 'sandbox-checkout'` (in-app dialog) | `POST payment.zarinpal.com/pg/v4/payment/request.json` `{merchant_id, amount, callback_url, description}` → `data.authority` → redirect `…/pg/StartPay/{authority}` | `POST api.stripe.com/v1/checkout/sessions` (Bearer key, form-encoded: `mode=payment`, `client_reference_id`, `metadata[paymentId]`, `line_items[0][price_data][currency|unit_amount|product_data][name]`) → redirect `session.url` |
| Verification | HMAC-SHA256 over `` `${paymentId}:${result}` `` with `NIVA_PAYMENT_WEBHOOK_SECRET` | Return URL carries `?Authority=…&Status=OK|NOK`; `Status=OK` → `POST …/verify.json` `{merchant_id, authority, amount}` → `data.code` 100 (ok) / **101 (already verified — idempotent)** / else fail; `data.ref_id` = settlement ref. No S2S webhook exists — the return handler is the verify point. | `Stripe-Signature: t=<ts>,v1=<hmac>` header; HMAC-SHA256 over `` `${t}.${rawBody}` `` with `STRIPE_WEBHOOK_SECRET`, ±300 s tolerance. Events: `checkout.session.completed` → SUCCEEDED, `checkout.session.expired` / `payment_intent.payment_failed` → FAILED, others ignored (acknowledged). |
| Refund | Ledger-only (`Refund` row is the record; providerRef `sbxrf_<paymentId>`) | **No public refund API in PG v4** — adapter returns `PENDING`; finance settles in the Zarinpal merchant panel then flips the row to SUCCEEDED | `POST /v1/refunds {payment_intent, amount}` — real money; requires the `payment_intent` stored in `Payment.statusDetail` at webhook time (`pi:…`) |
| Activates when | always (fallback) | `NIVA_PSP=zarinpal` **and** `NIVA_ZARINPAL_MERCHANT_ID` | `NIVA_PSP=stripe` **and** `STRIPE_SECRET_KEY` |

`getPSP()` never throws and never activates a real adapter without credentials; the fallback
reason is surfaced through `describePSP()` in `GET /api/subscription` (`psp.reason`) and shown
in the subscription UI footer — the sandbox is always honestly labeled.

`PAYMENTS_MODE` (default `sandbox`) keeps exactly one pre-existing meaning: the sandbox
**client-confirm** route (`POST /api/subscription/confirm`) exists only when it is `sandbox`.
In production it is set to anything else, which hard-disables that route; the adapter webhook
becomes the only entitlement writer.

## 2. Environment variables

| Var | Used by | Meaning |
|---|---|---|
| `PAYMENTS_MODE` | confirm route | `sandbox` (default) enables the in-app confirmation; any other value disables it. |
| `NIVA_PSP` | factory | `sandbox` (default) \| `zarinpal` \| `stripe`. Real adapter activates only with its credentials. |
| `NIVA_PAYMENT_WEBHOOK_SECRET` | Sandbox webhook | HMAC secret. **Unset → webhook returns 503 and processes nothing (fail-closed).** |
| `NIVA_ZARINPAL_MERCHANT_ID` | Zarinpal | Merchant UUID/IRID from the Zarinpal panel. |
| `STRIPE_SECRET_KEY` | Stripe | `sk_live_…` / `sk_test_…` Bearer key. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook | `whsec_…` endpoint signing secret. **Unset → 503 fail-closed.** |

## 3. Idempotency & reconciliation invariants

1. **PENDING-only transition.** `Payment.status` may only leave `PENDING` once; replays of an
   already-processed webhook/confirm return `{ok:true, replay:true, status}` with the recorded
   outcome. `Payment.idempotencyKey` is UNIQUE (unique index since Wave 2).
2. **One invoice per payment.** `Invoice.paymentId` is UNIQUE; `issueInvoice` runs **inside the
   same transaction** as the payment transition in BOTH the confirm and webhook SUCCEEDED paths.
   A replayed SUCCEEDED can never mint a second invoice.
3. **Sequential invoice numbers** `NIVA-<year>-<6 digits>` come from a `Setting` counter
   (`invoiceSeq:<year>`) incremented inside the issuing transaction. SQLite interactive
   transactions serialize writers, so read-increment-write cannot interleave here. **Postgres
   production note:** replace with `UPDATE settings SET value = (value::int)+1 WHERE key=$1
   RETURNING value` (atomic) or accept a retry-on-unique-violation loop; a plain `count(*)`
   prefix-match is NOT race-safe under Postgres and was deliberately avoided.
4. **Reconciliation is idempotent.** `reconcileExpiredSubscriptions(now)` (exported for the
   scheduler tick to call — orchestrator wiring pending):
   - `TRIALING` with `trialEndsAt < now` → `EXPIRED`, entitlement `FREE`, localized notification.
   - `ACTIVE` with `currentPeriodEnd < now` → `CANCELLED` (when `cancelAtPeriodEnd`) or
     `EXPIRED`, entitlement `FREE`, localized notification.
   Status predicates make re-runs no-ops; it also runs (awaited, cheap) at the top of
   `GET /api/subscription` so read-time state never lies.
5. **Entitlements are written only inside the payment transaction** (`setEntitlement(…, tx)`),
   so payment/subscription/entitlement/invoice are atomic.

## 4. Refund policy

- Only `SUCCEEDED` payments are refundable; refunds are issued against the **remaining**
  refundable amount (`amount − Σ SUCCEEDED refunds`), full refund when `amountMinor` omitted.
- **Partial refund** → payment stays `SUCCEEDED`, `statusDetail` notes the split
  (`partially refunded (x/total)`); a second refund can cover the rest.
- **Full refund** → payment `REFUNDED`. The subscription is cancelled + entitlement `FREE`
  **only when no other SUCCEEDED payment supports it** (a refunded renewal does not kill the
  earlier active term). A localized notification explains the change.
- Execution: `POST /api/admin/finance/refund`, roles `ADMIN | SUPER_ADMIN | FINANCE`
  (`withUser` role-list semantics), reason required (≥4 chars), rate-limited, audited
  (`REFUND_ISSUED` / `REFUND_FAILED`), processor recorded on `Refund.processedById`.
- Ledger visibility: `GET /api/admin/finance` returns the refund ledger with processor + user.

## 5. Trial rules

- One-time 7-day PREMIUM trial: `POST /api/subscription/trial`. Creates a `TRIALING`
  subscription with `trialEndsAt = currentPeriodEnd = now+7d`, entitlement
  `PREMIUM_MONTHLY` for 7 days, notification + audit, rate-limited (5/min), CSRF-checked.
- Guard: no subscription in (`ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELLED`) **and** raw
  entitlement plan `FREE`. Violation → `409 TRIAL_INELIGIBLE`. The same predicate powers the
  `trialEligible` flag in `GET /api/subscription` (the UI only renders the CTA when true).
- **Honest abuse note:** `EXPIRED` subscriptions do not block the guard (per spec), so an
  account whose subscription *expired* (not cancelled) could start a second trial. Production
  must add a persistent `hasUsedTrial` flag (or count historical TRIALING rows) before real
  money — recorded as a launch requirement, deliberately not improvised in this build.
- Trial expiry is handled by reconciliation (invariant 4), including a localized
  "trial ended" notification.

## 6. Period-end cancellation

`POST/PATCH /api/subscription/cancel` with `{subscriptionId, when}` (`immediate` default for
backward compatibility): `period_end` sets `cancelAtPeriodEnd=true`, keeps access until
`currentPeriodEnd`, sends a confirmation notification with the date, and audits
`SUBSCRIPTION_CANCEL_SCHEDULED`; reconciliation then flips the row exactly once (invariant 4).
`immediate` cancels + degrades to `FREE` atomically as before. A period-end request with no
remaining paid period returns `409 CONFLICT` instead of silently expiring early.

## 7. Production launch steps (real PSP swap-in)

1. **Contracts**: sign with Zarinpal (IPG PG v4) and/or Stripe; record merchant id / keys.
2. **Env**: set `PAYMENTS_MODE=live`, `NIVA_PSP=zarinpal|stripe` + the credential vars in §2.
   Restart — the factory picks the adapter at request time, the confirm route self-disables.
3. **Webhook / return registration**:
   - Stripe: register `https://<domain>/api/subscription/webhook` in the dashboard, copy the
     `whsec_…` into `STRIPE_WEBHOOK_SECRET`, enable `checkout.session.*` +
     `payment_intent.payment_failed`.
   - Zarinpal: set the callback URL to the production return page (`/subscription?payment=…`
     today); implement the return handler that re-posts `Authority`/`Status` (with the
     `x-niva-verify-amount` header carrying the Payment amount) to
     `/api/subscription/webhook`, or call `verifyAndParseWebhook` directly from the page load.
4. **Load the localized catalog** into the PSP dashboards (Zarinpal needs no product rows;
   Stripe: either keep inline `price_data` as implemented or pre-create Prices and swap the
   param for `line_items[0][price]`).
5. **Rehearse**: sandbox-mode webhook replay test (§8) → `bun run verify:contracts` →
   Postgres rehearsal (docs/audit/06) since invoice numbering changes (§3.3).
6. **Flip** `PAYMENTS_MODE`/`NIVA_PSP`, verify one real 1-unit charge + refund end-to-end in
   each PSP's test mode before enabling live keys.
7. **Scheduler**: wire `reconcileExpiredSubscriptions()` into the tick mini-service (exported
   and marked for the orchestrator).

## 8. Verification evidence (this build)

- `bunx tsc --noEmit` 0 errors; `bun run lint` 0 errors.
- curl chain: fa demo checkout (IRR) + en fresh-user checkout (USD 690¢) → confirm SUCCEEDED
  → `GET /api/subscription/invoices` returns sequential `NIVA-<year>-00000x` numbers; trial
  after a subscription → `409 TRIAL_INELIGIBLE`; fresh user → trial `TRIALING` →
  reconcile with a future clock → `EXPIRED` + entitlement `FREE`; cancel `period_end` →
  `cancelAtPeriodEnd=true`; full refund → payment `REFUNDED` + subscription `CANCELLED` +
  entitlement `FREE`; partial refund → payment stays `SUCCEEDED` with a statusDetail note;
  webhook (HMAC-signed payload) SUCCEEDED + invoice, **replay returns `replay:true`**;
  unconfigured secret → `503 CONFIG` (fail-closed).
- Invoice PDFs are deliberately **not** implemented: invoices are structured JSON records
  (`GET /api/subscription/invoices`) and the UI states that PDFs are a production step. No
  fake download buttons.

## 9. Honest limitations

- No real money moves in this build; Zarinpal/Stripe code paths execute only with credentials
  and were validated by shape (request/response models, signature schemes) + tsc, not live calls.
- Zarinpal has no S2S webhook — the return-URL verify flow is documented but the return page
  itself is a production step (the sandbox dialog covers the demo path).
- Stripe refund requires `payment_intent` from webhook-time `statusDetail`; payments activated
  via the sandbox confirm (no webhook) can only be refunded through the sandbox adapter.
- Invoice `taxMinor` is always 0 — VAT/GST is jurisdiction-specific (Wave 6.4 privacy pack
  territory) and intentionally out of scope.
- Trial re-use after expiry is possible until a `hasUsedTrial` flag ships (§5).
- Invoice numbering relies on SQLite transaction serialization; Postgres swap needs §3.3's
  atomic counter.
