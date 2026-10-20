import { db } from '@/lib/db';
import { json, apiError, assertSameOrigin } from '@/lib/api';
import { setEntitlement } from '@/lib/entitlements';
import { getPSP } from '@/lib/psp';
import { issueInvoice, planForAmount } from '@/lib/billing';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit, logSafetyEvent } from '@/lib/audit';

/**
 * Payment provider webhook (server-to-server) — Wave 6.1 adapter architecture.
 * Every parse/verify decision belongs to the active PSP adapter
 * (src/lib/psp): sandbox = HMAC-SHA256 over `${paymentId}:${result}` with
 * NIVA_PAYMENT_WEBHOOK_SECRET; Zarinpal = Authority/Status + verify endpoint;
 * Stripe = Stripe-Signature t=/v1= HMAC over the raw payload.
 *
 * Invariants (unchanged from Wave 2, now adapter-agnostic):
 * - Fail closed: an unconfigured sandbox webhook answers 503 and never
 *   processes payments (risk R-01 remediation). Real adapters fail closed on
 *   their own missing webhook secrets (configError → 503).
 * - Rate limited, same-origin checked (server-to-server callers pass by
 *   design), idempotent via the PENDING-only transition + unique
 *   idempotencyKey.
 * - All writes happen in ONE transaction; the invoice is issued inside it.
 * The sandbox client-confirm flow uses /api/subscription/confirm instead.
 */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  if (!rateLimit(clientKey(req, 'psp-webhook'), 60, 60_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many webhook calls');
  }
  const adapter = getPSP();
  const parsed = await adapter.verifyAndParseWebhook(req);
  if (parsed.configError) {
    // Fail closed: an unconfigured webhook must never process payments.
    return apiError(503, 'CONFIG', parsed.detail ?? 'Payment webhook is not configured');
  }
  if (!parsed.ok) {
    await logSafetyEvent(null, 'PAYMENT_ANOMALY', 'HIGH', `Invalid ${adapter.id} webhook: ${parsed.detail ?? 'unverified'}`);
    return apiError(403, 'BAD_SIGNATURE', 'Payment signature verification failed');
  }
  if (parsed.retryable) {
    // PSP unreachable for verification — ask the provider to retry later.
    return apiError(503, 'PSP_UNAVAILABLE', 'Verification temporarily unavailable, retry later');
  }
  if (!parsed.paymentRef || !parsed.result) {
    // Verifiable but not a payment-lifecycle event (e.g. ignored Stripe event types).
    return json({ ok: true, ignored: true, detail: parsed.detail });
  }
  try {
    const payment = await db.payment.findUnique({
      where: { id: parsed.paymentRef },
      include: { subscription: true },
    });
    if (!payment) return apiError(404, 'NOT_FOUND', 'Payment not found');
    if (payment.status !== 'PENDING') {
      // Idempotent replay: return the recorded outcome.
      return json({ ok: true, replay: true, status: payment.status });
    }
    // The purchased plan is derived from the immutable payment amount.
    const price = planForAmount(payment.amount, payment.currency);
    if (!price) return apiError(422, 'UNKNOWN_PLAN', 'Payment does not map to a catalog plan');
    const invoice = await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: parsed.result, statusDetail: parsed.detail ?? null },
      });
      let issued: { id: string; number: string } | null = null;
      if (parsed.result === 'SUCCEEDED') {
        await tx.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            plan: price.plan,
            status: 'ACTIVE',
            provider: adapter.id,
            providerRef: payment.idempotencyKey,
            currentPeriodEnd: new Date(Date.now() + price.periodDays * 86_400_000),
          },
        });
        await setEntitlement(payment.subscription.userId, price.plan, price.periodDays, tx);
        issued = await issueInvoice(tx, { payment, subscription: payment.subscription, price });
      }
      return issued;
    });
    if (parsed.result === 'SUCCEEDED') {
      await logAudit(payment.subscription.userId, 'PAYMENT_SUCCEEDED', 'Payment', payment.id, { provider: adapter.id, invoice: invoice?.number }, req.headers.get('x-forwarded-for'));
    } else {
      await logAudit(payment.subscription.userId, 'PAYMENT_FAILED', 'Payment', payment.id, { provider: adapter.id }, req.headers.get('x-forwarded-for'));
    }
    return json({ ok: true, status: parsed.result, invoiceNumber: invoice?.number });
  } catch (err) {
    console.error('[subscription/webhook]', err);
    return apiError(500, 'INTERNAL', 'Webhook processing failed');
  }
}
