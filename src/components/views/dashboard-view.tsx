'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { gestationalAgeAt, trimesterOf } from '@/lib/gestational';
import { babyAgeAt } from '@/lib/cycle';
import type { Locale } from '@/lib/i18n';
import { formatDate, formatDateTime, formatWeeksDays, bdiWrap } from '@/lib/format';
import { formatMessage } from '@/lib/icu';
import { WEEKLY_CONTENT } from '@/data/weekly-content';
import { BlockMenu } from '@/components/shell/block-menu';
import { tileStyle } from '@/components/shell/nav-config';
import { BirthDialog } from '@/components/shell/birth-dialog';
import { Activity, Box, Sparkles, Stethoscope, HeartPulse, Bell, CalendarClock, Info, RotateCcw, CalendarDays, Lock, CalendarHeart, Baby, Flower2 } from 'lucide-react';

interface Appointment { id: string; title: string; scheduledAt: string; provider: string | null }
interface Reminder { id: string; title: string; dueAt: string; type: string }
interface CycleStatsLike {
  avgCycleDays: number | null;
  nextPeriodStart: string | null;
  ovulationDate: string | null;
  fertileWindow: { start: string; end: string } | null;
  cycleDay: number | null;
}
interface BabyProfileLite {
  name: string;
  birthDate: string;
  gender: string;
}

/** Educational dating-uncertainty band by confidence (never a diagnostic claim). */
const UNCERTAINTY_DAYS: Record<string, number> = { HIGH: 7, MEDIUM: 14, LOW: 21 };

/** Educational prenatal-visit cadence (clinic schedule always takes priority). */
const VISIT_CADENCE: Array<{ trimester: 1 | 2 | 3; en: string; fa: string }> = [
  { trimester: 1, en: 'First visit by week 10 · dating scan 8–14w', fa: 'نوبت اول تا هفته ۱۰ · سونوگرافی تاریخ‌گذاری ۸ تا ۱۴' },
  { trimester: 2, en: 'Anatomy scan 18–22w · glucose screen 24–28w', fa: 'سونوگرافی آنومالی ۱۸ تا ۲۲ · غربالگری قند ۲۴ تا ۲۸' },
  { trimester: 3, en: 'Visits every 2–3w from 28w · weekly near term', fa: 'ویزیت هر ۲ تا ۳ هفته از هفته ۲۸ · نزدیک ترم هفتگی' },
];

function GestationalClock({ progress, week, locale }: { progress: number; week: number; locale: Locale }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, progress)) / 100) * c;
  return (
    // Localized accessible name (wave 6.3) — was a bare Latin digit.
    <div className="relative h-32 w-32 shrink-0" role="img" aria-label={formatWeeksDays(week, 0, locale)}>
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="64" cy="64" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c} strokeDashoffset={c - filled}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-3xl font-extrabold text-primary num leading-none">{week}</p>
          <p className="text-[10px] text-muted-foreground font-medium">week</p>
        </div>
      </div>
    </div>
  );
}

export function DashboardView() {
  const { t, user, pregnancy, setView, locale } = useApp();
  const [next, setNext] = useState<Appointment | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [cycleStats, setCycleStats] = useState<CycleStatsLike | null>(null);
  const [baby, setBaby] = useState<BabyProfileLite | null>(null);
  const [birthOpen, setBirthOpen] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setFailed(false);
    try {
      const [apptRes, remRes, prefRes] = await Promise.all([
        fetch('/api/appointments', { signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/reminders', { signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/preferences', { signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      // Stale-response guard: a StrictMode/unmount-aborted run must never
      // overwrite the state written by the live run (offline-tolerant state).
      if (signal?.aborted) return;
      setNext(apptRes?.upcoming?.[0] ?? null);
      setReminders((remRes?.reminders ?? []).slice(0, 4));
      const st = prefRes?.stage ?? null;
      setStage(st);
      if (!apptRes && !remRes) setFailed(true); // both failed → show retry
      // Stage journey data (wave 14): cycle companion for TRYING, baby for POSTPARTUM.
      if (st === 'TRYING') {
        const cyc = await fetch('/api/cycle', { signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        if (!signal?.aborted) setCycleStats(cyc?.stats ?? null);
      } else if (st === 'POSTPARTUM') {
        const bb = await fetch('/api/baby', { signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        if (!signal?.aborted) setBaby(bb?.profile ?? null);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const ga = pregnancy?.dueDate ? gestationalAgeAt({ dueDate: new Date(pregnancy.dueDate) }) : null;
  const week = ga ? Math.max(0, ga.weeks) : 0;
  const weekContent = WEEKLY_CONTENT.find((w) => w.week === Math.min(Math.max(week, 4), 40));

  // Stage-aware no-pregnancy state: TRYING/POSTPARTUM/EXPLORING users get a
  // welcoming card instead of being pushed back into pregnancy onboarding.
  // A pregnancy whose status moved to POSTPARTUM (birth registered, wave 14)
  // also lands here — the journey continues with the baby, not the bump.
  const postpartumJourney = pregnancy?.status === 'POSTPARTUM';
  if (!pregnancy || !ga || postpartumJourney) {
    // displayStage: null while preferences load; POSTPARTUM is forced when the
    // pregnancy status already moved (birth registered) so the baby card shows
    // immediately — never call .charAt on the null stage.
    const displayStage: string | null = postpartumJourney ? 'POSTPARTUM' : stage;
    const nonPregnant = displayStage !== null && displayStage !== 'PREGNANT';
    const babyAge = baby ? babyAgeAt(new Date(baby.birthDate)) : null;
    return (
      <div className="space-y-4">
        <BlockMenu />
        <Card className="niva-card">
          <CardContent className="p-8 text-center space-y-3">
            {displayStage === 'POSTPARTUM' ? (
              <Flower2 className="h-8 w-8 text-primary mx-auto" aria-hidden />
            ) : displayStage === 'TRYING' ? (
              <CalendarHeart className="h-8 w-8 text-primary mx-auto" aria-hidden />
            ) : null}
            <p className="text-lg font-semibold">
              {nonPregnant && displayStage
                ? t(`onboarding.stage${displayStage.charAt(0)}${displayStage.slice(1).toLowerCase()}`)
                : t('onboarding.title')}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {nonPregnant ? t('dash.stageWelcome') : t('onboarding.intro')}
            </p>
            {!nonPregnant && (
              <Button onClick={() => setView('onboarding')} className="min-h-12">{t('onboarding.finish')}</Button>
            )}

            {/* TRYING → cycle summary + companion CTA */}
            {displayStage === 'TRYING' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-start">
                {([
                  ['f.cycleDay', cycleStats?.cycleDay != null ? String(cycleStats.cycleDay) : null],
                  ['f.avgCycle', cycleStats?.avgCycleDays != null ? `${cycleStats.avgCycleDays} ${t('common.days')}` : null],
                  ['f.nextPeriod', cycleStats?.nextPeriodStart ? formatDate(new Date(cycleStats.nextPeriodStart), locale) : null],
                  ['f.fertileWindow', cycleStats?.fertileWindow ? `${formatDate(new Date(cycleStats.fertileWindow.start), locale)} — ${formatDate(new Date(cycleStats.fertileWindow.end), locale)}` : null],
                ] as const).map(([key, value]) => (
                  <div key={key} className="rounded-xl border bg-primary/5 p-2.5">
                    <p className="text-[10px] text-muted-foreground truncate">{t(key)}</p>
                    <p dir="auto" className="text-xs font-bold mt-0.5 truncate">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
            {displayStage === 'TRYING' && (
              <Button onClick={() => setView('fertility')} className="min-h-11">
                <CalendarHeart className="h-4 w-4 me-2" aria-hidden />{t('f.dashOpen')}
              </Button>
            )}

            {/* POSTPARTUM → baby card or birth registration CTA */}
            {displayStage === 'POSTPARTUM' && baby && babyAge && (
              <div className="mx-auto max-w-sm rounded-2xl border bg-primary/5 p-4 space-y-1">
                <p className="flex items-center justify-center gap-2 text-base font-bold">
                  <Baby className="h-4 w-4 text-primary" aria-hidden />{bdiWrap(baby.name)}
                </p>
                <p dir="auto" className="text-sm text-muted-foreground">
                  {t('post2.age')}:{' '}
                  {babyAge.months >= 1
                    ? `${babyAge.months} ${t('post2.months')}${babyAge.days ? ` و ${babyAge.days} ${t('post2.days')}` : ''}`
                    : `${babyAge.weeks} ${t('post2.weeks')}${babyAge.weekDays ? ` و ${babyAge.weekDays} ${t('post2.days')}` : ''}`}
                </p>
              </div>
            )}
            {displayStage === 'POSTPARTUM' && (
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {baby && (
                  <Button onClick={() => setView('postpartum')} className="min-h-11">
                    <Flower2 className="h-4 w-4 me-2" aria-hidden />{t('nav.postpartum')}
                  </Button>
                )}
                <Button variant={baby ? 'outline' : 'default'} onClick={() => setBirthOpen(true)} className="min-h-11">
                  <Baby className="h-4 w-4 me-2" aria-hidden />{baby ? t('post2.editProfile') : t('born.cta')}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto pt-2">
              <Button variant="outline" onClick={() => setView('tracking')} className="min-h-11 flex-col gap-1 h-16">
                <Activity className="h-5 w-5 text-primary" /><span className="text-xs">{t('dash.trackToday')}</span>
              </Button>
              <Button variant="outline" onClick={() => setView('assistant')} className="min-h-11 flex-col gap-1 h-16">
                <Sparkles className="h-5 w-5 text-primary" /><span className="text-xs">{t('dash.askNiva')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        <BirthDialog open={birthOpen} onClose={() => setBirthOpen(false)} existing={baby} />
      </div>
    );
  }

  const progress = Math.min(100, Math.round((ga.totalDays / 280) * 100));
  const trimester = trimesterOf(week);
  const uncertainty = UNCERTAINTY_DAYS[pregnancy.datingConfidence ?? 'MEDIUM'] ?? 14;
  const dueDate = new Date(pregnancy.dueDate);
  // Wave 6.3: locale primitives — fa renders the Jalali calendar («۱ فروردین
  // ۱۴۰۵»). Results contain RTL month words → render in dir="auto" spans, NOT
  // `.num` (an LTR embed would visually reorder the Persian date).
  const fmtDate = (d: Date) => formatDate(d, locale);
  // Wave 6.3 ICU demo site: plural via CLDR categories (en one/other) instead
  // of hand-assembled "N days to go". Inline bilingual pattern matches the
  // view's existing inline-fa convention (VISIT_CADENCE above); migrating the
  // pattern into i18n.ts is a documented follow-up (dict frozen this wave).
  const daysToGo = Math.max(0, 280 - ga.totalDays);
  const dueInLabel = formatMessage(
    locale,
    locale === 'fa'
      ? '{d, number} روز باقی مانده'
      : '{d, plural, one {# day to go} other {# days to go}}',
    { d: daysToGo },
  );
  // The dataset value already carries the comparison phrase — strip it so the
  // labelled sentence does not duplicate ("Baby is about the size of About the size of…").
  const babySize = weekContent
    ? (locale === 'fa' ? weekContent.sizeComparisonFa : weekContent.sizeComparisonEn)
      .replace(/^حدود به اندازه‌ی\s*/, '').replace(/^About the size of\s*/i, '')
    : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Block menu — the navigation as a colorful tile grid (sidebar replaced) */}
      <BlockMenu />

      {/* Greeting + gestational clock hero */}
      <section aria-label={t('dash.progress')} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 niva-card niva-grad overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              {/* bdi isolate: user names may be Latin inside this fa RTL heading */}
              <h1 className="text-2xl font-bold">{t('dash.greeting')} {user?.name ? bdiWrap(user.name.split(' ')[0]) : ''} 🌸</h1>
              <Badge variant="secondary">{t('dash.trimester')} {trimester}</Badge>
              {pregnancy.datingLocked && (
                <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />{locale === 'fa' ? 'تأیید پزشک' : 'Clinician-confirmed'}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground -mt-3">{t('dash.joy')}</p>
            <div className="flex items-center gap-5">
              <GestationalClock progress={progress} week={week} locale={locale} />
              <div className="min-w-0">
                {/* Wave 6.3 week label: formatWeeksDays (fa «هفته ۱۲ و ۳ روز» / en plural) */}
                <p dir="auto" className="font-semibold">{formatWeeksDays(ga.weeks, ga.days, locale)}</p>
                <p dir="auto" className="text-sm text-muted-foreground">{dueInLabel}</p>
                <div className="mt-2 text-sm space-y-0.5">
                  <p><span className="text-muted-foreground">{t('onboarding.preview')}: </span><span dir="auto" className="font-semibold">{fmtDate(dueDate)}</span></p>
                  <p dir="auto" className="text-xs text-muted-foreground">
                    {t('dash.dueRangeFrom')} {fmtDate(new Date(dueDate.getTime() - uncertainty * 86400000))} {t('dash.dueRangeTo')} {fmtDate(new Date(dueDate.getTime() + uncertainty * 86400000))}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Info className="h-3 w-3 shrink-0" />
                  <span>
                    {t('dash.uncertainty')} <span className="num">±{uncertainty}</span> {t('dash.uncertaintySuffix')}
                  </span>
                </p>
              </div>
            </div>
            {weekContent && (
              <p className="text-sm text-muted-foreground border-t pt-3">
                {t('dash.babySize')} <span className="font-semibold text-foreground">{babySize}</span>
                {weekContent.lengthCm && <> · <span className="num">{weekContent.lengthCm} cm</span>{weekContent.weightG ? <> · <span className="num">{weekContent.weightG} g</span></> : null} · <span className="text-xs">({t('common.approximate')})</span></>}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick actions — same pastel tile language as the block menu */}
        <Card className="niva-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('dash.quickActions')}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2.5">
            {([
              ['tracking', Activity, t('dash.trackToday'), 2],
              ['studio', Box, t('dash.openStudio'), 4],
              ['assistant', Sparkles, t('dash.askNiva'), 3],
              ['appointments', Stethoscope, t('nav.appointments'), 1],
            ] as const).map(([v, Icon, label, tile]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={tileStyle(tile)}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 min-h-11 h-20 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <span className="grid place-items-center h-9 w-9 rounded-xl bg-white/60 dark:bg-white/10 shadow-sm">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-semibold leading-tight text-center">{label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Birth registration (term-approach companion, wave 14) */}
      {week >= 36 && (
        <Card className="niva-card border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium leading-relaxed">🌸 {t('born.cta')}</p>
            <Button onClick={() => setBirthOpen(true)} className="min-h-11">{t('born.title')}</Button>
          </CardContent>
        </Card>
      )}

      {/* Safety + dating notices */}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="notices">
        <Alert className="border-destructive/30 bg-destructive/5">
          <HeartPulse className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive font-semibold">{t('dash.redFlag')}</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm leading-relaxed">
            {t('dash.redFlagBody')}
            <Button variant="link" size="sm" className="px-0 h-auto text-destructive underline" onClick={() => setView('safety')}>
              {t('dash.redFlagCta')}
            </Button>
          </AlertDescription>
        </Alert>
        {pregnancy.datingConfidence === 'LOW' && (
          <Alert className="border-warning/40 bg-warning/5">
            <Info className="h-4 w-4" />
            <AlertTitle>{t('dash.datingBanner')}</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">{t('onboarding.uncertainNote')}</AlertDescription>
          </Alert>
        )}
      </section>

      {/* Schedule + visit cadence */}
      <section className="grid gap-4 md:grid-cols-3" aria-label="schedule">
        <Card className="niva-card">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <CalendarClock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t('dash.nextAppointment')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-12 w-full" /> : next ? (
              <div className="space-y-1">
                <p className="font-semibold">{next.title}</p>
                {/* Wave 6.3: Jalali date+time for fa (was plain fa-IR numeric) */}
                <p dir="auto" className="text-sm text-muted-foreground">{formatDateTime(next.scheduledAt, locale)}</p>
                {next.provider && <p className="text-sm text-muted-foreground">{next.provider}</p>}
              </div>
            ) : failed ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t('dash.fetchError')}</p>
                <Button variant="outline" size="sm" onClick={() => load()} className="min-h-11"><RotateCcw className="h-4 w-4 me-1.5" />{t('common.retry')}</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
            )}
          </CardContent>
        </Card>
        <Card className="niva-card">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t('dash.reminders')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <Skeleton className="h-12 w-full" /> : reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
            ) : reminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                <span className="truncate">{r.title}</span>
                <span dir="auto" className="text-xs text-muted-foreground shrink-0 ms-2">{formatDate(r.dueAt, locale)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="niva-card">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <CalendarDays className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t('dash.visits')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {VISIT_CADENCE.map((v) => (
              <div key={v.trimester} className="flex items-start gap-2 text-xs">
                <Badge variant={v.trimester === trimester ? 'default' : 'outline'} className="shrink-0 num">{v.trimester}</Badge>
                <span className="text-muted-foreground leading-relaxed">{locale === 'fa' ? v.fa : v.en}</span>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground border-t pt-2">{t('dash.visitsNote')}</p>
          </CardContent>
        </Card>
      </section>

      <BirthDialog open={birthOpen} onClose={() => setBirthOpen(false)} />
    </div>
  );
}
