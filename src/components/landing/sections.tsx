'use client';

/**
 * Landing below-fold sections — Wave 15 professional rebuild ("Bloom").
 *
 * Journey (the full-cycle story: pre-conception → pregnancy → birth → baby's
 * first year), the 3D studio bento (real HeroBloom scene with stage chips),
 * science, assistant boundaries, transparent pricing, trust, FAQ and a
 * closing CTA band.
 *
 * Split from the hero so the initial bundle stays lean (dynamic import in
 * landing-view.tsx). All copy lives in the i18n dictionary (fa/en symmetric,
 * ADR-007). Pricing mirrors the server-side catalog in src/lib/plans.ts
 * (single source).
 *
 * Motion: scroll-reveals use transform/opacity only (compositor-friendly) and
 * are disabled entirely under prefers-reduced-motion via useReducedMotion().
 */

import { useMounted } from '@/lib/use-mounted';
import { useApp, formatToman } from '@/store/app';
import { PLAN_CATALOG } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { trackLandingEvent } from '@/lib/landing-analytics';
import {
  Check, X, HeartPulse, ShieldCheck, Scale, Sparkles, ArrowRight,
  Box, CalendarClock, Activity, ClipboardList, Apple, Baby, Users, BookOpenText, MessagesSquare,
  Flower2, Stethoscope,
} from 'lucide-react';

/** Hero 3D — mounts only after idle; ssr:false keeps three.js out of the initial path. */
const HeroBloom = dynamic(() => import('@/components/landing/hero-bloom'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 niva-grad" aria-hidden="true" />,
});

export interface FaqEntry { q: string; a: string; }

/** Shared FAQ source — rendered as accordion AND serialized into FAQPage JSON-LD. */
export function useLandingFaq(): FaqEntry[] {
  const { t } = useApp();
  return [1, 2, 3, 4, 5, 6].map((i) => ({ q: t(`landing.faq${i}q`), a: t(`landing.faq${i}a`) }));
}

/* ── Scroll reveal (transform/opacity only; off under reduced motion) ── */

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ kicker, title, sub, id }: { kicker?: string; title: string; sub?: string; id?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center space-y-3 mb-10">
      {kicker && (
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1 text-[13px] font-medium text-primary">
          {kicker}
        </p>
      )}
      <h2 id={id} className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">{title}</h2>
      {sub && <p className="text-muted-foreground leading-relaxed">{sub}</p>}
    </Reveal>
  );
}

/** Pastel-gradient icon chip — reuses the block-menu tile palette. */
function TileIcon({ icon: Icon, tile, className = 'h-11 w-11' }: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
  tile: number;
  className?: string;
}) {
  return (
    <span
      className={`grid place-items-center rounded-2xl shrink-0 ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--tile-' + tile + '-bg), var(--tile-' + tile + '-bg2))',
        color: 'var(--tile-' + tile + '-fg)',
      }}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

/* ── Journey — the full-cycle story ──────────────────────────────────── */

const PHASES = [
  { key: 'ph1', icon: Flower2, tile: 4, num: '01' },
  { key: 'ph2', icon: HeartPulse, tile: 1, num: '02' },
  { key: 'ph3', icon: Stethoscope, tile: 2, num: '03' },
  { key: 'ph4', icon: Baby, tile: 3, num: '04' },
] as const;

function Journey() {
  const { t, setView } = useApp();
  return (
    <section id="journey" aria-labelledby="journey-h" className="py-16 sm:py-24">
      <SectionHeading id="journey-h" kicker={t('landing.navJourney')} title={t('landing.journeyFullTitle')} sub={t('landing.journeyFullSub')} />
      <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* connecting thread — decorative only */}
        <div aria-hidden="true" className="hidden lg:block absolute top-[3.4rem] inset-x-14 h-0.5 bg-gradient-to-l from-[var(--tile-4-bg2)] via-[var(--tile-1-bg2)] to-[var(--tile-3-bg2)] rounded-full" />
        {PHASES.map(({ key, icon, tile, num }, i) => (
          <Reveal key={key} delay={i * 0.08}>
            <Card className="niva-card h-full transition-transform duration-300 hover:-translate-y-1">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <TileIcon icon={icon} tile={tile} className="h-12 w-12" />
                  <span className="text-3xl font-bold num text-foreground/10 select-none" aria-hidden="true">{num}</span>
                </div>
                <p className="text-xs font-semibold text-primary">{t(`landing.${key}Tag`)}</p>
                <h3 className="font-semibold text-lg">{t(`landing.${key}Title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.${key}Body`)}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
      <Reveal className="text-center mt-8">
        <Button variant="ghost" onClick={() => setView('auth')} className="min-h-11 rounded-full">
          {t('landing.journeyCta')}
          <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </Reveal>
    </section>
  );
}

/* ── Features — bento grid with the live 3D studio ───────────────────── */

/** Eight stages cover the whole journey — weeks 1–40 (names/weeks in i18n). */
const JOURNEY = [
  { name: 'landing.jFertilize', week: 'landing.jFertilizeW' },
  { name: 'landing.jDivide', week: 'landing.jDivideW' },
  { name: 'landing.jEmbryoEarly', week: 'landing.jEmbryoEarlyW' },
  { name: 'landing.jEmbryoLate', week: 'landing.jEmbryoLateW' },
  { name: 'landing.jFetusEarly', week: 'landing.jFetusEarlyW' },
  { name: 'landing.jFetusMid', week: 'landing.jFetusMidW' },
  { name: 'landing.jFetusLate', week: 'landing.jFetusLateW' },
  { name: 'landing.jTerm', week: 'landing.jTermW' },
] as const;

/** Per-stage size analogy — reinforces that each scene matches its weeks. */
const SIZE_KEYS = [
  'landing.sizeW0',
  'landing.sizeW12',
  'landing.sizeW45',
  'landing.sizeW48',
  'landing.sizeW913',
  'landing.sizeW1422',
  'landing.sizeW2330',
  'landing.sizeW3140',
] as const;

function StudioCard() {
  const { t } = useApp();
  const [stage, setStage] = useState(0);
  const [ready, setReady] = useState(false);

  // Growth journey — auto-cycles through development stages; respects
  // reduced motion (chips stay manual). The interval resets on every stage
  // change, so a manual click buys a fresh 7s of the chosen scene.
  const [prefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => setStage((s) => (s + 1) % JOURNEY.length), 7000);
    return () => clearInterval(id);
  }, [stage, prefersReducedMotion]);

  // The 3D scene mounts after the page is settled (idle) — never at first paint.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => setReady(true), { timeout: 3000 });
      return;
    }
    const timer = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="niva-card h-full relative overflow-hidden sm:col-span-2 lg:row-span-2">
      <CardContent className="p-5 sm:p-6 h-full flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <TileIcon icon={Box} tile={1} />
          <div className="min-w-0">
            <h3 className="font-semibold text-lg leading-tight">{t('nav.studio')}</h3>
            <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed mt-1">{t('landing.studioSub')}</p>
          </div>
        </div>
        <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] rounded-2xl overflow-hidden border border-border/60">
          {/* Base gradient always present → no flash while three.js streams in */}
          <div className="absolute inset-0 niva-grad" aria-hidden="true" />
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{ background: 'radial-gradient(46% 40% at 50% 42%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 74%)' }}
          />
          {ready && <HeroBloom stage={stage} />}
          {/* Honesty label — the scene is educational ambiance, not a fetal model */}
          <span className="absolute top-3 end-3 text-[11px] text-muted-foreground bg-background/60 backdrop-blur rounded-full px-2.5 py-1 border border-border/50 flex items-center gap-1">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('studio.demoAsset')}
          </span>
        </div>
        <p aria-live="polite" className="text-center text-xs font-medium text-primary/90">
          {t(SIZE_KEYS[stage])}
        </p>
        {/* Stage chips — auto-cycled; tap to jump */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {JOURNEY.map((j, i) => (
            <button
              key={j.name}
              type="button"
              aria-pressed={stage === i}
              onClick={() => {
                setStage(i);
                trackLandingEvent('journey_stage');
              }}
              className={
                'rounded-full border px-2.5 py-1.5 inline-flex items-center gap-1.5 text-xs transition-colors min-h-8 ' +
                (stage === i
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-primary/10')
              }
            >
              <span className="font-semibold">{t(j.name)}</span>
              <span className="opacity-70 num">{t(j.week)}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const MODULES = [
  { icon: CalendarClock, n: 'nav.timeline', b: 'b2', tile: 2 },
  { icon: MessagesSquare, n: 'nav.assistant', b: 'b3', tile: 4 },
  { icon: Activity, n: 'nav.tracking', b: 'b4', tile: 3 },
  { icon: ClipboardList, n: 'nav.appointments', b: 'b5', tile: 5 },
  { icon: Apple, n: 'nav.nutrition', b: 'b6', tile: 7 },
  { icon: Baby, n: 'nav.birth', b: 'b7', tile: 8 },
  { icon: HeartPulse, n: 'nav.postpartum', b: 'b8', tile: 6 },
  { icon: Users, n: 'nav.family', b: 'b9', tile: 4 },
] as const;

function Features() {
  const { t } = useApp();
  return (
    <section id="features" aria-labelledby="features-h" className="py-16 sm:py-24">
      <SectionHeading id="features-h" kicker={t('landing.navFeatures')} title={t('landing.featuresTitle')} sub={t('landing.featuresSub')} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Spotlight — the live 3D studio */}
        <Reveal className="sm:col-span-2 lg:row-span-2">
          <StudioCard />
        </Reveal>
        {MODULES.map(({ icon, n, b, tile }, i) => (
          <Reveal key={n} delay={Math.min(i * 0.05, 0.25)}>
            <Card className="niva-card h-full transition-transform duration-300 hover:-translate-y-1">
              <CardContent className="p-5 space-y-2.5">
                <TileIcon icon={icon} tile={tile} className="h-10 w-10" />
                <h3 className="font-semibold">{t(n)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.${b}`)}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Science & methodology ───────────────────────────────────────────── */

function Science() {
  const { t } = useApp();
  const items = [
    { icon: BookOpenText, t: 's1', tile: 2 },
    { icon: ClipboardList, t: 's2', tile: 5 },
    { icon: Scale, t: 's3', tile: 4 },
  ] as const;
  return (
    <section id="science" aria-labelledby="science-h" className="py-16 sm:py-24">
      <SectionHeading id="science-h" kicker={t('landing.navScience')} title={t('landing.scienceTitle')} sub={t('landing.scienceSub')} />
      <div className="grid md:grid-cols-3 gap-4">
        {items.map(({ icon, t: key, tile }, i) => (
          <Reveal key={key} delay={i * 0.08}>
            <Card className="niva-card h-full transition-transform duration-300 hover:-translate-y-1">
              <CardContent className="p-6 space-y-3">
                <TileIcon icon={icon} tile={tile} />
                <h3 className="font-semibold text-lg">{t(`landing.${key}Title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.${key}Body`)}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-8 flex justify-center">
        <Badge variant="secondary" className="gap-1.5 py-1.5 px-3.5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('landing.reviewBadge')}
        </Badge>
      </Reveal>
    </section>
  );
}

/* ── Assistant boundaries ────────────────────────────────────────────── */

function Bounds() {
  const { t } = useApp();
  const can = ['can1', 'can2', 'can3', 'can4'] as const;
  const cant = ['cant1', 'cant2', 'cant3', 'cant4'] as const;
  return (
    <section id="boundaries" aria-labelledby="bounds-h" className="py-16 sm:py-24">
      <SectionHeading id="bounds-h" title={t('landing.boundsTitle')} sub={t('landing.boundsSub')} />
      <div className="grid md:grid-cols-2 gap-4">
        <Reveal>
          <Card className="niva-card border-primary/25 h-full">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" aria-hidden="true" /> {t('landing.canTitle')}
              </h3>
              <ul className="space-y-3">
                {can.map((k) => (
                  <li key={k} className="flex gap-2.5 text-sm leading-relaxed">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                    {t(`landing.${k}`)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.08}>
          <Card className="niva-card h-full">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-destructive">
                <X className="h-5 w-5" aria-hidden="true" /> {t('landing.cantTitle')}
              </h3>
              <ul className="space-y-3">
                {cant.map((k) => (
                  <li key={k} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <X className="h-4 w-4 mt-0.5 shrink-0 text-destructive/70" aria-hidden="true" />
                    {t(`landing.${k}`)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Reveal>
      </div>
      <Reveal className="mt-6">
        <p className="text-center text-sm border-s-2 border-primary/40 ps-3 max-w-xl mx-auto text-start">
          {t('landing.boundsNote')}
        </p>
      </Reveal>
    </section>
  );
}

/* ── Transparent pricing ─────────────────────────────────────────────── */

function Pricing() {
  const { t, locale, setView, user } = useApp();
  const monthly = PLAN_CATALOG.find((p) => p.plan === 'PREMIUM_MONTHLY');
  const annual = PLAN_CATALOG.find((p) => p.plan === 'PREMIUM_ANNUAL');
  const family = PLAN_CATALOG.find((p) => p.plan === 'FAMILY');

  return (
    <section id="pricing" aria-labelledby="pricing-h" className="py-16 sm:py-24">
      <SectionHeading id="pricing-h" kicker={t('landing.navPricing')} title={t('landing.pricingTitle')} sub={t('landing.pricingSub')} />
      <div className="grid md:grid-cols-3 gap-4 items-stretch max-w-5xl mx-auto">
        {/* Free */}
        <Reveal>
          <Card className="niva-card flex flex-col h-full">
            <CardContent className="p-6 space-y-4 flex-1">
              <h3 className="font-semibold text-lg">{t('landing.freeName')}</h3>
              <p className="text-3xl font-bold num">{t('landing.freePrice')}</p>
              <Separator />
              <ul className="space-y-2.5 text-sm flex-1">
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.rowAssistantFree')}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.row3dFree')}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.rowCommunity')}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.rowExport')} — {t('landing.rowAlways')}</li>
              </ul>
              <Button variant="outline" className="w-full min-h-11 rounded-full" onClick={() => setView(user ? 'dashboard' : 'auth')}>
                {t('landing.pricingCta')}
              </Button>
            </CardContent>
          </Card>
        </Reveal>

        {/* Premium (highlighted) */}
        <Reveal delay={0.08}>
          <Card className="niva-ring niva-card shadow-xl flex flex-col h-full relative md:-translate-y-2">
            <Badge className="absolute -top-2.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 rounded-full">{t('landing.premiumName')}</Badge>
            <CardContent className="p-6 space-y-4 flex-1">
              <h3 className="font-semibold text-lg">{t('landing.premiumName')}</h3>
              <p className="text-3xl font-bold num">
                {monthly ? formatToman(monthly.amountMinor, locale) : '—'}
                <span className="text-sm font-normal text-muted-foreground ms-1">{t('landing.perMonth')}</span>
              </p>
              {annual && (
                <p className="text-xs text-muted-foreground num">
                  {t('landing.premiumName')} · {formatToman(annual.amountMinor, locale)}{t('landing.perYear')}
                </p>
              )}
              <Separator />
              <ul className="space-y-2.5 text-sm flex-1">
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.rowAssistantPaid')}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.row3dPaid')}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.rowGuided')} · {t('landing.rowFamily')}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.rowJournal')}</li>
              </ul>
              <Button className="w-full min-h-11 rounded-full" onClick={() => setView(user ? 'subscription' : 'auth')}>
                {t('landing.pricingCtaPaid')}
                <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        </Reveal>

        {/* Family */}
        <Reveal delay={0.16}>
          <Card className="niva-card flex flex-col h-full">
            <CardContent className="p-6 space-y-4 flex-1">
              <h3 className="font-semibold text-lg">{t('landing.familyName')}</h3>
              <p className="text-3xl font-bold num">
                {family ? formatToman(family.amountMinor, locale) : '—'}
                <span className="text-sm font-normal text-muted-foreground ms-1">{t('landing.perMonth')}</span>
              </p>
              <Separator />
              <ul className="space-y-2.5 text-sm flex-1">
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.rowFamily')}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.rowAssistantPaid')}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />{t('landing.row3dPaid')}</li>
              </ul>
              <Button variant="outline" className="w-full min-h-11 rounded-full" onClick={() => setView(user ? 'subscription' : 'auth')}>
                {t('landing.pricingCtaPaid')}
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      </div>
      <Reveal className="mt-6">
        <p className="text-center text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {t('landing.pricingNote')}
        </p>
      </Reveal>
    </section>
  );
}

/* ── Trust & privacy ─────────────────────────────────────────────────── */

function Trust() {
  const { t } = useApp();
  const items = ['trust1', 'trust2', 'trust3', 'trust4'] as const;
  return (
    <section id="trust" aria-labelledby="trust-h" className="py-16 sm:py-24">
      <SectionHeading id="trust-h" kicker={t('landing.navTrust')} title={t('landing.trustTitle')} sub={t('landing.trustSub')} />
      <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {items.map((k, i) => (
          <Reveal key={k} delay={Math.min(i * 0.06, 0.2)}>
            <Card className="niva-card h-full">
              <CardContent className="p-5 space-y-2.5">
                <TileIcon icon={ShieldCheck} tile={2} className="h-10 w-10" />
                <h3 className="font-semibold">{t(`landing.${k}Title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.${k}Body`)}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────── */

function Faq() {
  const { t } = useApp();
  const faq = useLandingFaq();
  const mounted = useMounted();
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  return (
    <section id="faq" aria-labelledby="faq-h" className="py-16 sm:py-24">
      {/* FAQPage structured data — mirrors the visible accordion exactly.
          Rendered AFTER mount: the copy is locale-aware and dangerouslySetInnerHTML
          is not covered by suppressHydrationWarning. Crawlers execute JS. */}
      {mounted && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <SectionHeading id="faq-h" kicker={t('landing.navFaq')} title={t('landing.faqTitle')} />
      <Reveal className="max-w-2xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {faq.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-start text-[15px] min-h-11">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}

/* ── Closing CTA band ────────────────────────────────────────────────── */

function CtaBand() {
  const { t, setView, user } = useApp();
  return (
    <section aria-labelledby="cta-band-h" className="py-16 sm:py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border niva-ring p-8 sm:p-12 text-center space-y-5">
          <div className="absolute inset-0 niva-grad" aria-hidden="true" />
          <div className="niva-blob h-48 w-48 -top-16 -start-10 bg-primary/30" aria-hidden="true" />
          <div className="niva-blob niva-blob-2 h-40 w-40 -bottom-14 -end-8 bg-secondary/30" aria-hidden="true" />
          <div className="relative space-y-4">
            <h2 id="cta-band-h" className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {t('landing.ctaBandTitle')}
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
              {t('landing.ctaBandSub')}
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button size="lg" onClick={() => { trackLandingEvent('cta_start'); setView(user ? 'dashboard' : 'auth'); }} className="min-h-12 px-7 text-base rounded-full shadow-lg shadow-primary/25">
                {t('landing.ctaStart')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => { trackLandingEvent('cta_demo'); setView('auth'); }} className="min-h-12 px-7 text-base rounded-full bg-background/60 backdrop-blur">
                {t('landing.ctaDemo')}
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── Composition ─────────────────────────────────────────────────────── */

export function LandingSections() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-4">
      <Journey />
      <Features />
      <Science />
      <Bounds />
      <Pricing />
      <Trust />
      <Faq />
      <CtaBand />
    </div>
  );
}
