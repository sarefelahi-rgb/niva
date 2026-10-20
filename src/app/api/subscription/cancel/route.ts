import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { setEntitlement } from '@/lib/entitlements';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

/**
 * Cancellation (Wave 6.1) — body {when: 'immediate' | 'period_end'} (default
 * immediate for backward compatibility), POST + PATCH.
 *
 * - period_end: sets cancelAtPeriodEnd=true and keeps full access until
 *   currentPeriodEnd; reconciliation (src/lib/billing.ts) then flips the row
 *   to CANCELLED + FREE exactly once when the period lapses. The user gets a
 *   confirmation notification with the end date.
 * - immediate: today's behavior — CANCELLED + FREE atomically.
 *
 * The former GET handler (which minted valid payment callback signatures for
 * any payment — a free-upgrade oracle, risk R-01) was REMOVED in Wave 2 and
 * stays removed.
 */
async function handle(req: Request) {
  if (!rateLimit(clientKey(req, 'pay-cancel'), 8, 60_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many attempts');
  }
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(
      req,
      z.object({
        subscriptionId: z.string(),
        when: z.enum(['immediate', 'period_end']).default('immediate'),
      })
    );
    const sub = await db.subscription.findUnique({ where: { id: body.subscriptionId } });
    if (!sub || sub.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Subscription not found');
    if (sub.status === 'CANCELLED' || sub.status === 'EXPIRED') return json({ ok: true, alreadyEnded: true, status: sub.status });

    const en = user.locale === 'en';
    if (body.when === 'period_end') {
      if (!sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() <= Date.now()) {
        // Nothing left to preserve — an immediate cancel is the honest behavior.
        return apiError(409, 'CONFLICT', 'No remaining paid period to keep — cancel immediately instead');
      }
      await db.subscription.update({
        where: { id: sub.id },
        data: { cancelAtPeriodEnd: true },
      });
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'PAYMENT',
          title: en ? 'Cancellation scheduled' : 'لغو اشتراک زمان‌بندی شد',
          body: en
            ? `Your Premium access stays active until ${sub.currentPeriodEnd.toLocaleDateString('en-US')} and then switches to Free automatically. Changed your mind? Subscribe again anytime.`
            : `دسترسی پریمیوم شما تا ${sub.currentPeriodEnd.toLocaleDateString('fa-IR')} فعال می‌ماند و پس از آن خودکار به رایگان تغییر می‌کند. اگر نظرتان عوض شد، هر زمان می‌توانید دوباره اشتراک بگیرید.`,
        },
      });
      await logAudit(user.id, 'SUBSCRIPTION_CANCEL_SCHEDULED', 'Subscription', sub.id, { endsAt: sub.currentPeriodEnd.toISOString() }, req.headers.get('x-forwarded-for'));
      return json({ ok: true, when: 'period_end', endsAt: sub.currentPeriodEnd });
    }

    await db.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelAtPeriodEnd: false },
      });
      await setEntitlement(user.id, 'FREE', undefined, tx);
    });
    await logAudit(user.id, 'SUBSCRIPTION_CANCELLED', 'Subscription', sub.id, { when: 'immediate' }, req.headers.get('x-forwarded-for'));
    return json({ ok: true, when: 'immediate' });
  });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function PATCH(req: Request) {
  return handle(req);
}
