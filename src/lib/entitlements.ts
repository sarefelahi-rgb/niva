/**
 * NIVA server-side entitlements — the single source of truth for plan gating.
 * Client-side UI gating is cosmetic only; every API enforces these rules.
 * Payment webhooks (verified, idempotent) are the only writers of paid plans.
 * See docs/03-api-spec.md §subscription and docs/10-backlog-risk.md.
 */

import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { PLAN_FEATURES, PLAN_CATALOG } from './plans';

// Single shared source for the plan matrix & catalog (client-safe, no db import).
// Re-exported here so every server API keeps its existing import path.
export { PLAN_FEATURES, PLAN_CATALOG };
export type { Plan, PlanFeatures, PlanPrice } from './plans';
import type { Plan, PlanFeatures } from './plans';

/** Any Prisma client (root db or interactive-transaction client). */
export type DbClient = Prisma.TransactionClient | typeof db;

export async function getEntitlementFeatures(userId: string): Promise<{ plan: Plan; features: PlanFeatures; expired: boolean }> {
  const ent = await db.entitlement.findUnique({ where: { userId } });
  const sub = ent
    ? await db.subscription.findFirst({
        where: { userId, plan: { not: 'FREE' }, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
        orderBy: { createdAt: 'desc' },
      })
    : null;
  const expired = Boolean(sub?.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now());
  const plan: Plan = expired || !ent ? 'FREE' : (ent.plan as Plan);
  return { plan, features: PLAN_FEATURES[plan], expired };
}

export async function setEntitlement(userId: string, plan: Plan, periodDays?: number, client: DbClient = db): Promise<void> {
  const features = PLAN_FEATURES[plan];
  await client.entitlement.upsert({
    where: { userId },
    create: { userId, plan, features: JSON.stringify(features) },
    update: { plan, features: JSON.stringify(features) },
  });
  if (plan !== 'FREE' && periodDays) {
    await client.subscription.updateMany({
      where: { userId, plan, status: { in: ['ACTIVE', 'TRIALING'] } },
      data: { currentPeriodEnd: new Date(Date.now() + periodDays * 86_400_000) },
    });
  }
  await client.notification.create({
    data: {
      userId,
      title: plan === 'FREE' ? 'Plan updated' : 'Subscription active',
      body: plan === 'FREE' ? 'Your plan is now Free.' : `Your ${plan.replace('_', ' ').toLowerCase()} plan is active. Thank you for supporting NIVA.`,
      type: 'PAYMENT',
    },
  });
}
