'use client';

/**
 * NIVA professional landing — Wave 15 full rebuild ("Bloom").
 *
 * Architecture (performance-first, budgets: LCP≤2.5s · CLS≤0.1 · INP≤200ms):
 * - The H1 + hero illustration are the LCP elements; both render synchronously
 *   in the initial HTML/CSS path. The illustration is a plain <img> with
 *   explicit dimensions (zero layout shift) and high fetch priority.
 * - Below-fold sections (journey, features, 3D studio, science, pricing, faq)
 *   live in one dynamically-imported chunk (sections.tsx). three.js never
 *   enters the critical path — it mounts inside that chunk after idle, and
 *   pauses while offscreen (hero-bloom.tsx).
 * - Ambient background blobs + floating hero cards are pure CSS
 *   (compositor-only transforms) and freeze under prefers-reduced-motion via
 *   the global rule in globals.css.
 * - Analytics remain anonymous + strictly consent-gated (landing-analytics.ts).
 */

import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight, Languages, Moon, ShieldCheck, BookOpenText, HeartHandshake,
  Flower2, Sparkles, MessagesSquare, Baby, HeartPulse,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useMounted } from '@/lib/use-mounted';
import {
  getAnalyticsConsent, setAnalyticsConsent, trackLandingEvent,
} from '@/lib/landing-analytics';

/** Below-fold sections — separate chunk, skeleton while streaming in. */
const LandingSections = dynamic(
  () => import('@/components/landing/sections').then((m) => m.LandingSections),
  { loading: () => <SectionsSkeleton /> }
);

const NAV_ANCHORS = [
  { id: 'journey', key: 'landing.navJourney' },
  { id: 'features', key: 'landing.navFeatures' },
  { id: 'science', key: 'landing.navScience' },
  { id: 'pricing', key: 'landing.navPricing' },
  { id: 'trust', key: 'landing.navTrust' },
  { id: 'faq', key: 'landing.navFaq' },
] as const;

/** Pastel-gradient icon chip — reuses the block-menu tile palette. */
function TileIcon({ icon: Icon, tile, className = 'h-10 w-10' }: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
  tile: number;
  className?: string;
}) {
  return (
    <span
      className={`grid place-items-center rounded-2xl ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--tile-' + tile + '-bg), var(--tile-' + tile + '-bg2))',
        color: 'var(--tile-' + tile + '-fg)',
      }}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

/** Floating glass card around the hero illustration. */
function FloatCard({ icon, tile, title, sub, className, floatClass }: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
  tile: number;
  title: string;
  sub: string;
  className?: string;
  floatClass: string;
}) {
  return (
    <div className={`absolute z-10 ${className} ${floatClass}`}>
      <div className="niva-card rounded-2xl px-3.5 py-3 flex items-center gap-2.5 shadow-lg">
        <TileIcon icon={icon} tile={tile} className="h-9 w-9 shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight">{title}</p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate max-w-[10rem]">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export function LandingView() {
  const { t, setView, user, locale, setLocale } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const [consentChoice, setConsentChoice] = useState<'granted' | 'denied' | null | undefined>(undefined);

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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/50">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-3">
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
            <Button size="sm" onClick={() => setView(go)} className="min-h-11 rounded-full shadow-sm shadow-primary/30">
              {user ? t('nav.dashboard') : t('auth.signIn')}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero — split: emotional copy + illustrated embrace ───────────── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-14 pb-10 grid lg:grid-cols-[1.04fr_0.96fr] gap-10 lg:gap-6 items-center">
          {/* Copy */}
          <div className="space-y-6 text-center lg:text-start order-2 lg:order-1">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-sm font-medium text-primary">
              <Flower2 className="h-4 w-4" aria-hidden="true" />
              {t('landing.heroKicker2')}
            </p>
            <h1 className="text-4xl sm:text-5xl xl:text-[3.4rem] font-bold leading-[1.14] tracking-tight text-balance">
              {t('landing.heroTitleNew1')}{' '}
              <span className="text-gradient">{t('landing.heroTitleNew2')}</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
              {t('landing.heroSubNew')}
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-1">
              <Button size="lg" onClick={() => { trackLandingEvent('cta_start'); setView(go); }} className="min-h-12 px-7 text-base rounded-full shadow-lg shadow-primary/25" aria-label={t('landing.ctaStart')}>
                {t('landing.ctaStart')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => { trackLandingEvent('cta_demo'); setView('auth'); }} className="min-h-12 px-7 text-base rounded-full bg-background/60 backdrop-blur">
                {t('landing.ctaDemo')}
              </Button>
            </div>
            {/* Trust chips */}
            <ul className="flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start text-sm text-muted-foreground pt-1">
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-secondary-foreground" aria-hidden="true" />
                {t('landing.chipPrivate')}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <BookOpenText className="h-4 w-4 text-primary" aria-hidden="true" />
                {t('landing.chipSources')}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <HeartHandshake className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
                {t('landing.chipFull')}
              </li>
            </ul>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed mx-auto lg:mx-0">
              {t('landing.disclaimer')}
            </p>
          </div>

          {/* Visual — illustrated embrace in an arch frame with floating cards */}
          <div className="relative order-1 lg:order-2 mx-auto w-full max-w-[400px] sm:max-w-[430px]">
            <div className="relative">
              {/* Sparkle decorations */}
              <Sparkles className="absolute -top-5 end-8 h-6 w-6 text-primary/50 animate-floaty-2" aria-hidden="true" />
              <Sparkles className="absolute top-1/4 -start-5 h-4 w-4 text-accent-foreground/60 animate-floaty-3" aria-hidden="true" />

              {/* Arch frame */}
              <div className="relative overflow-hidden rounded-t-[10rem] sm:rounded-t-[12rem] rounded-b-[2.5rem] border border-border/70 niva-ring bg-card aspect-[3/4]">
                {/* Base gradient behind the image (also covers while loading) */}
                <div className="absolute inset-0 niva-grad" aria-hidden="true" />
                <img
                  src="/hero.png"
                  alt={t('landing.heroAlt')}
                  width={864}
                  height={1152}
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
                {/* Soft blend into the canvas at the base */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/60 to-transparent" aria-hidden="true" />
              </div>

              {/* Floating glass cards */}
              <FloatCard
                icon={HeartPulse} tile={1}
                title={t('landing.float1Title')} sub={t('landing.float1Sub')}
                className="-top-4 -start-3 sm:-start-10" floatClass="animate-floaty"
              />
              <FloatCard
                icon={MessagesSquare} tile={4}
                title={t('landing.float2Title')} sub={t('landing.float2Sub')}
                className="top-[38%] -end-2 sm:-end-10" floatClass="animate-floaty-2"
              />
              <FloatCard
                icon={Baby} tile={3}
                title={t('landing.float3Title')} sub={t('landing.float3Sub')}
                className="-bottom-5 start-3 sm:start-6" floatClass="animate-floaty-3"
              />
            </div>
          </div>
        </section>

        {/* ── Stats strip ───────────────────────────────────────────────────── */}
        <section aria-label={t('landing.statsWeeks')} className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="niva-card rounded-3xl grid grid-cols-2 lg:grid-cols-4 gap-y-6 p-6 sm:p-7">
            {([
              { v: 'landing.statWeeksV', l: 'landing.statsWeeks', icon: HeartPulse, tile: 1 },
              { v: 'landing.statMonthsV', l: 'landing.statsMonths', icon: Baby, tile: 3 },
              { v: 'landing.statStagesV', l: 'landing.statsStages', icon: Sparkles, tile: 4 },
              { v: 'landing.statAdsV', l: 'landing.statsAds', icon: ShieldCheck, tile: 2 },
            ] as const).map((s) => (
              <div key={s.l} className="flex items-center gap-3.5 sm:gap-4">
                <TileIcon icon={s.icon} tile={s.tile} className="h-11 w-11 shrink-0" />
                <div className="min-w-0">
                  <p className="text-2xl sm:text-3xl font-bold text-primary leading-none"><span className="num">{t(s.v)}</span></p>
                  <p className="text-xs sm:text-[13px] text-muted-foreground mt-1 leading-snug">{t(s.l)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust band — global guidance bodies ──────────────────────────── */}
        <section aria-label={t('landing.trustBand')} className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-2">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('landing.trustBand')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center items-center gap-2.5">
            {['WHO', 'ACOG', 'CDC', 'AAP'].map((org) => (
              <span key={org} className="num rounded-full border border-border/70 bg-card/70 px-4 py-1.5 text-sm font-semibold text-muted-foreground">
                {org}
              </span>
            ))}
          </div>
        </section>

        {/* Below-fold sections — one dynamic chunk */}
        <LandingSections />
      </main>

      {/* ── Footer — sticky via flex column + mt-auto ──────────────────────── */}
      <footer className="mt-auto border-t bg-background/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <img src="/logo.svg" alt="NIVA" width={92} height={26} className="h-7 w-auto" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{t('landing.heroKicker2')}</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">{t('landing.footerRights')}</p>
          </div>
          <nav aria-label={t('landing.footerExploreFooter')} className="space-y-2">
            <h2 className="text-sm font-semibold">{t('landing.footerExplore')}</h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {NAV_ANCHORS.map((a) => (
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
      {mounted && stored === null && consentChoice === undefined && (
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
