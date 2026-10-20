'use client';

/**
 * Landing below-fold sections — Wave 8 rebuild.
 * Journey, science, assistant boundaries, bento features, transparent pricing,
 * trust, FAQ and a closing CTA band.
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
import type { ReactNode } from 'react';
import { trackLandingEvent } from '@/lib/landing-analytics';
import {
  Check, X, HeartPulse, ShieldCheck, Scale, Sparkles, ArrowRight,
  Box, CalendarClock, Activity, ClipboardList, Apple, Baby, Users, BookOpen, MessagesSquare,
} from 'lucide-react';

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
      {kicker && <p className="text-sm font-medium text-primary">{kicker}</p>}
      <h2 id={id} className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">{title}</h2>
      {sub && <p className="text-muted-foreground leading-relaxed">{sub}</p>}
    </Reveal>
  );
}

/* ── Journey ─────────────────────────────────────────────────────────── */

function Journey() {
  const { t, setView } = useApp();
  const cards = [
    { key: 't1', n: '01', tone: 'bg-secondary/15 text-secondary-foreground', line: 'bg-secondary/40' },
    { key: 't2', n: '02', tone: 'bg-primary/10 text-primary', line: 'bg-primary/40' },
    { key: 't3', n: '03', tone: 'bg-accent/25 text-accent-foreground', line: 'bg-accent/40' },
  ] as const;
  return (
    <section id="journey" aria-labelledby="journey-h" className="py-16 sm:py-20">
      <SectionHeading id="journey-h" kicker={t('landing.navJourney')} title={t('landing.journeyTitle')} sub={t('landing.journeySub')} />
      <div className="relative grid md:grid-cols-3 gap-4">
        {/* connecting thread — decorative only */}
        <div aria-hidden="true" className="hidden md:block absolute top-14 inset-x-12 h-px bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />
        {cards.map(({ key, n, tone }, i) => (
          <Reveal key={key} delay={i * 0.08}>
            <Card className="niva-card h-full transition-transform duration-300 hover:-translate-y-1">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`grid place-items-center h-11 w-11 rounded-2xl ${tone}`}>
                    <HeartPulse className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-3xl font-bold num text-foreground/10 select-none" aria-hidden="true">{n}</span>
                </div>
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

/* ── Science & methodology ───────────────────────────────────────────── */

function Science() {
  const { t } = useApp();
  const items = [
    { icon: <BookOpen className="h-5 w-5" aria-hidden="true" />, t: 's1' },
    { icon: <ClipboardList className="h-5 w-5" aria-hidden="true" />, t: 's2' },
    { icon: <Scale className="h-5 w-5" aria-hidden="true" />, t: 's3' },
  ] as const;
  return (
    <section id="science" aria-labelledby="science-h" className="py-16 sm:py-20">
      <SectionHeading id="science-h" kicker={t('landing.navScience')} title={t('landing.scienceTitle')} sub={t('landing.scienceSub')} />
      <div className="grid md:grid-cols-3 gap-4">
        {items.map(({ icon, t: key }, i) => (
          <Reveal key={key} delay={i * 0.08}>
            <Card className="niva-card h-full transition-transform duration-300 hover:-translate-y-1">
              <CardContent className="p-6 space-y-3">
                <span className="grid place-items-center h-11 w-11 rounded-2xl bg-primary/10 text-primary">{icon}</span>
                <h3 className="font-semibold text-lg">{t(`landing.${key}Title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.${key}Body`)}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Assistant boundaries ────────────────────────────────────────────── */

function Bounds() {
  const { t } = useApp();
  const can = ['can1', 'can2', 'can3', 'can4'] as const;
  const cant = ['cant1', 'cant2', 'cant3', 'cant4'] as const;
  return (
    <section id="boundaries" aria-labelledby="bounds-h" className="py-16 sm:py-20">
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

/* ── Features — bento grid ───────────────────────────────────────────── */

function StudioVisual() {
  return (
    <div aria-hidden="true" className="relative h-28 sm:h-32 rounded-2xl overflow-hidden niva-grad">
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative h-16 w-16">
          <span className="absolute inset-0 rounded-full bg-primary/25 blur-md" />
          <span className="absolute inset-2 rounded-full border border-primary/40" />
          <span className="absolute inset-0 grid place-items-center"><span className="h-4 w-4 rounded-full bg-primary/70" /></span>
          <span className="absolute -top-1 -end-1 h-2.5 w-2.5 rounded-full bg-secondary" />
          <span className="absolute top-1/2 -start-2 h-2 w-2 rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}

function Features() {
  const { t } = useApp();
  const mods = [
    { icon: <CalendarClock className="h-5 w-5" aria-hidden="true" />, n: 'nav.timeline', b: 'b2' },
    { icon: <MessagesSquare className="h-5 w-5" aria-hidden="true" />, n: 'nav.assistant', b: 'b3' },
    { icon: <Activity className="h-5 w-5" aria-hidden="true" />, n: 'nav.tracking', b: 'b4' },
    { icon: <ClipboardList className="h-5 w-5" aria-hidden="true" />, n: 'nav.appointments', b: 'b5' },
    { icon: <Apple className="h-5 w-5" aria-hidden="true" />, n: 'nav.nutrition', b: 'b6' },
    { icon: <Baby className="h-5 w-5" aria-hidden="true" />, n: 'nav.birth', b: 'b7' },
    { icon: <HeartPulse className="h-5 w-5" aria-hidden="true" />, n: 'nav.postpartum', b: 'b8' },
    { icon: <Users className="h-5 w-5" aria-hidden="true" />, n: 'nav.family', b: 'b9' },
  ] as const;
  return (
    <section id="features" aria-labelledby="features-h" className="py-16 sm:py-20">
      <SectionHeading id="features-h" kicker={t('landing.navFeatures')} title={t('landing.featuresTitle')} sub={t('landing.featuresSub')} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Spotlight — the 3D studio */}
        <Reveal className="sm:col-span-2 lg:row-span-2">
          <Card className="niva-card h-full relative overflow-hidden">
            <CardContent className="p-6 space-y-3 h-full flex flex-col">
              <span className="grid place-items-center h-11 w-11 rounded-2xl bg-primary/10 text-primary">
                <Box className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-semibold text-xl">{t('nav.studio')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t('landing.b1')}</p>
              <div className="mt-auto pt-4"><StudioVisual /></div>
            </CardContent>
          </Card>
        </Reveal>
        {mods.map(({ icon, n, b }, i) => (
          <Reveal key={n} delay={Math.min(i * 0.05, 0.25)}>
            <Card className="niva-card h-full transition-transform duration-300 hover:-translate-y-1">
              <CardContent className="p-5 space-y-2.5">
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary">{icon}</span>
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

/* ── Transparent pricing ─────────────────────────────────────────────── */

function Pricing() {
  const { t, locale, setView, user } = useApp();
  const monthly = PLAN_CATALOG.find((p) => p.plan === 'PREMIUM_MONTHLY');
  const annual = PLAN_CATALOG.find((p) => p.plan === 'PREMIUM_ANNUAL');
  const family = PLAN_CATALOG.find((p) => p.plan === 'FAMILY');

  return (
    <section id="pricing" aria-labelledby="pricing-h" className="py-16 sm:py-20">
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
    <section id="trust" aria-labelledby="trust-h" className="py-16 sm:py-20">
      <SectionHeading id="trust-h" kicker={t('landing.navTrust')} title={t('landing.trustTitle')} sub={t('landing.trustSub')} />
      <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {items.map((k, i) => (
          <Reveal key={k} delay={Math.min(i * 0.06, 0.2)}>
            <Card className="niva-card h-full">
              <CardContent className="p-5 space-y-2.5">
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-secondary/20 text-secondary-foreground">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
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
    <section id="faq" aria-labelledby="faq-h" className="py-16 sm:py-20">
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
    <section aria-labelledby="cta-band-h" className="py-16 sm:py-20">
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
              <Button size="lg" onClick={() => { trackLandingEvent('cta_start'); setView(user ? 'dashboard' : 'auth'); }} className="min-h-12 px-7 text-base rounded-full">
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
      <Science />
      <Bounds />
      <Features />
      <Pricing />
      <Trust />
      <Faq />
      <CtaBand />
    </div>
  );
}
