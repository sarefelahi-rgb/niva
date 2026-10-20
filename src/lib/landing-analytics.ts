/**
 * Privacy-preserving landing analytics (backlog item 1.8).
 * - No cookies, no fingerprints, no IPs, no third parties.
 * - Only aggregate event counts, persisted server-side WITHOUT user identity.
 * - Strictly consent-gated: nothing is sent until the visitor explicitly
 *   allows it; declining records nothing at all.
 * - A/B assignment is a local 50/50 split, stored only after consent.
 */

export type AnalyticsConsent = 'granted' | 'denied';
export type AbVariant = 'A' | 'B';

const CONSENT_KEY = 'niva_analytics_consent';
const VARIANT_KEY = 'niva_ab_variant';

export const TRACKABLE_EVENTS = ['landing_view', 'cta_start', 'cta_demo', 'ab_consent_granted'] as const;
export type LandingEventName = (typeof TRACKABLE_EVENTS)[number];

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(CONSENT_KEY);
  return v === 'granted' || v === 'denied' ? v : null;
}

export function setAnalyticsConsent(value: AnalyticsConsent): AbVariant {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch { /* storage unavailable — treat as no consent */ }
  if (value === 'denied') {
    try { window.localStorage.removeItem(VARIANT_KEY); } catch { /* ignore */ }
    return 'A';
  }
  return getOrAssignVariant();
}

/** 50/50 split, sticky across visits. Only meaningful once consent is granted. */
export function getOrAssignVariant(): AbVariant {
  if (typeof window === 'undefined') return 'A';
  try {
    const existing = window.localStorage.getItem(VARIANT_KEY);
    if (existing === 'A' || existing === 'B') return existing;
    const assigned: AbVariant = Math.random() < 0.5 ? 'A' : 'B';
    window.localStorage.setItem(VARIANT_KEY, assigned);
    return assigned;
  } catch {
    return 'A';
  }
}

/** Fire-and-forget aggregate beacon. Silently ignored without consent. */
export function trackLandingEvent(name: LandingEventName): void {
  if (getAnalyticsConsent() !== 'granted') return;
  const variant = getOrAssignVariant();
  try {
    void fetch('/api/analytics/landing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, variant }),
      keepalive: true,
    }).catch(() => undefined);
  } catch { /* never let analytics break the page */ }
}
