import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { PLAN_CATALOG, getEntitlementFeatures } from '@/lib/entitlements';
import { randomBytes } from 'crypto';

/** Checkout: creates a PENDING payment + returns a sandbox provider URL. No money moves. */
export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, z.object({ plan: z.enum(['PREMIUM_MONTHLY', 'PREMIUM_ANNUAL', 'FAMILY']) }));
    const price = PLAN_CATALOG.find((p) => p.plan === body.plan);
    if (!price) return apiError(404, 'NOT_FOUND', 'Plan not found');

    let subscription = await db.subscription.findFirst({
      where: { userId: user.id, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      // Provisional row in PENDING state: it only becomes ACTIVE after a
      // verified payment (sandbox confirm or PSP webhook).
      subscription = await db.subscription.create({
        data: { userId: user.id, plan: body.plan, status: 'PENDING', provider: 'SANDBOX' },
      });
    }
    // NOTE: an existing ACTIVE subscription's plan is intentionally NOT
    // pre-mutated at checkout. The purchased plan is derived from the payment
    // amount at confirmation time (risk R-01 remediation).
    const idempotencyKey = `sbx_${randomBytes(16).toString('hex')}`;
    const payment = await db.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: price.amountMinor,
        currency: price.currency,
        provider: 'SANDBOX',
        idempotencyKey,
        status: 'PENDING',
      },
    });
    // Sandbox provider URL — resolves to the in-app confirmation view.
    return json(
      {
        paymentId: payment.id,
        idempotencyKey,
        amountMinor: price.amountMinor,
        currency: price.currency,
        provider: 'SANDBOX',
        redirectView: 'sandbox-checkout',
      },
      201
    );
  });
}

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const { plan, features, expired } = await getEntitlementFeatures(user.id);
    const subs = await db.subscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });
    return json({ plan, features, expired, subscriptions: subs, catalog: PLAN_CATALOG });
  });
}
