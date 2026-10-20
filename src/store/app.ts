'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translate, type Locale, isRtl } from '@/lib/i18n';
import { clearToken } from '@/lib/auth-token';

export type View =
  | 'landing' | 'auth' | 'onboarding' | 'dashboard' | 'timeline' | 'studio'
  | 'tracking' | 'assistant' | 'records' | 'appointments' | 'wellness'
  | 'birth' | 'postpartum' | 'family' | 'community' | 'journal'
  | 'subscription' | 'settings' | 'admin' | 'review' | 'safety' | 'sandbox-checkout';

export interface SessionUser {
  id: string;
  email: string;
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
 */
function writeLocaleCookie(l: Locale) {
  if (typeof document !== 'undefined') {
    document.cookie = `niva-locale=${l}; path=/; max-age=31536000; samesite=lax`;
  }
}

/** The `?lang=` deep link outranks the persisted preference on boot. */
function bootLocale(rehydrated: Locale): Locale {
  if (typeof window === 'undefined') return rehydrated;
  const q = new URLSearchParams(window.location.search).get('lang');
  return q === 'fa' || q === 'en' ? q : rehydrated;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'landing',
      locale: 'fa',
      booted: false,
      user: null,
      pregnancy: null,
      plan: 'FREE',
      features: null,
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
              pregnancy: data.pregnancy,
              plan: data.plan,
              features: data.features,
              booted: true,
            });
            get().setLocale(data.user.locale as Locale);
          } else {
            set({ user: null, pregnancy: null, booted: true });
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
          set({ user: null, pregnancy: null, plan: 'FREE', features: null, view: 'landing' });
        }
      },
    }),
    {
      name: 'niva-app',
      partialize: (s) => ({ locale: s.locale, tourDone: s.tourDone }),
      // localStorage rehydration is synchronous, so this runs BEFORE the
      // first React render: DOM attributes + cookie are synced from the
      // persisted (or ?lang=) locale immediately, keeping the client's first
      // render aligned with the proxy-resolved SSR document.
      onRehydrateStorage: () => (state) => {
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
