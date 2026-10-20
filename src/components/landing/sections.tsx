'use client';

/**
 * Landing below-fold sections — journey, science, assistant boundaries,
 * features, transparent pricing, trust, FAQ. Split from the hero so the
 * initial bundle stays lean (dynamic import in landing-view.tsx).
 * All copy lives in the i18n dictionary (fa/en symmetric, ADR-007).
 * Pricing mirrors the server-side catalog in src/lib/plans.ts (single source).
 */

import { useApp, formatToman } from '@/store/app';
import { PLAN_CATALOG } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
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

function SectionHeading({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center space-y-3 mb-10">
      {kicker && <p className="text-sm font-medium text-primary">{kicker}</p>}
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="text-muted-foreground leading-relaxed">{sub}</p>}
    </div>
  );
}

/* ── Journey ─────────────────────────────────────────────────────────── */

function Journey() {
  const { t, setView } = useApp();
  const cards = [
    { key: 't1', tone: 'bg-secondary/15 text-secondary-foreground' },
    { key: 't2', tone: 'bg-primary/10 text-primary' },
    { key: 't3', tone: 'bg-accent/25 text-accent-foreground' },
  ] as const;
  return (
    <section id="journey" aria-labelledby="journey-h" className="py-16 sm:py-20">
      <SectionHeading title={t('landing.journeyTitle')} sub={t('landing.journeySub')} />
      <div className="grid md:grid-cols-3 gap-4">
        {cards.map(({ key, tone }) => (
          <Card key={key} className="niva-card">
            <CardContent className="p-6 space-y-3">
              <span className={`grid place-items-center h-11 w-11 rounded-2xl ${tone}`}>
                <HeartPulse className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-semibold text-lg">{t(`landing.${key}Title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.${key}Body`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="text-center mt-8">
        <Button variant="ghost" onClick={() => setView('auth')} className="min-h-11">
          {t('landing.journeyCta')}
          <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
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
      <SectionHeading title={t('landing.scienceTitle')} sub={t('landing.scienceSub')} />
      <div className="grid md:grid-cols-3 gap-4">
        {items.map(({ icon, t: key }) => (
          <Card key={key} className="niva-card">
            <CardContent className="p-6 space-y-3">
              <span className="grid place-items-center h-11 w-11 rounded-2xl bg-primary/10 text-primary">{icon}</span>
              <h3 className="font-semibold text-lg">{t(`landing.${key}Title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.${key}Body`)}</p>
            </CardContent>
          </Card>
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
      <SectionHeading title={t('landing.boundsTitle')} sub={t('landing.boundsSub')} />
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="niva-card border-primary/25">
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
        <Card className="niva-card">
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
      </div>
      <p className="mt-6 text-center text-sm border-s-2 border-primary/40 ps-3 max-w-xl mx-auto text-start">
        {t('landing.boundsNote')}
      </p>
    </section>
  );
}

/* ── Features grid ───────────────────────────────────────────────────── */

function Features() {
  const { t } = useApp();
  const mods = [
    { icon: <Box className="h-5 w-5" aria-hidden="true" />, n: 'nav.studio', b: 'b1' },
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
      <SectionHeading title={t('landing.featuresTitle')} sub={t('landing.featuresSub')} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mods.map(({ icon, n, b }) => (
          <Card key={n} className="niva-card">
            <CardContent className="p-5 space-y-2.5">
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary">{icon}</span>
              <h3 className="font-semibold">{t(n)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.${b}`)}</p>
            </CardContent>
          </Card>
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

  const rows: { label: string; free: string; paid: string }[] = [
    { label: t('landing.rowAssistant'), free: t('landing.rowAssistantFree'), paid: t('landing.rowAssistantPaid') },
    { label: t('landing.row3d'), free: t('landing.row3dFree'), paid: t('landing.row3dPaid') },
    { label: t('landing.rowGuided'), free: t('landing.notIncluded'), paid: t('landing.rowIncluded') },
    { label: t('landing.rowFamily'), free: t('landing.notIncluded'), paid: t('landing.rowIncluded') },
    { label: t('landing.rowCommunity'), free: t('landing.rowIncluded'), paid: t('landing.rowIncluded') },
    { label: t('landing.rowExport'), free: t('landing.rowAlways'), paid: t('landing.rowAlways') },
    { label: t('landing.rowJournal'), free: t('landing.notIncluded'), paid: t('landing.rowIncluded') },
  ];

  return (
    <section id="pricing" aria-labelledby="pricing-h" className="py-16 sm:py-20">
      <SectionHeading title={t('landing.pricingTitle')} sub={t('landing.pricingSub')} />
      <div className="grid md:grid-cols-3 gap-4 items-stretch max-w-5xl mx-auto">
        {/* Free */}
        <Card className="niva-card flex flex-col">
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
            <Button variant="outline" className="w-full min-h-11" onClick={() => setView(user ? 'dashboard' : 'auth')}>
              {t('landing.pricingCta')}
            </Button>
          </CardContent>
        </Card>

        {/* Premium (highlighted) */}
        <Card className="niva-card border-primary shadow-xl ring-1 ring-primary/20 flex flex-col relative">
          <Badge className="absolute -top-2.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">{t('landing.premiumName')}</Badge>
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
            <Button className="w-full min-h-11" onClick={() => setView(user ? 'subscription' : 'auth')}>
              {t('landing.pricingCtaPaid')}
              <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>

        {/* Family */}
        <Card className="niva-card flex flex-col">
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
            <Button variant="outline" className="w-full min-h-11" onClick={() => setView(user ? 'subscription' : 'auth')}>
              {t('landing.pricingCtaPaid')}
            </Button>
          </CardContent>
        </Card>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
        {t('landing.pricingNote')}
      </p>
    </section>
  );
}

/* ── Trust & privacy ─────────────────────────────────────────────────── */

function Trust() {
  const { t } = useApp();
  const items = ['trust1', 'trust2', 'trust3', 'trust4'] as const;
  return (
    <section id="trust" aria-labelledby="trust-h" className="py-16 sm:py-20">
      <SectionHeading title={t('landing.trustTitle')} sub={t('landing.trustSub')} />
      <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {items.map((k) => (
          <Card key={k} className="niva-card">
            <CardContent className="p-5 space-y-2.5">
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-secondary/20 text-secondary-foreground">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{t(`landing.${k}Title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.${k}Body`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────── */

function Faq() {
  const { t } = useApp();
  const faq = useLandingFaq();
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
      {/* FAQPage structured data — mirrors the visible accordion exactly. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <SectionHeading title={t('landing.faqTitle')} />
      <div className="max-w-2xl mx-auto">
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
      </div>
    </section>
  );
}

/* ── Composition ─────────────────────────────────────────────────────── */

export function LandingSections() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 divide-y divide-border/60">
      <Journey />
      <Science />
      <Bounds />
      <Features />
      <Pricing />
      <Trust />
      <Faq />
    </div>
  );
}
