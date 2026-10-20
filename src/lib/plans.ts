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

// Sandbox catalog. Regional pricing strategy documented in docs/10-backlog-risk.md.
export const PLAN_CATALOG: PlanPrice[] = [
  { plan: 'PREMIUM_MONTHLY', amountMinor: 2_490_000_0, currency: 'IRR', periodDays: 30, labelEn: 'Premium Monthly', labelFa: 'پریمیوم ماهانه' },
  { plan: 'PREMIUM_ANNUAL', amountMinor: 24_900_000_0, currency: 'IRR', periodDays: 365, labelEn: 'Premium Annual', labelFa: 'پریمیوم سالانه' },
  { plan: 'FAMILY', amountMinor: 3_990_000_0, currency: 'IRR', periodDays: 30, labelEn: 'Family Monthly', labelFa: 'خانواده ماهانه' },
];
