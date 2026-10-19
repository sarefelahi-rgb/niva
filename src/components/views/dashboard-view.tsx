'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { gestationalAgeAt, trimesterOf } from '@/lib/gestational';
import { WEEKLY_CONTENT } from '@/data/weekly-content';
import { Activity, Box, Sparkles, Stethoscope, HeartPulse, Bell, CalendarClock, Info } from 'lucide-react';

interface Appointment { id: string; title: string; scheduledAt: string; provider: string | null }
interface Reminder { id: string; title: string; dueAt: string; type: string }

export function DashboardView() {
  const { t, user, pregnancy, setView, locale } = useApp();
  const [next, setNext] = useState<Appointment | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const ga = pregnancy?.dueDate ? gestationalAgeAt({ dueDate: new Date(pregnancy.dueDate) }) : null;
  const week = ga ? Math.max(0, ga.weeks) : 0;
  const weekContent = WEEKLY_CONTENT.find((w) => w.week === Math.min(Math.max(week, 4), 40));

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch('/api/appointments').then((r) => r.json()).catch(() => null),
      fetch('/api/reminders').then((r) => r.json()).catch(() => null),
    ]).then(([appt, rem]) => {
      if (!alive) return;
      setNext(appt?.upcoming?.[0] ?? null);
      setReminders((rem?.reminders ?? []).slice(0, 4));
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  if (!pregnancy || !ga) {
    return (
      <div className="space-y-4">
        <Card className="niva-card">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-lg font-semibold">{t('onboarding.title')}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('onboarding.intro')}</p>
            <Button onClick={() => setView('onboarding')} className="min-h-12">{t('onboarding.finish')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = Math.min(100, Math.round((ga.totalDays / 280) * 100));
  const trimester = trimesterOf(week);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Greeting + week hero */}
      <section aria-label={t('dash.progress')} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 niva-card niva-grad overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{t('dash.greeting')} {user?.name?.split(' ')[0]} 👋</h1>
              <Badge variant="secondary">{t('dash.trimester')} {trimester}</Badge>
              {pregnancy.datingLocked && <Badge variant="outline">🔒 {locale === 'fa' ? 'تأیید پزشک' : 'Clinician-confirmed'}</Badge>}
            </div>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-extrabold text-primary num leading-none">{week}</span>
              <div className="pb-1">
                <p className="font-semibold">{t('dash.weekOf')}</p>
                <p className="text-sm text-muted-foreground num">{ga.days} {t('common.days')} · {Math.max(0, 280 - ga.totalDays)} {t('dash.dueIn')}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>{t('dash.progress')}</span>
                <span className="num">{progress}%</span>
              </div>
              <Progress value={progress} aria-label={t('dash.progress')} />
            </div>
            {weekContent && (
              <p className="text-sm text-muted-foreground border-t pt-3">
                {t('dash.babySize')} <span className="font-semibold text-foreground">{locale === 'fa' ? weekContent.sizeComparisonFa : weekContent.sizeComparisonEn}</span>
                {weekContent.lengthCm && <> · <span className="num">{weekContent.lengthCm} cm</span>{weekContent.weightG ? <> · <span className="num">{weekContent.weightG} g</span></> : null} · <span className="text-xs">({t('common.approximate')})</span></>}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="niva-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('dash.quickActions')}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2.5">
            {([
              ['tracking', Activity, t('dash.trackToday')],
              ['studio', Box, t('dash.openStudio')],
              ['assistant', Sparkles, t('dash.askNiva')],
              ['appointments', Stethoscope, t('nav.appointments')],
            ] as const).map(([v, Icon, label]) => (
              <Button key={v} variant="outline" onClick={() => setView(v)} className="h-20 flex-col gap-1.5 min-h-11">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-xs leading-tight text-center">{label}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

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

      {/* Schedule */}
      <section className="grid gap-4 md:grid-cols-2" aria-label="schedule">
        <Card className="niva-card">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <CalendarClock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t('dash.nextAppointment')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-12 w-full" /> : next ? (
              <div className="space-y-1">
                <p className="font-semibold">{next.title}</p>
                <p className="text-sm text-muted-foreground num">{new Date(next.scheduledAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</p>
                {next.provider && <p className="text-sm text-muted-foreground">{next.provider}</p>}
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
                <span className="text-xs text-muted-foreground num shrink-0 ms-2">{new Date(r.dueAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
