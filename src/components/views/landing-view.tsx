'use client';

/**
 * NIVA landing — Wave 16 full rebuild: public OB/GYN doctor directory.
 *
 * The user-facing story is now the doctors themselves: photos, specialties,
 * patient-satisfaction percentages, star ratings, verified patient comments,
 * fees and first-available slots — then booking steps, FAQ and CTA.
 *
 * Architecture (performance-first):
 * - No three.js / no dynamic chunks anymore: the landing is pure DOM + CSS.
 *   Everything renders synchronously; doctor photos are small (≈100KB) with
 *   explicit dimensions (zero layout shift) and lazy-load below the fold.
 * - Filters (search / city / sort) run fully client-side over the curated
 *   showcase dataset in src/lib/landing-doctors.ts.
 * - Structured data (ItemList of Physician with AggregateRating) renders
 *   after mount to stay SSR-safe with the persisted locale.
 * - Ambient background blobs are pure CSS and freeze under
 *   prefers-reduced-motion via the global rule in globals.css.
 * - Analytics remain anonymous + strictly consent-gated (landing-analytics.ts).
 */

import { useApp, formatToman } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, MapPin, Star, BadgeCheck, CalendarClock, Video, Hospital,
  Languages, Moon, ArrowRight, Stethoscope, Quote, ShieldCheck, MessageSquareHeart,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMounted } from '@/lib/use-mounted';
import {
  getAnalyticsConsent, setAnalyticsConsent, trackLandingEvent,
} from '@/lib/landing-analytics';
import {
  LANDING_DOCTORS, LANDING_COMMENTS, LANDING_CITIES,
  type LandingDoctor,
} from '@/lib/landing-doctors';

type SortKey = 'satisfaction' | 'rating' | 'experience' | 'fee';

/** Locale-aware number formatting (fa-IR digits) with a small formatter cache. */
const nfCache = new Map<string, Intl.NumberFormat>();
function num(locale: string, n: number): string {
  let f = nfCache.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US');
    nfCache.set(locale, f);
  }
  return f.format(n);
}

function pctLabel(locale: string, value: number): string {
  return locale === 'fa' ? `${num(locale, value)}٪` : `${num(locale, value)}%`;
}

function agoLabel(t: (k: string) => string, locale: string, days: number): string {
  if (days <= 1) return t('ld.daysAgo1');
  return t('ld.daysAgo').replace('{n}', num(locale, days));
}

function nextSlotLabel(t: (k: string) => string, locale: string, days: number): string {
  if (days <= 0) return t('ld.nextToday');
  if (days === 1) return t('ld.nextTomorrow');
  return t('ld.nextIn').replace('{n}', num(locale, days));
}

/** Tile palette rotation for comment avatars / step numbers (vars in globals.css). */
function tileStyle(i: number): React.CSSProperties {
  const n = (i % 6) + 1;
  return {
    background: `linear-gradient(135deg, var(--tile-${n}-bg), var(--tile-${n}-bg2))`,
    color: `var(--tile-${n}-fg)`,
  };
}

function StarRow({ rating, className = 'h-3.5 w-3.5' }: { rating: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${className} ${i <= full ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted-foreground/30'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function DoctorCard({ d, index, locale, t, onBook, onReviews }: {
  d: LandingDoctor;
  index: number;
  locale: string;
  t: (k: string) => string;
  onBook: (d: LandingDoctor) => void;
  onReviews: () => void;
}) {
  return (
    <article className="niva-card rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5">
      {/* Identity row — wraps on narrow screens so the rating chip can drop below instead of forcing horizontal overflow */}
      <div className="flex flex-wrap items-start gap-3.5">
        <img
          src={d.photo}
          alt={d.name[locale as 'fa' | 'en'] ?? d.name.en}
          width={96}
          height={96}
          loading={index < 2 ? 'eager' : 'lazy'}
          decoding="async"
          className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover object-top ring-1 ring-border/60 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-snug flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
            <span className="min-w-0">{d.name[locale as 'fa' | 'en'] ?? d.name.en}</span>
            <BadgeCheck className="h-4 w-4 text-primary shrink-0" aria-label={t('ld.verified')} />
          </h3>
          <p className="text-[13px] font-medium text-primary mt-0.5 leading-snug">
            {d.title[locale as 'fa' | 'en'] ?? d.title.en}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 min-w-0">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {d.city[locale as 'fa' | 'en'] ?? d.city.en} · {d.clinic[locale as 'fa' | 'en'] ?? d.clinic.en}
            </span>
          </p>
        </div>
        {/* Rating chip — wraps under the photo/name on very narrow screens */}
        <div className="text-center shrink-0 rounded-2xl border border-border/60 bg-background/60 px-2.5 py-1.5 ms-auto">
          <p className="text-lg font-bold leading-none num">{num(locale, d.rating)}</p>
          <div className="mt-1"><StarRow rating={d.rating} className="h-3 w-3" /></div>
          <p className="text-[10px] text-muted-foreground mt-1 num">
            {t('ld.reviewsCount').replace('{n}', num(locale, d.reviewsCount))}
          </p>
        </div>
      </div>

      {/* Satisfaction bar */}
      <div aria-label={`${t('ld.satisfaction')}: ${pctLabel(locale, d.satisfaction)}`}>
        <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
          <span className="text-muted-foreground">{t('ld.satisfaction')}</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 num">{pctLabel(locale, d.satisfaction)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={d.satisfaction} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
            style={{ width: `${d.satisfaction}%` }}
          />
        </div>
      </div>

      {/* Fact chips */}
      <ul className="flex flex-wrap gap-1.5 text-[11px]">
        <li className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/50 px-2.5 py-1">
          <Stethoscope className="h-3 w-3 text-primary" aria-hidden="true" />
          {t('ld.yearsExp').replace('{y}', num(locale, d.experienceYears))}
        </li>
        <li className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-400">
          <CalendarClock className="h-3 w-3" aria-hidden="true" />
          {nextSlotLabel(t, locale, d.nextSlotDays)}
        </li>
        <li className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/50 px-2.5 py-1 num">
          {formatToman(d.feeToman, locale as 'fa' | 'en')}
        </li>
        {d.clinicVisit && (
          <li className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/50 px-2.5 py-1">
            <Hospital className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            {t('ld.inPerson')}
          </li>
        )}
        {d.onlineVisit && (
          <li className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/50 px-2.5 py-1">
            <Video className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            {t('ld.online')}
          </li>
        )}
      </ul>

      {/* Tags */}
      {d.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {d.tags.map((tag) => (
            <li key={tag.en}>
              <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0.5 font-normal">
                {tag[locale as 'fa' | 'en'] ?? tag.en}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {/* Top patient comment */}
      <figure className="rounded-2xl border border-border/60 bg-muted/40 p-3 mt-auto">
        <Quote className="h-3.5 w-3.5 text-primary/60 mb-1 rtl:rotate-180" aria-hidden="true" />
        <blockquote className="text-[13px] leading-relaxed">
          {d.topComment.text[locale as 'fa' | 'en'] ?? d.topComment.text.en}
        </blockquote>
        <figcaption className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <StarRow rating={d.topComment.rating} className="h-3 w-3" />
          <span className="font-medium text-foreground/80">{d.topComment.patient[locale as 'fa' | 'en'] ?? d.topComment.patient.en}</span>
          <span aria-hidden="true">·</span>
          <span>{agoLabel(t, locale, d.topComment.daysAgo)}</span>
        </figcaption>
      </figure>

      {/* Actions */}
      <div className="flex gap-2">
        <Button className="flex-1 min-h-11 rounded-full" onClick={() => onBook(d)}>
          {t('ld.book')}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
        <Button variant="outline" className="min-h-11 rounded-full bg-background/60" onClick={onReviews}>
          <MessageSquareHeart className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t('ld.seeReviews')}
        </Button>
      </div>
    </article>
  );
}

function CommentCard({ c, doctorName, index, locale, t }: {
  c: (typeof LANDING_COMMENTS)[number];
  doctorName: string;
  index: number;
  locale: string;
  t: (k: string) => string;
}) {
  const initial = (c.patient[locale as 'fa' | 'en'] ?? c.patient.en).trim().charAt(0);
  return (
    <article className="niva-card rounded-2xl p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <span
          className="h-9 w-9 rounded-full grid place-items-center text-sm font-bold shrink-0"
          style={tileStyle(index)}
          aria-hidden="true"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight truncate">
            {c.patient[locale as 'fa' | 'en'] ?? c.patient.en}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {agoLabel(t, locale, c.daysAgo)} · {t('ld.verified')}
          </p>
        </div>
        <Badge variant="outline" className="gap-1 text-primary border-primary/30 shrink-0">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          {t('ld.verified')}
        </Badge>
      </div>
      <StarRow rating={c.rating} />
      <p className="text-[13px] leading-relaxed text-foreground/90">
        {c.text[locale as 'fa' | 'en'] ?? c.text.en}
      </p>
      <p className="text-[11px] text-muted-foreground mt-auto pt-1 border-t border-border/50">
        {t('ld.commentFor').replace('{name}', doctorName)}
      </p>
    </article>
  );
}

export function LandingView() {
  const { t, setView, user, locale, setLocale } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('all');
  const [sort, setSort] = useState<SortKey>('satisfaction');
  const [allComments, setAllComments] = useState(false);
  const [consentChoice, setConsentChoice] = useState<'granted' | 'denied' | null | undefined>(undefined);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = LANDING_DOCTORS.filter((d) => {
      if (!q) return true;
      const hay = [
        d.name.fa, d.name.en, d.title.fa, d.title.en, d.city.fa, d.city.en,
        ...d.tags.flatMap((x) => [x.fa, x.en]),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
    if (city !== 'all') list = list.filter((d) => d.city.en === city);
    const comparators: Record<SortKey, (a: LandingDoctor, b: LandingDoctor) => number> = {
      satisfaction: (a, b) => b.satisfaction - a.satisfaction,
      rating: (a, b) => b.rating - a.rating,
      experience: (a, b) => b.experienceYears - a.experienceYears,
      fee: (a, b) => a.feeToman - b.feeToman,
    };
    return [...list].sort(comparators[sort]);
  }, [query, city, sort]);

  const avgSatisfaction = useMemo(
    () => Math.round(LANDING_DOCTORS.reduce((s, d) => s + d.satisfaction, 0) / LANDING_DOCTORS.length),
    [],
  );
  const totalReviews = useMemo(
    () => LANDING_DOCTORS.reduce((s, d) => s + d.reviewsCount, 0),
    [],
  );

  const doctorName = (id: string) =>
    LANDING_DOCTORS.find((d) => d.id === id)?.name[locale as 'fa' | 'en'] ?? '';

  const scrollToDoctors = () =>
    document.getElementById('doctors')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const onHeroSearch = (e: FormEvent) => {
    e.preventDefault();
    scrollToDoctors();
  };

  const NAV_ANCHORS = [
    { id: 'doctors', key: 'ld.doctorsTitle' },
    { id: 'reviews', key: 'ld.commentsTitle' },
    { id: 'how', key: 'ld.howTitle' },
    { id: 'faq', key: 'ld.faqTitle' },
  ] as const;

  const visibleComments = allComments ? LANDING_COMMENTS : LANDING_COMMENTS.slice(0, 9);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Ambient background — soft floating blooms (CSS-only) */}
      <div className="fixed inset-0 -z-10 niva-grad overflow-hidden" aria-hidden="true">
        <div className="niva-blob h-72 w-72 sm:h-96 sm:w-96 -top-20 -start-16 bg-primary/25" />
        <div className="niva-blob niva-blob-2 h-64 w-64 sm:h-80 sm:w-80 top-1/3 -end-20 bg-secondary/25" />
        <div className="niva-blob niva-blob-3 h-56 w-56 sm:h-72 sm:w-72 bottom-0 start-1/4 bg-accent/30" />
      </div>

      {/* Structured data — ItemList of Physician with AggregateRating (post-mount, SSR-safe) */}
      {mounted && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: t('ld.doctorsTitle'),
              itemListElement: LANDING_DOCTORS.map((d, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                  '@type': 'Physician',
                  name: d.name[locale as 'fa' | 'en'],
                  medicalSpecialty: 'Obstetric',
                  address: { '@type': 'PostalAddress', addressLocality: d.city[locale as 'fa' | 'en'] },
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: d.rating,
                    bestRating: 5,
                    ratingCount: d.reviewsCount,
                  },
                },
              })),
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
          <nav className="hidden lg:flex items-center gap-1 mx-auto rounded-full border border-border/60 bg-background/50 px-2 py-1" aria-label={t('ld.doctorsTitle')}>
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
        {/* ── Hero — doctor search first ─────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-16 pb-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-sm font-medium text-primary">
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
            {t('ld.kicker')}
          </p>
          <h1 className="mt-5 text-4xl sm:text-5xl xl:text-[3.4rem] font-bold leading-[1.14] tracking-tight text-balance">
            {t('ld.h1a')}{' '}
            <span className="text-gradient">{t('ld.h1b')}</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t('ld.heroSub')}
          </p>

          {/* Search form */}
          <form onSubmit={onHeroSearch} role="search" className="mt-7 mx-auto max-w-xl flex gap-2" aria-label={t('ld.searchCta')}>
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('ld.searchPh')}
                aria-label={t('ld.searchPh')}
                className="ps-10 min-h-12 rounded-full bg-background/70 backdrop-blur text-base"
              />
            </div>
            <Button type="submit" size="lg" className="min-h-12 px-6 rounded-full shadow-lg shadow-primary/25">
              {t('ld.searchCta')}
            </Button>
          </form>

          {/* Stats strip */}
          <div className="mt-9 niva-card rounded-3xl grid grid-cols-2 lg:grid-cols-4 gap-y-5 p-5 sm:p-6 text-start">
            {([
              { v: num(locale, LANDING_DOCTORS.length), l: t('ld.statDoctors'), icon: Stethoscope, tile: 1 },
              { v: pctLabel(locale, avgSatisfaction), l: t('ld.statSatisfaction'), icon: Star, tile: 4 },
              { v: num(locale, totalReviews), l: t('ld.statReviews'), icon: MessageSquareHeart, tile: 3 },
              { v: num(locale, LANDING_CITIES.length), l: t('ld.statCities'), icon: MapPin, tile: 2 },
            ] as const).map((s) => (
              <div key={s.l} className="flex items-center gap-3 sm:gap-4">
                <span className="h-11 w-11 rounded-2xl grid place-items-center shrink-0" style={tileStyle(s.tile - 1)}>
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-2xl sm:text-3xl font-bold text-primary leading-none num">{s.v}</p>
                  <p className="text-xs sm:text-[13px] text-muted-foreground mt-1 leading-snug">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Doctors — the heart of the landing ──────────────────────────── */}
        <section id="doctors" aria-labelledby="doctors-title" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 id="doctors-title" className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {t('ld.doctorsTitle')}
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{t('ld.doctorsSub')}</p>
          </div>

          {/* Filter bar */}
          <div className="mt-7 niva-card rounded-2xl p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('ld.searchPh')}
                aria-label={t('ld.searchPh')}
                className="ps-9 min-h-10 bg-background/60"
              />
            </div>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-40 min-h-10 bg-background/60" aria-label={t('ld.filterCity')}>
                <SelectValue placeholder={t('ld.filterCity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('ld.allCities')}</SelectItem>
                {LANDING_CITIES.map((c) => (
                  <SelectItem key={c.en} value={c.en}>{c[locale as 'fa' | 'en'] ?? c.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-44 min-h-10 bg-background/60" aria-label={t('ld.sort')}>
                <SelectValue placeholder={t('ld.sort')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="satisfaction">{t('ld.sortSatisfaction')}</SelectItem>
                <SelectItem value="rating">{t('ld.sortRating')}</SelectItem>
                <SelectItem value="experience">{t('ld.sortExperience')}</SelectItem>
                <SelectItem value="fee">{t('ld.sortFee')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground ms-auto num" aria-live="polite">
              {t('ld.results').replace('{n}', num(locale, filtered.length))}
            </p>
          </div>

          {/* Doctor cards */}
          {filtered.length === 0 ? (
            <p className="mt-10 text-center text-muted-foreground">{t('ld.noResults')}</p>
          ) : (
            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              {filtered.map((d, i) => (
                <DoctorCard
                  key={d.id}
                  d={d}
                  index={i}
                  locale={locale}
                  t={t}
                  onBook={() => { trackLandingEvent('cta_start'); setView(go); }}
                  onReviews={scrollToDoctors}
                />
              ))}
            </div>
          )}
          <p className="mt-5 text-center text-xs text-muted-foreground">{t('ld.demoNote')}</p>
        </section>

        {/* ── Patient comments ────────────────────────────────────────────── */}
        <section id="reviews" aria-labelledby="reviews-title" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 id="reviews-title" className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {t('ld.commentsTitle')}
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{t('ld.commentsSub')}</p>
          </div>
          <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleComments.map((c, i) => (
              <CommentCard
                key={c.id}
                c={c}
                index={i}
                doctorName={doctorName(c.doctorId)}
                locale={locale}
                t={t}
              />
            ))}
          </div>
          {LANDING_COMMENTS.length > 9 && (
            <div className="mt-6 text-center">
              <Button variant="outline" className="min-h-11 rounded-full bg-background/60" onClick={() => setAllComments((v) => !v)} aria-expanded={allComments}>
                {allComments ? t('ld.showLess') : t('ld.showAll')}
              </Button>
            </div>
          )}
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section id="how" aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 id="how-title" className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {t('ld.howTitle')}
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{t('ld.howSub')}</p>
          </div>
          <ol className="mt-7 grid md:grid-cols-3 gap-4">
            {[
              { n: 1, title: t('ld.step1t'), body: t('ld.step1b') },
              { n: 2, title: t('ld.step2t'), body: t('ld.step2b') },
              { n: 3, title: t('ld.step3t'), body: t('ld.step3b') },
            ].map((s) => (
              <li key={s.n} className="niva-card rounded-2xl p-5 flex gap-3.5">
                <span className="h-10 w-10 rounded-2xl grid place-items-center font-bold text-lg shrink-0 num" style={tileStyle(s.n - 1)} aria-hidden="true">
                  {num(locale, s.n)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 sm:px-6 py-10 scroll-mt-20">
          <h2 id="faq-title" className="text-3xl sm:text-4xl font-bold tracking-tight text-center text-balance">
            {t('ld.faqTitle')}
          </h2>
          <Accordion type="single" collapsible className="mt-7">
            {[1, 2, 3, 4].map((n) => (
              <AccordionItem key={n} value={`faq-${n}`}>
                <AccordionTrigger className="text-start leading-snug">{t(`ld.faq${n}q`)}</AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">
                  {t(`ld.faq${n}a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* ── Closing CTA ─────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-14">
          <div className="niva-card rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">{t('ld.ctaTitle')}</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed max-w-xl mx-auto">{t('ld.ctaSub')}</p>
            <Button
              size="lg"
              className="mt-6 min-h-12 px-8 text-base rounded-full shadow-lg shadow-primary/25"
              onClick={() => { trackLandingEvent('cta_start'); setView(go); }}
            >
              {t('ld.ctaBtn')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      {/* ── Footer — sticky via flex column + mt-auto ──────────────────────── */}
      <footer className="mt-auto border-t bg-background/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <img src="/logo.svg" alt="NIVA" width={92} height={26} className="h-7 w-auto" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{t('ld.kicker')}</p>
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
