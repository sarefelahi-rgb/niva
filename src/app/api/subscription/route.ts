import { z } from 'zod';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { getEntitlementFeatures, priceForPlan, catalogForLocale } from '@/lib/entitlements';
import { getPSP, describePSP, PspError } from '@/lib/psp';
import { reconcileExpiredSubscriptions } from '@/lib/billing';

/**
 * Checkout + subscription state (Wave 6.1).
 *
 * POST: creates the PENDING subscription/payment rows, then routes through the
 * active PSP adapter (sandbox by default — see src/lib/psp). The billing
 * currency is derived from the account locale (fa→IRR, en→USD) so each account
 * sees localized pricing. No money moves in the sandbox adapter.
 *
 * GET: runs period-end reconciliation first (idempotent, cheap), then returns
 * the entitlement snapshot, subscription rows (incl. cancelAtPeriodEnd /
 * trialEndsAt), the locale-filtered catalog and trial eligibility.
 */
export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, z.object({ plan: z.enum(['PREMIUM_MONTHLY', 'PREMIUM_ANNUAL', 'FAMILY']) }));
    const price = priceForPlan(body.plan, user.locale);
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

    // Hand off to the active adapter. Real PSPs perform their HTTP dance here;
    // without credentials the factory guarantees the sandbox adapter, so no
    // network call can happen in this build.
    const origin = new URL(req.url).origin;
    const adapter = getPSP();
    try {
      const checkout = await adapter.createCheckout({
        paymentId: payment.id,
        amountMinor: price.amountMinor,
        currency: price.currency,
        callbackUrl: `${origin}/subscription?payment=${payment.id}`,
        locale: user.locale === 'en' ? 'en' : 'fa',
        description: user.locale === 'fa' ? `اشتراک نیوا — ${price.labelFa}` : `NIVA subscription — ${price.labelEn}`,
      });
      if (checkout.providerRef || checkout.detail) {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            provider: adapter.id,
            ...(checkout.providerRef ? { providerRef: checkout.providerRef } : {}),
            statusDetail: checkout.detail,
          },
        });
      }
      return json(
        {
          paymentId: payment.id,
          idempotencyKey,
          amountMinor: price.amountMinor,
          currency: price.currency,
          provider: adapter.id,
          redirectUrl: checkout.redirectUrl,
          redirectView: checkout.redirectView ?? (checkout.redirectUrl ? 'psp-redirect' : 'sandbox-checkout'),
          sandbox: adapter.sandbox,
        },
        201
      );
    } catch (err) {
      // Adapter failure (real PSPs): park the payment as FAILED, surface a typed error.
      const detail = err instanceof PspError ? `${err.code}: ${err.message}` : err instanceof Error ? err.message : 'checkout failed';
      await db.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', statusDetail: detail.slice(0, 500) },
      });
      return apiError(502, 'PSP_ERROR', 'Payment provider checkout failed');
    }
  });
}

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    // Idempotent period-end reconciliation (EXPIRED/CANCELLED + FREE) before
    // reading state — the scheduler tick will call the same function later.
    await reconcileExpiredSubscriptions();

    const { plan, features, expired } = await getEntitlementFeatures(user.id);
    const subs = await db.subscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });
    // Trial guard mirrors POST /api/subscription/trial exactly.
    const blocking = await db.subscription.findFirst({
      where: { userId: user.id, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED'] } },
      select: { id: true },
    });
    const entitlement = await db.entitlement.findUnique({ where: { userId: user.id }, select: { plan: true } });
    const trialEligible = !blocking && (!entitlement || entitlement.plan === 'FREE');
    return json({
      plan,
      features,
      expired,
      subscriptions: subs,
      catalog: catalogForLocale(user.locale),
      trialEligible,
      psp: describePSP(),
    });
  });
}
