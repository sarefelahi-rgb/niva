import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser, assertSameOrigin } from '@/lib/api';
import { setEntitlement } from '@/lib/entitlements';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

/**
 * Cancellation. The former GET handler (which minted valid payment callback
 * signatures for any payment — a free-upgrade oracle, risk R-01) has been
 * REMOVED. Cancellation is transactional and entitlements degrade to FREE
 * atomically. Period-end grace is scheduled for the real PSP integration
 * (docs/audit/02-backlog.md item 6.1).
 */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  if (!rateLimit(clientKey(req, 'pay-cancel'), 8, 60_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many attempts');
  }
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, z.object({ subscriptionId: z.string() }));
    const sub = await db.subscription.findUnique({ where: { id: body.subscriptionId } });
    if (!sub || sub.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Subscription not found');
    if (sub.status === 'CANCELLED') return json({ ok: true });
    await db.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await setEntitlement(user.id, 'FREE', undefined, tx);
    });
    await logAudit(user.id, 'SUBSCRIPTION_CANCELLED', 'Subscription', sub.id, null, req.headers.get('x-forwarded-for'));
    return json({ ok: true });
  });
}
