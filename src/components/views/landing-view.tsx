'use client';

/**
 * NIVA premium landing — Wave 8 full rebuild ("Embrace / آغوش").
 *
 * Architecture (performance-first, budgets: LCP≤2.5s · CLS≤0.1 · INP≤200ms):
 * - The H1 is the LCP element and renders synchronously in the server HTML.
 * - The 3D "Embrace" scene mounts after idle via next/dynamic { ssr:false } —
 *   three.js never enters the critical path, and the canvas pauses rendering
 *   while offscreen (see hero-bloom.tsx).
 * - The stage panel is aspect-ratio sized: zero layout shift when the scene
 *   swaps in.
 * - Below-fold sections live in one dynamically-imported chunk (sections.tsx).
 * - Ambient background blobs are pure CSS (compositor-only transforms) and
 *   freeze under prefers-reduced-motion via the global rule in globals.css.
 * - Analytics remain anonymous + strictly consent-gated (landing-analytics.ts);
 *   the former A/B hero experiment is retired — every visitor gets the 3D hero.
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
import { useMounted } from '@/lib/use-mounted';
import {
  getAnalyticsConsent, setAnalyticsConsent, trackLandingEvent,
} from '@/lib/landing-analytics';

/** Below-fold sections — separate chunk, skeleton while streaming in. */
const LandingSections = dynamic(
  () => import('@/components/landing/sections').then((m) => m.LandingSections),
  { loading: () => <SectionsSkeleton /> }
);

/** Hero 3D — mounts only after idle; ssr:false keeps three.js out of the initial path. */
const HeroBloom = dynamic(() => import('@/components/landing/hero-bloom'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 niva-grad" aria-hidden="true" />,
});

const NAV_ANCHORS = [
  { id: 'journey', key: 'landing.navJourney' },
  { id: 'science', key: 'landing.navScience' },
  { id: 'features', key: 'landing.navFeatures' },
  { id: 'pricing', key: 'landing.navPricing' },
  { id: 'trust', key: 'landing.navTrust' },
  { id: 'faq', key: 'landing.navFaq' },
] as const;

const STAGE_STATS = [
  { v: '12', k: 'landing.statsStages' },
  { v: '24', k: 'landing.statsSources' },
  { v: '40+', k: 'landing.statsWeeks' },
] as const;

export function LandingView() {
  const { t, setView, user, locale, setLocale } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const [consentChoice, setConsentChoice] = useState<'granted' | 'denied' | null | undefined>(undefined);
  const [bloomReady, setBloomReady] = useState(false);

  // Consent state is derived post-hydration (no setState-in-effect): the bar
  // renders only after mount, so reading localStorage inline is SSR-safe.
  const stored = mounted ? getAnalyticsConsent() : undefined;
  useEffect(() => {
    if (stored === 'granted') trackLandingEvent('landing_view');
  }, [stored]);

  const handleConsent = (choice: 'granted' | 'denied') => {
    setAnalyticsConsent(choice);
    setConsentChoice(choice);
    if (choice === 'granted') trackLandingEvent('ab_consent_granted');
    // Declining records nothing — by design.
  };

  // The 3D embrace mounts after the page is settled (idle) — never at first paint.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => setBloomReady(true), { timeout: 2500 });
      return () => { void id; };
    }
    const timer = setTimeout(() => setBloomReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const go = user ? 'dashboard' : 'auth';

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Ambient background — soft floating blooms (CSS-only, compositor-friendly) */}
      <div className="fixed inset-0 -z-10 niva-grad overflow-hidden" aria-hidden="true">
        <div className="niva-blob h-72 w-72 sm:h-96 sm:w-96 -top-20 -start-16 bg-primary/25" />
        <div className="niva-blob niva-blob-2 h-64 w-64 sm:h-80 sm:w-80 top-1/3 -end-20 bg-secondary/25" />
        <div className="niva-blob niva-blob-3 h-56 w-56 sm:h-72 sm:w-72 bottom-0 start-1/4 bg-accent/30" />
      </div>

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
          <nav className="hidden lg:flex items-center gap-1 mx-auto rounded-full border border-border/60 bg-background/50 px-2 py-1" aria-label={t('landing.footerExplore')}>
            {NAV_ANCHORS.map((a) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors min-h-9 inline-flex items-center"
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
            <Button size="sm" onClick={() => setView(go)} className="min-h-11 rounded-full">
              {user ? t('nav.dashboard') : t('auth.signIn')}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — centered, calm, confident */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-14 sm:pt-20 pb-10 text-center space-y-5">
          <p className="text-sm font-medium text-primary tracking-wide">{t('landing.kicker')}</p>
          <div className="flex justify-center">
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t('landing.reviewBadge')}
            </Badge>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold leading-[1.12] tracking-tight text-balance">
            {t('landing.heroTitle1')}{' '}
            <span className="text-gradient">{t('landing.heroTitle2')}</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t('landing.heroSub')}
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-1">
            <Button size="lg" onClick={() => { trackLandingEvent('cta_start'); setView(go); }} className="min-h-12 px-7 text-base rounded-full" aria-label={t('landing.ctaStart')}>
              {t('landing.ctaStart')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => { trackLandingEvent('cta_demo'); setView('auth'); }} className="min-h-12 px-7 text-base rounded-full">
              {t('landing.ctaDemo')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {t('landing.disclaimer')}
          </p>
        </section>

        {/* 3D stage — the Embrace scene in a calm, framed window */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-20 sm:pb-24" aria-label={t('landing.f1Title')}>
          <div className="relative">
            <div
              className="aspect-[4/3] sm:aspect-[16/9] w-full overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border shadow-2xl niva-card relative"
            >
              {/* Base gradient always present → no flash while three.js streams in */}
              <div className="absolute inset-0 niva-grad" aria-hidden="true" />
              {bloomReady && <HeroBloom />}
              {/* Honesty label — the scene is educational ambiance, not a fetal model */}
              <span className="absolute top-3 end-3 text-[11px] text-muted-foreground bg-background/60 backdrop-blur rounded-full px-2.5 py-1 border border-border/50 flex items-center gap-1">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {t('studio.demoAsset')}
              </span>
              {/* Truthful stat chips — glass, wrap-safe on mobile */}
              <div className="absolute bottom-3 start-3 end-3 flex flex-wrap gap-2 justify-center">
                {STAGE_STATS.map((s) => (
                  <div key={s.k} className="rounded-full border border-border/60 bg-background/60 backdrop-blur px-3.5 py-1.5 text-center">
                    <span className="text-sm font-bold num text-primary">{s.v}</span>{' '}
                    <span className="text-[11px] text-muted-foreground">{t(s.k)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating reassurance card */}
            <Card className="hidden sm:block absolute -bottom-7 start-8 end-auto w-72 niva-card shadow-lg">
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
      {mounted && stored === null && (
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
