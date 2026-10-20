import { db } from '@/lib/db';
import { json, apiError, withUser } from '@/lib/api';
import { setEntitlement } from '@/lib/entitlements';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

export const TRIAL_DAYS = 7;

/**
 * One-time 7-day PREMIUM trial (Wave 6.1). Eligibility (mirrors the
 * trialEligible computation in GET /api/subscription):
 *   - no subscription row with status in (ACTIVE, TRIALING, PAST_DUE, CANCELLED)
 *   - AND current entitlement plan === 'FREE'
 * (EXPIRED subscriptions do not block; the residual repeat-trial gap after
 * expiry is a documented rule, see docs/audit/10-psp.md §Trial abuse rules.)
 *
 * Creates a TRIALING subscription (trialEndsAt = currentPeriodEnd = now+7d),
 * flips the entitlement to PREMIUM_MONTHLY for 7 days, notifies + audits.
 * Ineligible accounts get 409 TRIAL_INELIGIBLE. Idempotency comes from the
 * guard itself — a second call while TRIALING is always 409.
 */
export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, 'trial'), 5, 60_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many attempts');
  }
  return withUser(req, [], async ({ user }) => {
    const blocking = await db.subscription.findFirst({
      where: { userId: user.id, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED'] } },
      select: { id: true, status: true },
    });
    const entitlement = await db.entitlement.findUnique({ where: { userId: user.id }, select: { plan: true } });
    if (blocking || (entitlement && entitlement.plan !== 'FREE')) {
      return apiError(409, 'TRIAL_INELIGIBLE', 'This account is not eligible for the free trial');
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
    const subscription = await db.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          userId: user.id,
          plan: 'PREMIUM_MONTHLY',
          status: 'TRIALING',
          provider: 'SANDBOX',
          providerRef: `trial_${TRIAL_DAYS}d`,
          currentPeriodEnd: trialEndsAt,
          trialEndsAt,
        },
      });
      await setEntitlement(user.id, 'PREMIUM_MONTHLY', TRIAL_DAYS, tx, { skipNotification: true });
      const en = user.locale === 'en';
      await tx.notification.create({
        data: {
          userId: user.id,
          title: en ? 'Your free trial has started' : 'دوره آزمایشی رایگان شما آغاز شد',
          body: en
            ? 'Enjoy 7 days of full Premium — every feature, no payment details needed. We will remind you before it ends.'
            : 'هفت روز همهٔ امکانات پریمیوم برای شما باز است — بدون نیاز به اطلاعات پرداخت. پیش از پایان، یادآوری می‌کنیم.',
          type: 'PAYMENT',
        },
      });
      return sub;
    });
    await logAudit(user.id, 'TRIAL_STARTED', 'Subscription', subscription.id, { days: TRIAL_DAYS }, req.headers.get('x-forwarded-for'));
    return json(
      {
        ok: true,
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
      },
      201
    );
  });
}
