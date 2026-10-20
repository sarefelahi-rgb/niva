import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser, assertSameOrigin } from '@/lib/api';
import { PLAN_CATALOG, setEntitlement, type Plan } from '@/lib/entitlements';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

/**
 * Sandbox payment confirmation — simulates the provider redirect-back step.
 *
 * Security model (risk R-01 remediation):
 * - The client NEVER signs anything and never touches the webhook path.
 * - This route is hard-disabled unless PAYMENTS_MODE is 'sandbox' (default in
 *   this environment). In production the real PSP webhook (HMAC-verified,
 *   server-to-server) is the only entitlement writer.
 * - Owner-scoped (withUser + payment→subscription.userId check), PENDING-only,
 *   idempotent replay, and all writes happen in ONE transaction.
 */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  const mode = process.env.PAYMENTS_MODE ?? 'sandbox';
  if (mode !== 'sandbox') {
    return apiError(404, 'NOT_FOUND', 'Sandbox confirmation is disabled for this deployment');
  }
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, 'pay-confirm'), 12, 60_000)) {
      return apiError(429, 'RATE_LIMIT', 'Too many attempts');
    }
    const body = await readJson(
      req,
      z.object({ paymentId: z.string().min(1), result: z.enum(['SUCCEEDED', 'FAILED']) })
    );
    const payment = await db.payment.findUnique({
      where: { id: body.paymentId },
      include: { subscription: true },
    });
    if (!payment || payment.subscription.userId !== user.id) {
      return apiError(404, 'NOT_FOUND', 'Payment not found');
    }
    if (payment.status !== 'PENDING') {
      return json({ ok: true, replay: true, status: payment.status });
    }
    // The purchased plan is derived from the immutable payment amount (the
    // subscription row is intentionally NOT pre-mutated at checkout).
    const price = PLAN_CATALOG.find(
      (p) => p.amountMinor === payment.amount && p.currency === payment.currency
    );
    if (!price) {
      return apiError(422, 'UNKNOWN_PLAN', 'Payment does not map to a catalog plan');
    }
    await db.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: body.result } });
      if (body.result === 'SUCCEEDED') {
        await tx.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            plan: price.plan as Plan,
            status: 'ACTIVE',
            provider: 'SANDBOX',
            providerRef: payment.idempotencyKey,
            currentPeriodEnd: new Date(Date.now() + price.periodDays * 86_400_000),
          },
        });
        await setEntitlement(user.id, price.plan as Plan, price.periodDays, tx);
      }
    });
    await logAudit(
      user.id,
      body.result === 'SUCCEEDED' ? 'PAYMENT_SUCCEEDED' : 'PAYMENT_FAILED',
      'Payment',
      payment.id,
      { provider: 'SANDBOX', mode: 'client-confirm' },
      req.headers.get('x-forwarded-for')
    );
    return json({ ok: true, status: body.result });
  });
}
