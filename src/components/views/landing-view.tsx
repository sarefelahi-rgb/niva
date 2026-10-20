'use client';

/**
 * NIVA premium landing (Phase 2 / backlog items 1.6–1.8).
 * Architecture:
 * - Hero renders synchronously: the H1 is the LCP element, the visual is a
 *   sized <img> (no CLS). The 3D "bloom" is variant B only and mounts after
 *   idle via dynamic import so it never competes with LCP.
 * - Below-fold sections live in one dynamically-imported chunk.
 * - Structured data: Organization + SoftwareApplication (static, in head of
 *   the document) and FAQPage (rendered with the FAQ section itself).
 * - Analytics are anonymous + strictly consent-gated (landing-analytics.ts);
 *   A/B (hero static vs hero 3D) is assigned only after consent.
 */

import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Lock, Languages, Moon, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import {
  getAnalyticsConsent, setAnalyticsConsent, trackLandingEvent,
  type AbVariant,
} from '@/lib/landing-analytics';

/** Below-fold sections — separate chunk, skeleton while streaming in. */
const LandingSections = dynamic(
  () => import('@/components/landing/sections').then((m) => m.LandingSections),
  { loading: () => <SectionsSkeleton /> }
);

/** Variant-B hero 3D — mounts only after idle; ssr:false keeps three.js out of the initial path. */
const HeroBloom = dynamic(() => import('@/components/landing/hero-bloom'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 niva-grad opacity-60" aria-hidden="true" />,
});

const NAV_ANCHORS = [
  { id: 'journey', key: 'landing.navJourney' },
  { id: 'science', key: 'landing.navScience' },
  { id: 'features', key: 'landing.navFeatures' },
  { id: 'pricing', key: 'landing.navPricing' },
  { id: 'trust', key: 'landing.navTrust' },
  { id: 'faq', key: 'landing.navFaq' },
] as const;

export function LandingView() {
  const { t, setView, user, locale, setLocale } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [consentChoice, setConsentChoice] = useState<'granted' | 'denied' | null | undefined>(undefined);
  const [variant, setVariant] = useState<AbVariant>('A');
  const [bloomReady, setBloomReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Consent + variant boot (client-only state).
  useEffect(() => {
    const stored = getAnalyticsConsent();
    setConsentChoice(stored);
    if (stored === 'granted') {
      import('@/lib/landing-analytics').then((m) => {
        setVariant(m.getOrAssignVariant());
        m.trackLandingEvent('landing_view');
      });
    }
  }, []);

  // Variant B: mount the 3D bloom after the page is settled (idle), never at first paint.
  useEffect(() => {
    if (variant !== 'B') return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const cancel = () => {};
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => setBloomReady(true), { timeout: 2500 });
      return () => { void id; cancel(); };
    }
    const t = setTimeout(() => setBloomReady(true), 1200);
    return () => clearTimeout(t);
  }, [variant]);

  const go = user ? 'dashboard' : 'auth';

  const handleConsent = (choice: 'granted' | 'denied') => {
    const v = setAnalyticsConsent(choice);
    setVariant(v);
    setConsentChoice(choice);
    if (choice === 'granted') trackLandingEvent('ab_consent_granted');
    // Declining records nothing — by design.
  };

  return (
    <div className="min-h-screen flex flex-col niva-grad">
      {/* Organization / SoftwareApplication structured data — locale-aware copy.
          Rendered AFTER mount: SSR text would otherwise mismatch the client's
          persisted locale (dangerouslySetInnerHTML is not covered by
          suppressHydrationWarning). Crawlers execute JS, so SEO still sees it. */}
      {mounted && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                name: 'NIVA',
                alternateName: 'نیوا',
                url: '/',
                description: t('landing.disclaimer'),
              },
              {
                '@type': 'SoftwareApplication',
                name: 'NIVA — Pregnancy Intelligence Platform',
                applicationCategory: 'HealthApplication',
                operatingSystem: 'Web',
                inLanguage: locale,
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'IRR' },
                description: t('app.description'),
                isAccessibleForFree: true,
              },
            ],
          }),
          }}
        />
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/50">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-4">
          <a href="#" className="flex items-center gap-2" aria-label="NIVA">
            <img src="/logo.svg" alt="" width={92} height={26} className="h-7 w-auto" />
          </a>
          <nav className="hidden lg:flex items-center gap-1 mx-auto" aria-label={t('landing.footerExplore')}>
            {NAV_ANCHORS.map((a) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors min-h-11 inline-flex items-center"
              >
                {t(a.key)}
              </a>
            ))}
          </nav>
          <div className="ms-auto lg:ms-0 flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')} aria-label="language" className="min-h-11">
              <Languages className="h-4 w-4 me-1" aria-hidden="true" />
              {locale === 'fa' ? 'English' : 'فارسی'}
            </Button>
            {mounted && (
              <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label={t('settings.theme')}>
                {resolvedTheme === 'dark' ? '☀️' : <Moon className="h-4 w-4" aria-hidden="true" />}
              </Button>
            )}
            <Button size="sm" onClick={() => setView(go)} className="min-h-11">
              {user ? t('nav.dashboard') : t('auth.signIn')}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-16 pb-12 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <p className="text-sm font-medium text-primary tracking-wide">{t('landing.kicker')}</p>
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t('landing.reviewBadge')}
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.15] tracking-tight">
              {t('landing.heroTitle')}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              {t('landing.heroSub')}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => { trackLandingEvent('cta_start'); setView(go); }} className="min-h-12 px-6 text-base" aria-label={t('landing.ctaStart')}>
                {t('landing.ctaStart')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => { trackLandingEvent('cta_demo'); setView('auth'); }} className="min-h-12 px-6 text-base">
                {t('landing.ctaDemo')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed border-s-2 border-primary/40 ps-3">
              {t('landing.disclaimer')}
            </p>
          </div>

          {/* Hero visual — sized containers prevent CLS. Variant B swaps the
              static art for the lazy 3D bloom after idle. */}
          <div className="relative">
            <div className="aspect-[4/5] max-h-[520px] w-full overflow-hidden rounded-3xl border shadow-2xl niva-card relative">
              {variant === 'B' && bloomReady ? (
                <>
                  <div className="absolute inset-0 niva-grad" aria-hidden="true" />
                  <HeroBloom />
                  <span className="absolute bottom-3 start-3 text-[11px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {t('studio.demoAsset')}
                  </span>
                </>
              ) : (
                <img
                  src="/hero.png"
                  alt={locale === 'fa' ? 'تصویر آرامش‌بخش بارداری' : 'Calm pregnancy illustration'}
                  width={800}
                  height={1000}
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <Card className="absolute -bottom-5 start-4 end-10 niva-card shadow-lg">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-secondary/20 text-secondary-foreground shrink-0">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{t('landing.f1Title')}</p>
                  <p className="text-xs text-muted-foreground truncate">{t('studio.sub')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Stats strip */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-4" aria-label={t('landing.navFeatures')}>
          <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto text-center">
            {[
              { v: '12', k: 'landing.statsStages' },
              { v: '24', k: 'landing.statsSources' },
              { v: '40+', k: 'landing.statsWeeks' },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border bg-background/50 py-4 px-2">
                <p className="text-2xl sm:text-3xl font-bold num text-primary">{s.v}</p>
                <p className="text-xs text-muted-foreground mt-1">{t(s.k)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Below-fold sections — one dynamic chunk */}
        <LandingSections />
      </main>

      {/* Footer — sticky via flex column + mt-auto */}
      <footer className="mt-auto border-t bg-background/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <img src="/logo.svg" alt="NIVA" width={92} height={26} className="h-7 w-auto" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">{t('landing.footerRights')}</p>
          </div>
          <nav aria-label={t('landing.footerExploreFooter')} className="space-y-2">
            <h2 className="text-sm font-semibold">{t('landing.footerExplore')}</h2>
            <ul className="space-y-1.5">
              {NAV_ANCHORS.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <a href={`#${a.id}`} className="text-sm text-muted-foreground hover:text-foreground min-h-11 inline-flex items-center sm:min-h-0 sm:py-1">
                    {t(a.key)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">{t('landing.footerLegal')}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('landing.disclaimer')}</p>
          </div>
        </div>
        <div className="border-t border-border/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 text-center text-xs text-muted-foreground">
            NIVA · {new Date().getFullYear()}
          </div>
        </div>
      </footer>

      {/* Consent bar — anonymous analytics opt-in (declining records nothing) */}
      {consentChoice === null && (
        <div
          role="dialog"
          aria-label={t('landing.abText')}
          className="fixed bottom-4 start-4 end-4 sm:end-auto sm:max-w-md z-50 rounded-2xl border bg-background/95 backdrop-blur shadow-xl p-4 space-y-3"
        >
          <p className="text-sm leading-relaxed">{t('landing.abText')}</p>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" className="min-h-11" onClick={() => handleConsent('denied')}>
              {t('landing.abDecline')}
            </Button>
            <Button size="sm" className="min-h-11" onClick={() => handleConsent('granted')}>
              {t('landing.abAccept')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 space-y-8" aria-hidden="true">
      <div className="space-y-3 text-center">
        <Skeleton className="h-4 w-40 mx-auto" />
        <Skeleton className="h-9 w-72 mx-auto" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
