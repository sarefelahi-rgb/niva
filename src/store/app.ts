'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translate, type Locale, isRtl } from '@/lib/i18n';
import { clearToken } from '@/lib/auth-token';

export type View =
  | 'landing' | 'auth' | 'onboarding' | 'dashboard' | 'timeline' | 'studio'
  | 'tracking' | 'assistant' | 'records' | 'appointments' | 'wellness'
  | 'birth' | 'postpartum' | 'fertility' | 'family' | 'community' | 'journal'
  | 'subscription' | 'settings' | 'admin' | 'review' | 'safety' | 'sandbox-checkout'
  | 'doctors' | 'doctor' | 'nutrition' | 'screenings';

export interface SessionUser {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  role: string;
  locale: Locale;
}

export interface SessionPregnancy {
  id: string;
  label: string;
  dueDate: string;
  lmpDate: string | null;
  datingMethod: string;
  datingLocked: boolean;
  datingConfidence: string;
  plurality: string;
  specialCare?: boolean;
  status: string;
}

export interface PlanFeatures {
  aiMessagesPerDay: number;
  advanced3DLayers: boolean;
  guidedMode: boolean;
  familyAccess: boolean;
  dataExport: boolean;
  communityPosting: boolean;
  journalExport: boolean;
}

interface AppState {
  view: View;
  locale: Locale;
  booted: boolean;
  user: SessionUser | null;
  pregnancy: SessionPregnancy | null;
  plan: string;
  features: PlanFeatures | null;
  stage: string | null;
  onboardingRequired: boolean;
  onboardingComplete: boolean;
  tourDone: boolean;
  tourOpen: boolean;
  setView: (v: View) => void;
  setLocale: (l: Locale) => void;
  setTourDone: (d: boolean) => void;
  openTour: () => void;
  closeTour: () => void;
  t: (key: string) => string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Wave 7 — client mirror of the SSR locale resolution (src/proxy.ts). Every
 * locale change writes the `niva-locale` cookie so the next server render
 * (full load / RSC prefetch) resolves to the same document locale the client
 * will render — the server/client pair never diverges again after boot.
 *
 * Wave 19 — the COOKIE is the single boot source for the locale. Zustand's
 * localStorage mirror previously raced it: a user whose cookie was cleared
 * (or written by another device/tab) while localStorage still said «en»
 * booted SSR=fa / client=en and React regenerated the whole tree (hydration
 * mismatch, visible locale flash). Reading the same cookie the proxy reads —
 * synchronously, before the first render — keeps both sides identical by
 * construction. `locale` is therefore excluded from `partialize` below.
 */
function writeLocaleCookie(l: Locale) {
  if (typeof document !== 'undefined') {
    document.cookie = `niva-locale=${l}; path=/; max-age=31536000; samesite=lax`;
  }
}

/** Read the proxy's locale cookie (same name as src/proxy.ts). */
function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null;
  const m = /(?:^|; )niva-locale=(fa|en)(?:;|$)/.exec(document.cookie);
  return m ? (m[1] as Locale) : null;
}

/** The `?lang=` deep link outranks the cookie on boot (mirrors proxy.ts). */
function bootLocale(fallback: Locale): Locale {
  if (typeof window === 'undefined') return fallback;
  const q = new URLSearchParams(window.location.search).get('lang');
  if (q === 'fa' || q === 'en') return q;
  return readLocaleCookie() ?? fallback;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'landing',
      // Boot from the same source the proxy resolves SSR from (the cookie),
      // so the very first client render matches the server HTML.
      locale: bootLocale('fa'),
      booted: false,
      user: null,
      pregnancy: null,
      plan: 'FREE',
      features: null,
      stage: null,
      onboardingRequired: false,
      onboardingComplete: true,
      tourDone: false,
      tourOpen: false,
      setView: (v) => {
        set({ view: v });
        if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
      },
      setLocale: (l) => {
        set({ locale: l });
        if (typeof document !== 'undefined') {
          document.documentElement.lang = l;
          document.documentElement.dir = isRtl(l) ? 'rtl' : 'ltr';
        }
        writeLocaleCookie(l);
      },
      setTourDone: (d) => set({ tourDone: d }),
      openTour: () => set({ tourOpen: true }),
      closeTour: () => {
        set({ tourOpen: false, tourDone: true });
      },
      t: (key) => translate(get().locale, key),
      refresh: async () => {
        try {
          const res = await fetch('/api/auth/me', { cache: 'no-store' });
          const data = await res.json();
          if (data.user) {
            set({
              user: data.user,
              pregnancy: data.pregnancy ?? null,
              plan: data.plan,
              features: data.features,
              stage: data.stage ?? null,
              onboardingRequired: Boolean(data.onboardingRequired),
              onboardingComplete: data.onboardingComplete !== false,
              booted: true,
            });
            get().setLocale(data.user.locale as Locale);
          } else {
            set({ user: null, pregnancy: null, stage: null, onboardingRequired: false, onboardingComplete: true, booted: true });
          }
        } catch {
          set({ booted: true });
        }
      },
      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
          clearToken();
          set({ user: null, pregnancy: null, plan: 'FREE', features: null, stage: null, onboardingRequired: false, onboardingComplete: true, view: 'landing' });
        }
      },
    }),
    {
      name: 'niva-app',
      // locale is cookie-owned (see bootLocale) — persisting it here created
      // a second source of truth that could disagree with the SSR cookie.
      partialize: (s) => ({ tourDone: s.tourDone }),
      onRehydrateStorage: () => (state) => {
        // Re-derive from cookie/?lang= in case the cookie changed in another
        // tab while this one held a stale in-memory value.
        if (state) state.setLocale(bootLocale(state.locale));
      },
    }
  )
);

/** Currency formatting for sandbox IRR amounts (Toman display convention). */
export function formatToman(minor: number, locale: Locale): string {
  const amount = Math.round(minor / 10);
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(amount) + (locale === 'fa' ? ' تومان' : ' Toman');
}
