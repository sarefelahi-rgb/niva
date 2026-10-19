import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { json, apiError, readJson, assertSameOrigin } from '@/lib/api';
import { setEntitlement } from '@/lib/entitlements';
import { logAudit, logSafetyEvent } from '@/lib/audit';
import type { Plan } from '@/lib/entitlements';

/**
 * Sandbox payment callback. Simulates a provider webhook with:
 * - HMAC-SHA256 signature verification (secret from env; sandbox fallback documented)
 * - Idempotency via unique idempotencyKey + status transition guard
 * - Replay resistance: a payment can only transition PENDING → SUCCEEDED/FAILED once
 * The client success screen is NEVER treated as confirmation — only this server
 * route writes entitlements. Live adapters (Zarinpal/Stripe) plug in here.
 */

const schema = z.object({
  paymentId: z.string(),
  result: z.enum(['SUCCEEDED', 'FAILED']),
  signature: z.string().min(16),
});

function sandboxSecret(): string {
  return process.env.NIVA_SANDBOX_PAYMENT_SECRET ?? 'niva-sandbox-secret-do-not-use-in-production';
}

function sign(paymentId: string, result: string): string {
  return createHmac('sha256', sandboxSecret()).update(`${paymentId}:${result}`).digest('hex');
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  try {
    const body = await readJson(req, schema);
    const expected = sign(body.paymentId, body.result);
    const provided = body.signature;
    if (expected.length !== provided.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
      await logSafetyEvent(null, 'PAYMENT_ANOMALY', 'HIGH', 'Invalid sandbox payment signature');
      return apiError(403, 'BAD_SIGNATURE', 'Payment signature verification failed');
    }
    const payment = await db.payment.findUnique({ where: { id: body.paymentId }, include: { subscription: true } });
    if (!payment) return apiError(404, 'NOT_FOUND', 'Payment not found');
    if (payment.status !== 'PENDING') {
      // Idempotent replay: return the recorded outcome.
      return json({ ok: true, replay: true, status: payment.status });
    }
    await db.payment.update({ where: { id: payment.id }, data: { status: body.result } });
    if (body.result === 'SUCCEEDED') {
      const plan = payment.subscription.plan === 'FREE' ? 'PREMIUM_MONTHLY' : (payment.subscription.plan as Plan);
      const periodDays = plan === 'PREMIUM_ANNUAL' ? 365 : 30;
      await db.subscription.update({
        where: { id: payment.subscription.id },
        data: { plan, status: 'ACTIVE', provider: 'SANDBOX', providerRef: payment.idempotencyKey, currentPeriodEnd: new Date(Date.now() + periodDays * 86_400_000) },
      });
      await setEntitlement(payment.subscription.userId, plan, periodDays);
      await logAudit(payment.subscription.userId, 'PAYMENT_SUCCEEDED', 'Payment', payment.id, { provider: 'SANDBOX' }, req.headers.get('x-forwarded-for'));
    }
    return json({ ok: true, status: body.result });
  } catch (err) {
    if (err instanceof z.ZodError) return apiError(400, 'VALIDATION', 'Invalid payload');
    console.error('[subscription/webhook]', err);
    return apiError(500, 'INTERNAL', 'Webhook processing failed');
  }
}
