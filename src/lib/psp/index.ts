/**
 * NIVA PSP (Payment Service Provider) adapter architecture — Wave 6.1.
 *
 * One interface, three adapters:
 *  - SANDBOX   (default): in-app confirmation + HMAC webhook + ledger-only refunds.
 *  - ZARINPAL: real PG v4 request/verify shapes for the Iranian market (IRR rials).
 *  - STRIPE:   real Checkout Session + `Stripe-Signature` verification (USD cents).
 *
 * Activation contract: a real adapter ONLY activates when NIVA_PSP selects it
 * AND its credentials are present in the environment. Otherwise the factory
 * falls back to the sandbox adapter and records the reason (surfaced via
 * describePSP() so the UI/API can stay honest about what is wired).
 *
 * This sandbox build performs NO real network calls: fetch() bodies inside the
 * Zarinpal/Stripe adapters execute only when the corresponding credentials
 * exist (which they never do here). The exact production swap-in — env vars,
 * webhook registration, return-URL handling — is documented in
 * docs/audit/10-psp.md.
 */

export type PaymentResult = 'SUCCEEDED' | 'FAILED';

export interface CheckoutInput {
  /** Our internal Payment.id — echoed in callbacks/metadata for reconciliation. */
  paymentId: string;
  amountMinor: number;
  currency: 'IRR' | 'USD';
  /** Absolute URL the PSP redirects the user back to after the payment. */
  callbackUrl: string;
  locale: 'fa' | 'en';
  description?: string;
}

export interface CheckoutResult {
  /** Hosted PSP page URL (Zarinpal StartPay / Stripe Checkout). */
  redirectUrl?: string;
  /** In-app view name (sandbox only — no external page exists). */
  redirectView?: string;
  /** PSP reference captured at checkout (e.g. Zarinpal authority). */
  providerRef?: string;
  /** Human-readable PSP detail stored in Payment.statusDetail. */
  detail?: string;
}

export interface WebhookParseResult {
  /** True when the request is authentically from the PSP (signature verified). */
  ok: boolean;
  /** True when the failure is ours to fix (bad config) → route answers 503. */
  configError?: boolean;
  /** True when the failure is transient (network/5xx) → PSP should retry. */
  retryable?: boolean;
  /** Our internal Payment.id recovered from the payload. */
  paymentRef?: string;
  idempotencyKey?: string;
  result?: PaymentResult;
  /** PSP authority / verification code / provider reason — persisted to Payment.statusDetail. */
  detail?: string;
}

export interface RefundInput {
  paymentId: string;
  amountMinor: number;
  currency: 'IRR' | 'USD';
  reason: string;
  /** PSP reference from the original payment (e.g. Stripe payment_intent). */
  providerRef?: string;
  /** Extra stored PSP context (Payment.statusDetail), used when providerRef is insufficient. */
  providerDetail?: string;
}

export interface RefundResult {
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  providerRef?: string;
  detail?: string;
}

export interface PSPAdapter {
  id: 'SANDBOX' | 'ZARINPAL' | 'STRIPE';
  /** True when the adapter does not move real money. */
  sandbox: boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyAndParseWebhook(req: Request): Promise<WebhookParseResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}

/** Typed failure for real-PSP HTTP paths (never thrown by the sandbox). */
export class PspError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from 'crypto';

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ─── SANDBOX ─────────────────────────────────────────────────────────────────

/**
 * Mirrors the pre-Wave-6 flow exactly: in-app confirmation view, HMAC-SHA256
 * webhook over `${paymentId}:${result}` (secret NIVA_PAYMENT_WEBHOOK_SECRET,
 * fail-closed when unset), and ledger-only refunds. No money ever moves.
 */
export class SandboxAdapter implements PSPAdapter {
  id = 'SANDBOX' as const;
  sandbox = true;

  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    return {
      redirectView: 'sandbox-checkout',
      detail: 'sandbox checkout — no external provider',
    };
  }

  async verifyAndParseWebhook(req: Request): Promise<WebhookParseResult> {
    const secret = process.env.NIVA_PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      // Fail closed — the route maps this to 503 CONFIG.
      return { ok: false, configError: true, detail: 'NIVA_PAYMENT_WEBHOOK_SECRET is not configured' };
    }
    let body: { paymentId?: string; result?: string; signature?: string };
    try {
      body = await req.json();
    } catch {
      return { ok: false, detail: 'invalid JSON body' };
    }
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId : '';
    const result = body.result === 'FAILED' ? 'FAILED' : body.result === 'SUCCEEDED' ? 'SUCCEEDED' : null;
    const signature = typeof body.signature === 'string' ? body.signature : '';
    if (!paymentId || !result) {
      return { ok: false, detail: 'missing paymentId or result' };
    }
    const expected = createHmac('sha256', secret).update(`${paymentId}:${result}`).digest('hex');
    if (!timingSafeEqualHex(expected, signature)) {
      return { ok: false, detail: 'signature verification failed' };
    }
    return { ok: true, paymentRef: paymentId, result, detail: 'sandbox HMAC verified' };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    // Ledger-only: the Refund row IS the record. No PSP exists to call.
    return { status: 'SUCCEEDED', providerRef: `sbxrf_${input.paymentId}`, detail: 'ledger-only sandbox refund' };
  }
}

// ─── ZARINPAL ────────────────────────────────────────────────────────────────

const ZARINPAL_API = 'https://payment.zarinpal.com/pg/v4/payment';

interface ZarinpalEnvelope<T> {
  data?: T | null;
  errors?: unknown | null;
}

/**
 * Zarinpal PG v4 (IRR — amounts in Rials, which is exactly our IRR minor unit,
 * so amountMinor passes through 1:1).
 *
 * Real flow: POST /request.json → {data:{authority,code:100}} → redirect the
 * user to https://payment.zarinpal.com/pg/StartPay/{authority} → Zarinpal
 * returns the buyer to callback_url with ?Authority=..&Status=OK|NOK →
 * POST /verify.json {merchant_id, authority, amount} → data.code 100 (ok) |
 * 101 (already verified — idempotent) → data.ref_id is the settlement reference.
 * Zarinpal has no server-to-server webhook: the return-URL handler performs
 * verification (this adapter parses the same Authority/Status payload shape so
 * the return handler and any manual replay share one code path).
 *
 * Refunds are NOT available via PG v4 — they are executed in the Zarinpal
 * merchant panel; this adapter records a PENDING refund intent for the finance
 * ledger (documented production step: settle manually, then flip the row).
 */
export class ZarinpalAdapter implements PSPAdapter {
  id = 'ZARINPAL' as const;
  sandbox = false;
  private merchantId: string;

  constructor(merchantId: string) {
    this.merchantId = merchantId;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    // shape: {merchant_id, amount (rials), callback_url, description}
    const res = await fetch(`${ZARINPAL_API}/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: input.amountMinor,
        callback_url: input.callbackUrl,
        description: input.description ?? 'NIVA subscription',
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json()) as ZarinpalEnvelope<{ authority?: string; code?: number }>;
    const authority = body.data?.authority;
    if (!res.ok || !authority) {
      throw new PspError('ZARINPAL_REQUEST_FAILED', `Zarinpal request failed (${res.status}): ${JSON.stringify(body.errors ?? body)}`);
    }
    return {
      redirectUrl: `https://payment.zarinpal.com/pg/StartPay/${authority}`,
      providerRef: authority,
      detail: `authority:${authority}`,
    };
  }

  async verifyAndParseWebhook(req: Request): Promise<WebhookParseResult> {
    // Zarinpal returns the buyer with Authority + Status (query on GET, form on POST).
    const url = new URL(req.url);
    let authority = url.searchParams.get('Authority') ?? url.searchParams.get('authority') ?? '';
    let status = url.searchParams.get('Status') ?? url.searchParams.get('status') ?? '';
    if (!authority && req.method === 'POST') {
      try {
        const form = await req.formData();
        authority = String(form.get('Authority') ?? form.get('authority') ?? '');
        status = String(form.get('Status') ?? form.get('status') ?? '');
      } catch {
        // fall through — payload shape is documented in docs/audit/10-psp.md
      }
    }
    if (!authority) return { ok: false, detail: 'missing Zarinpal Authority' };
    if (status.toUpperCase() !== 'OK') {
      return { ok: true, result: 'FAILED', detail: `zarinpal status ${status || 'NOK'} authority:${authority}` };
    }
    // Real verification call — executes only when credentials are present
    // (the factory never activates this adapter without them). The amount is
    // filled by the calling route from the Payment row it loads.
    try {
      const amountHeader = req.headers.get('x-niva-verify-amount');
      const res = await fetch(`${ZARINPAL_API}/verify.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          merchant_id: this.merchantId,
          authority,
          amount: Number(amountHeader ?? '0'),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.json()) as ZarinpalEnvelope<{ code?: number; ref_id?: number }>;
      const code = body.data?.code;
      if (code === 100 || code === 101) {
        return { ok: true, result: 'SUCCEEDED', detail: `zarinpal ref_id:${body.data?.ref_id} authority:${authority}` };
      }
      return { ok: true, result: 'FAILED', detail: `zarinpal verify code ${String(code)} authority:${authority}` };
    } catch (err) {
      return { ok: false, retryable: true, detail: `zarinpal verify unreachable: ${err instanceof Error ? err.message : 'error'}` };
    }
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    // No public refund API in PG v4 — manual settlement via the merchant panel.
    return {
      status: 'PENDING',
      detail: 'Zarinpal refunds settle manually via the merchant panel; finance flips the Refund row to SUCCEEDED after confirmation.',
    };
  }
}

// ─── STRIPE ──────────────────────────────────────────────────────────────────

const STRIPE_API = 'https://api.stripe.com/v1';

/** Form-encodes a flat object the way the Stripe API expects. */
function stripeForm(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

/**
 * Stripe Checkout (USD cents — Stripe unit_amount IS our amountMinor).
 *
 * Real flow: POST /v1/checkout/sessions (Bearer STRIPE_SECRET_KEY, form-encoded:
 * mode=payment, client_reference_id=<our paymentId>, metadata[paymentId],
 * line_items[0][price_data][currency|unit_amount|product_data][name],
 * success_url, cancel_url) → redirect to session.url. Webhook: POST from
 * Stripe with header `Stripe-Signature: t=<ts>,v1=<hmac>`; signature is
 * HMAC-SHA256 over `${t}.${rawBody}` with STRIPE_WEBHOOK_SECRET, tolerance
 * ±5 minutes. Events consumed: checkout.session.completed → SUCCEEDED,
 * checkout.session.expired / payment_intent.payment_failed → FAILED.
 * Refunds: POST /v1/refunds {payment_intent, amount} — real money.
 */
export class StripeAdapter implements PSPAdapter {
  id = 'STRIPE' as const;
  sandbox = false;
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeForm({
        mode: 'payment',
        client_reference_id: input.paymentId,
        'metadata[paymentId]': input.paymentId,
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': input.currency.toLowerCase(),
        'line_items[0][price_data][unit_amount]': String(input.amountMinor),
        'line_items[0][price_data][product_data][name]':
          input.description ?? (input.locale === 'fa' ? 'اشتراک نیوا' : 'NIVA subscription'),
        success_url: `${input.callbackUrl}${input.callbackUrl.includes('?') ? '&' : '?'}payment={CHECKOUT_SESSION_ID}`,
        cancel_url: input.callbackUrl,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const session = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !session.url || !session.id) {
      throw new PspError('STRIPE_SESSION_FAILED', `Stripe checkout session failed: ${session.error?.message ?? res.status}`);
    }
    return { redirectUrl: session.url, providerRef: session.id, detail: `cs:${session.id}` };
  }

  async verifyAndParseWebhook(req: Request): Promise<WebhookParseResult> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return { ok: false, configError: true, detail: 'STRIPE_WEBHOOK_SECRET is not configured' };
    }
    const header = req.headers.get('stripe-signature') ?? '';
    const parts = Object.fromEntries(
      header.split(',').map((kv) => {
        const [k, v] = kv.split('=');
        return [k.trim(), (v ?? '')] as const;
      })
    ) as { t?: string; v1?: string };
    const timestamp = parts.t ?? '';
    const provided = parts.v1 ?? '';
    if (!timestamp || !provided) return { ok: false, detail: 'missing Stripe-Signature t/v1' };
    // ±5-minute tolerance (matches Stripe's documented replay window).
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
      return { ok: false, detail: 'Stripe signature timestamp outside tolerance' };
    }
    const payload = await req.text();
    const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
    if (!timingSafeEqualHex(expected, provided)) {
      return { ok: false, detail: 'Stripe signature verification failed' };
    }
    let event: { type?: string; data?: { object?: Record<string, unknown> } };
    try {
      event = JSON.parse(payload);
    } catch {
      return { ok: false, detail: 'invalid JSON payload' };
    }
    const obj = event.data?.object ?? {};
    const metadata = (obj.metadata ?? {}) as Record<string, string>;
    const paymentRef =
      metadata.paymentId ??
      (typeof obj.client_reference_id === 'string' ? obj.client_reference_id : undefined) ??
      (typeof obj.paymentId === 'string' ? obj.paymentId : undefined);
    switch (event.type) {
      case 'checkout.session.completed': {
        const paymentIntent = typeof obj.payment_intent === 'string' ? obj.payment_intent : undefined;
        return {
          ok: true,
          paymentRef,
          result: 'SUCCEEDED',
          detail: paymentIntent ? `pi:${paymentIntent}` : `cs:${String(obj.id ?? '')}`,
        };
      }
      case 'checkout.session.expired':
      case 'payment_intent.payment_failed':
        return { ok: true, paymentRef, result: 'FAILED', detail: `stripe event ${event.type}` };
      default:
        // charge.refunded etc. — the refund ledger is owned by our refund route.
        return { ok: true, paymentRef, detail: `ignored stripe event ${event.type}` };
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const paymentIntent = input.providerRef?.startsWith('pi_')
      ? input.providerRef
      : input.providerDetail?.startsWith('pi_')
        ? input.providerDetail
        : undefined;
    if (!paymentIntent) {
      throw new PspError('STRIPE_NO_PAYMENT_INTENT', 'Refund requires the Stripe payment_intent (stored in Payment.statusDetail at webhook time).');
    }
    const res = await fetch(`${STRIPE_API}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeForm({ payment_intent: paymentIntent, amount: String(input.amountMinor) }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json()) as { id?: string; status?: string; error?: { message?: string } };
    if (!res.ok || !body.id) {
      throw new PspError('STRIPE_REFUND_FAILED', `Stripe refund failed: ${body.error?.message ?? res.status}`);
    }
    const status = body.status === 'succeeded' ? 'SUCCEEDED' : body.status === 'failed' ? 'FAILED' : 'PENDING';
    return { status, providerRef: body.id, detail: `stripe refund ${body.id} (${String(body.status)})` };
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export const sandboxAdapter = new SandboxAdapter();

export interface PSPDescriptor {
  adapter: PSPAdapter;
  /** True when a real PSP is active (credentials present). */
  live: boolean;
  /** Why the sandbox adapter is active (always set when live=false). */
  reason: string;
}

export function resolvePSP(): PSPDescriptor {
  const requested = (process.env.NIVA_PSP ?? '').toLowerCase().trim();
  if (requested === 'zarinpal') {
    const merchantId = process.env.NIVA_ZARINPAL_MERCHANT_ID;
    if (merchantId) {
      return { adapter: new ZarinpalAdapter(merchantId), live: true, reason: 'Zarinpal adapter active (NIVA_ZARINPAL_MERCHANT_ID set)' };
    }
    return {
      adapter: sandboxAdapter,
      live: false,
      reason: 'NIVA_PSP=zarinpal requested but NIVA_ZARINPAL_MERCHANT_ID missing — sandbox adapter active',
    };
  }
  if (requested === 'stripe') {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      return { adapter: new StripeAdapter(key), live: true, reason: 'Stripe adapter active (STRIPE_SECRET_KEY set)' };
    }
    return {
      adapter: sandboxAdapter,
      live: false,
      reason: 'NIVA_PSP=stripe requested but STRIPE_SECRET_KEY missing — sandbox adapter active',
    };
  }
  if (requested && requested !== 'sandbox') {
    return { adapter: sandboxAdapter, live: false, reason: `Unknown NIVA_PSP "${requested}" — sandbox adapter active` };
  }
  return { adapter: sandboxAdapter, live: false, reason: 'No NIVA_PSP configured — sandbox adapter active' };
}

/** The one entry point routes use. Never throws. */
export function getPSP(): PSPAdapter {
  return resolvePSP().adapter;
}

/** Honest descriptor for API responses / UI labels. */
export function describePSP(): { id: PSPAdapter['id']; sandbox: boolean; reason: string } {
  const { adapter, reason } = resolvePSP();
  return { id: adapter.id, sandbox: adapter.sandbox, reason };
}
