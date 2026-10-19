/**
 * NIVA server-side entitlements — the single source of truth for plan gating.
 * Client-side UI gating is cosmetic only; every API enforces these rules.
 * Payment webhooks (verified, idempotent) are the only writers of paid plans.
 * See docs/03-api-spec.md §subscription and docs/10-backlog-risk.md.
 */

import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export type Plan = 'FREE' | 'PREMIUM_MONTHLY' | 'PREMIUM_ANNUAL' | 'FAMILY';

/** Any Prisma client (root db or interactive-transaction client). */
export type DbClient = Prisma.TransactionClient | typeof db;

export interface PlanFeatures {
  aiMessagesPerDay: number; // -1 = unlimited
  advanced3DLayers: boolean; // placenta/cord/uterus + all gestational stages
  guidedMode: boolean;
  familyAccess: boolean;
  dataExport: boolean;
  communityPosting: boolean;
  journalExport: boolean;
}

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  FREE: {
    aiMessagesPerDay: 5,
    advanced3DLayers: false,
    guidedMode: false,
    familyAccess: false,
    dataExport: false,
    communityPosting: true,
    journalExport: false,
  },
  PREMIUM_MONTHLY: {
    aiMessagesPerDay: -1,
    advanced3DLayers: true,
    guidedMode: true,
    familyAccess: true,
    dataExport: true,
    communityPosting: true,
    journalExport: true,
  },
  PREMIUM_ANNUAL: {
    aiMessagesPerDay: -1,
    advanced3DLayers: true,
    guidedMode: true,
    familyAccess: true,
    dataExport: true,
    communityPosting: true,
    journalExport: true,
  },
  FAMILY: {
    aiMessagesPerDay: -1,
    advanced3DLayers: true,
    guidedMode: true,
    familyAccess: true,
    dataExport: true,
    communityPosting: true,
    journalExport: true,
  },
};

export interface PlanPrice {
  plan: Plan;
  amountMinor: number;
  currency: 'IRR' | 'USD';
  periodDays: number;
  labelEn: string;
  labelFa: string;
}

// Sandbox catalog. Regional pricing strategy documented in docs/10-backlog-risk.md.
export const PLAN_CATALOG: PlanPrice[] = [
  { plan: 'PREMIUM_MONTHLY', amountMinor: 2_490_000_0, currency: 'IRR', periodDays: 30, labelEn: 'Premium Monthly', labelFa: 'پریمیوم ماهانه' },
  { plan: 'PREMIUM_ANNUAL', amountMinor: 24_900_000_0, currency: 'IRR', periodDays: 365, labelEn: 'Premium Annual', labelFa: 'پریمیوم سالانه' },
  { plan: 'FAMILY', amountMinor: 3_990_000_0, currency: 'IRR', periodDays: 30, labelEn: 'Family Monthly', labelFa: 'خانواده ماهانه' },
];

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
