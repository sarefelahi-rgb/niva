import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { json, apiError, readJson, assertSameOrigin } from '@/lib/api';
import { PLAN_CATALOG, setEntitlement, type Plan } from '@/lib/entitlements';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit, logSafetyEvent } from '@/lib/audit';

/**
 * Payment provider webhook (server-to-server). Real PSPs (Zarinpal/Stripe)
 * post here with an HMAC-SHA256 signature. Rules:
 * - Secret comes from NIVA_PAYMENT_WEBHOOK_SECRET ONLY — no fallback, the
 *   route fails closed (503) when unconfigured (risk R-01 remediation).
 * - Rate limited, same-origin checked, idempotent via PENDING-only transition.
 * - All writes happen in ONE transaction; entitlements written via tx client.
 * The sandbox client-confirm flow uses /api/subscription/confirm instead.
 */

const schema = z.object({
  paymentId: z.string(),
  result: z.enum(['SUCCEEDED', 'FAILED']),
  signature: z.string().min(16),
});

function sign(paymentId: string, result: string, secret: string): string {
  return createHmac('sha256', secret).update(`${paymentId}:${result}`).digest('hex');
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  if (!rateLimit(clientKey(req, 'psp-webhook'), 60, 60_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many webhook calls');
  }
  const secret = process.env.NIVA_PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: an unconfigured webhook must never process payments.
    return apiError(503, 'CONFIG', 'Payment webhook is not configured');
  }
  try {
    const body = await readJson(req, schema);
    const expected = sign(body.paymentId, body.result, secret);
    const provided = body.signature;
    if (expected.length !== provided.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
      await logSafetyEvent(null, 'PAYMENT_ANOMALY', 'HIGH', 'Invalid payment webhook signature');
      return apiError(403, 'BAD_SIGNATURE', 'Payment signature verification failed');
    }
    const payment = await db.payment.findUnique({ where: { id: body.paymentId }, include: { subscription: true } });
    if (!payment) return apiError(404, 'NOT_FOUND', 'Payment not found');
    if (payment.status !== 'PENDING') {
      // Idempotent replay: return the recorded outcome.
      return json({ ok: true, replay: true, status: payment.status });
    }
    const price = PLAN_CATALOG.find(
      (p) => p.amountMinor === payment.amount && p.currency === payment.currency
    );
    if (!price) return apiError(422, 'UNKNOWN_PLAN', 'Payment does not map to a catalog plan');
    await db.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: body.result } });
      if (body.result === 'SUCCEEDED') {
        await tx.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            plan: price.plan as Plan,
            status: 'ACTIVE',
            provider: 'PSP',
            providerRef: payment.idempotencyKey,
            currentPeriodEnd: new Date(Date.now() + price.periodDays * 86_400_000),
          },
        });
        await setEntitlement(payment.subscription.userId, price.plan as Plan, price.periodDays, tx);
      }
    });
    if (body.result === 'SUCCEEDED') {
      await logAudit(payment.subscription.userId, 'PAYMENT_SUCCEEDED', 'Payment', payment.id, { provider: 'PSP' }, req.headers.get('x-forwarded-for'));
    }
    return json({ ok: true, status: body.result });
  } catch (err) {
    if (err instanceof z.ZodError) return apiError(400, 'VALIDATION', 'Invalid payload');
    console.error('[subscription/webhook]', err);
    return apiError(500, 'INTERNAL', 'Webhook processing failed');
  }
}
