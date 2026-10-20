/**
 * NIVA plan catalog & feature matrix — client-safe single source of truth.
 * Imported by both server (lib/entitlements.ts re-exports for API gating)
 * and client (landing pricing transparency). No server-only imports here.
 */

export type Plan = 'FREE' | 'PREMIUM_MONTHLY' | 'PREMIUM_ANNUAL' | 'FAMILY';

export interface PlanFeatures {
  aiMessagesPerDay: number; // -1 = unlimited
  advanced3DLayers: boolean; // placenta/cord/uterus + all gestational stages
  guidedMode: boolean;
  familyAccess: boolean;
  dataExport: boolean; // personal data export is unpaywalled (Wave 0 item 0.8) — flag kept for journal-export scope
  communityPosting: boolean;
  journalExport: boolean;
}

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  FREE: {
    aiMessagesPerDay: 5,
    advanced3DLayers: false,
    guidedMode: false,
    familyAccess: false,
    dataExport: true,
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

// Catalog with localized pricing (Wave 6.1): IRR (rials, minor unit) for the
// Persian market, USD (cents, minor unit) for international accounts. The
// (amountMinor, currency) pair stays the immutable key that confirm/webhook
// use to derive the purchased plan — amounts must never collide across rows.
// Regional pricing strategy documented in docs/10-backlog-risk.md + docs/audit/10-psp.md.
export const PLAN_CATALOG: PlanPrice[] = [
  { plan: 'PREMIUM_MONTHLY', amountMinor: 2_490_000_0, currency: 'IRR', periodDays: 30, labelEn: 'Premium Monthly', labelFa: 'پریمیوم ماهانه' },
  { plan: 'PREMIUM_ANNUAL', amountMinor: 24_900_000_0, currency: 'IRR', periodDays: 365, labelEn: 'Premium Annual', labelFa: 'پریمیوم سالانه' },
  { plan: 'FAMILY', amountMinor: 3_990_000_0, currency: 'IRR', periodDays: 30, labelEn: 'Family Monthly', labelFa: 'خانواده ماهانه' },
  { plan: 'PREMIUM_MONTHLY', amountMinor: 690, currency: 'USD', periodDays: 30, labelEn: 'Premium Monthly', labelFa: 'پریمیوم ماهانه' },
  { plan: 'PREMIUM_ANNUAL', amountMinor: 5900, currency: 'USD', periodDays: 365, labelEn: 'Premium Annual', labelFa: 'پریمیوم سالانه' },
  { plan: 'FAMILY', amountMinor: 990, currency: 'USD', periodDays: 30, labelEn: 'Family Monthly', labelFa: 'خانواده ماهانه' },
];

/** Account-locale → billing currency mapping (fa→IRR, everything else→USD). */
export function localeCurrency(locale: string): 'IRR' | 'USD' {
  return locale === 'en' ? 'USD' : 'IRR';
}

/** The price row for a plan in the account's locale currency (IRR fallback). */
export function priceForPlan(plan: Plan, locale: string): PlanPrice | undefined {
  const currency = localeCurrency(locale);
  return (
    PLAN_CATALOG.find((p) => p.plan === plan && p.currency === currency) ??
    PLAN_CATALOG.find((p) => p.plan === plan && p.currency === 'IRR')
  );
}

/** Locale-filtered catalog for checkout/UI (one price per plan). */
export function catalogForLocale(locale: string): PlanPrice[] {
  const currency = localeCurrency(locale);
  return PLAN_CATALOG.filter((p) => p.currency === currency);
}
