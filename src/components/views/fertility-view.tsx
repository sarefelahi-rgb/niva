'use client';

/**
 * Wave 14 — Cycle & fertility companion (pre-conception journey).
 * Period + intimate-day logging with an interactive month calendar, fertile
 * window and ovulation estimates (lib/cycle engine, educational only).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarHeart, Droplets, Heart, Info, Sparkles, Trash2, ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react';
import { computeCycleStats, classifyCycleDay, type CycleDayKind, type FlowLevel } from '@/lib/cycle';
import { formatDate } from '@/lib/format';

interface CycleEntry {
  id: string;
  date: string;
  flow?: string | null;
  notes?: string | null;
}

const FLOWS: FlowLevel[] = ['SPOTTING', 'LIGHT', 'MEDIUM', 'HEAVY'];

/** CycleDayKind → i18n legend key (PLAIN has no legend). */
const KIND_LEGEND: Partial<Record<CycleDayKind, string>> = {
  PERIOD: 'f.legendPeriod',
  PREDICTED_PERIOD: 'f.legendPredicted',
  FERTILE: 'f.legendFertile',
  OVULATION: 'f.legendOvulation',
  INTIMACY: 'f.legendIntimacy',
};

/** Local date → yyyy-mm-dd for <input type="date"> and day keys. */
function dayKey(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function FertilityView() {
  const { t, locale } = useApp();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<CycleEntry[]>([]);
  const [intimacy, setIntimacy] = useState<CycleEntry[]>([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState<Date | null>(null);
  const [flow, setFlow] = useState<FlowLevel>('MEDIUM');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cycle', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error('load failed');
      setPeriod(Array.isArray(data?.period) ? data.period : []);
      setIntimacy(Array.isArray(data?.intimacy) ? data.intimacy : []);
    } catch {
      toast({ description: t('err.validation'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => computeCycleStats(period), [period]);
  const intimacyDays = useMemo(
    // Entries arrive as full ISO instants (UTC midnight); normalize to the
    // local calendar day so the grid matches regardless of timezone.
    () => new Set(intimacy.map((e) => new Date(e.date).setHours(0, 0, 0, 0))),
    [intimacy]
  );
  const today = useMemo(() => new Date(), []);

  // Month grid (Saturday-first for fa, Sunday-first for en).
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const weekStart = locale === 'fa' ? 6 : 0; // Saturday / Sunday
    const lead = (first.getDay() - weekStart + 7) % 7;
    const cells: Array<Date | null> = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor, locale]);

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-gregory' : 'en-US', {
        month: 'long', year: 'numeric',
      }).format(cursor);
    } catch {
      return dayKey(cursor);
    }
  }, [cursor, locale]);

  const weekdayLabels = useMemo(() => {
    // Anchor: 2024-01-07 was a Saturday (fa week start) / 2024-01-01 a Monday.
    const base = locale === 'fa' ? new Date(2024, 0, 6) : new Date(2024, 0, 7);
    const fmt = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(base.getTime() + i * 86_400_000)));
  }, [locale]);

  const logDay = async (day: Date | string, kind: 'PERIOD' | 'INTIMACY', flowLevel: FlowLevel = 'MEDIUM') => {
    setBusy(true);
    try {
      // Send the plain calendar date (yyyy-mm-dd): the server normalizes it to
      // UTC midnight of that day, keeping the user's intended day stable
      // across timezones (an ISO instant of local midnight would shift ±1 day).
      const date = typeof day === 'string' ? day : dayKey(day);
      const body = kind === 'PERIOD' ? { kind, date, flow: flowLevel } : { kind, date };
      const res = await fetch('/api/cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({ description: data?.error?.message ?? t('err.validation'), variant: 'destructive' });
        return;
      }
      toast({ description: t('wellness.saved') });
      setSelected(null);
      await load();
    } catch {
      toast({ description: t('err.validation'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (kind: 'PERIOD' | 'INTIMACY', id: string) => {
    try {
      const res = await fetch(`/api/cycle?kind=${kind}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      await load();
    } catch {
      toast({ description: t('err.validation'), variant: 'destructive' });
    }
  };

  const shiftMonth = (delta: number) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  const cellClass = (kind: CycleDayKind): string => {
    switch (kind) {
      case 'PERIOD': return 'bg-primary text-primary-foreground font-semibold';
      case 'PREDICTED_PERIOD': return 'border-2 border-dashed border-primary/60 text-primary font-medium';
      case 'FERTILE': return 'bg-accent/30 text-accent-foreground font-medium';
      case 'OVULATION': return 'bg-accent/50 ring-2 ring-accent font-bold';
      default: return 'hover:bg-muted/60';
    }
  };

  const summaryTiles: Array<{ label: string; value: string | null; icon: typeof Heart; active: boolean }> = [
    {
      label: t('f.cycleDay'),
      value: stats.cycleDay !== null ? `${stats.cycleDay}` : null,
      icon: CalendarDays,
      active: stats.cycleDay !== null,
    },
    {
      label: t('f.avgCycle'),
      value: stats.avgCycleDays !== null ? `${stats.avgCycleDays} ${t('common.days')}` : null,
      icon: CalendarHeart,
      active: stats.avgCycleDays !== null,
    },
    {
      label: t('f.nextPeriod'),
      value: stats.nextPeriodStart ? formatDate(stats.nextPeriodStart, locale) : null,
      icon: Droplets,
      active: !!stats.nextPeriodStart,
    },
    {
      label: t('f.fertileWindow'),
      value: stats.fertileWindow
        ? `${formatDate(stats.fertileWindow.start, locale)} — ${formatDate(stats.fertileWindow.end, locale)}`
        : null,
      icon: Sparkles,
      active: !!stats.fertileWindow,
    },
  ];

  const selectedKind: CycleDayKind | null = selected ? classifyCycleDay(selected, stats, intimacyDays, today) : null;

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarHeart className="h-6 w-6 text-primary" aria-hidden />
          {t('f.title')}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t('f.sub')}</p>
      </header>

      {/* Summary tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label={t('f.calendarTitle')}>
        {summaryTiles.map(({ label, value, icon: Icon, active }) => (
          <Card key={label} className="niva-card">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </div>
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : value ? (
                <p dir="auto" className="text-sm font-bold leading-snug">{value}</p>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
              {!active && !loading && <p className="text-[10px] text-muted-foreground leading-snug">{t('f.needMoreData')}</p>}
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Calendar */}
      <Card className="niva-card">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
              {t('f.calendarTitle')}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label={t('common.back')} className="min-h-11 min-w-11">
                {locale === 'fa' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <span dir="auto" className="text-sm font-semibold min-w-28 text-center">{monthLabel}</span>
              <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label={t('common.next')} className="min-h-11 min-w-11">
                {locale === 'fa' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1.5" role="row">
                {weekdayLabels.map((w) => (
                  <div key={w} dir="auto" className="text-center text-[10px] sm:text-xs text-muted-foreground font-medium py-1">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1" role="grid" aria-label={monthLabel}>
                {grid.map((day, i) => {
                  if (!day) return <div key={`x-${i}`} aria-hidden />;
                  const kind = classifyCycleDay(day, stats, intimacyDays, today);
                  const isToday = dayKey(day) === dayKey(today);
                  return (
                    <button
                      key={dayKey(day)}
                      type="button"
                      onClick={() => { setSelected(day); setFlow('MEDIUM'); }}
                      aria-label={`${dayKey(day)}${KIND_LEGEND[kind] ? ` — ${t(KIND_LEGEND[kind]!)}` : ''}`}
                      className={`relative aspect-square min-h-11 rounded-xl text-xs sm:text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${cellClass(kind)} ${isToday ? 'ring-2 ring-foreground/70' : ''}`}
                    >
                      <span className="num">{day.getDate()}</span>
                      {kind === 'INTIMACY' && (
                        <Heart className="absolute bottom-0.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 h-2.5 w-2.5 text-rose-500 fill-rose-400" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-primary inline-block" aria-hidden />{t('f.legendPeriod')}</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-accent/50 inline-block" aria-hidden />{t('f.legendFertile')}</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-accent inline-block ring-1 ring-accent" aria-hidden />{t('f.legendOvulation')}</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-dashed border-primary/60 inline-block" aria-hidden />{t('f.legendPredicted')}</span>
                <span className="flex items-center gap-1.5"><Heart className="h-3 w-3 text-rose-500 fill-rose-400" aria-hidden />{t('f.legendIntimacy')}</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{t('f.today')}: <span dir="auto">{formatDate(today, locale)}</span></p>
            </>
          )}
        </CardContent>
      </Card>

      <Alert className="border-warning/40 bg-warning/5">
        <Info className="h-4 w-4" />
        <AlertTitle className="font-semibold">{t('f.ovulation')} · {t('f.fertileWindow')}</AlertTitle>
        <AlertDescription className="text-xs sm:text-sm leading-relaxed">{t('f.disclaimer')}</AlertDescription>
      </Alert>

      {/* Quick log forms */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="niva-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary" aria-hidden />
              {t('f.logPeriod')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const el = (e.currentTarget.elements.namedItem('period-date') as HTMLInputElement | null);
                if (el?.value) logDay(el.value, 'PERIOD', flow);
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="period-date">{t('born.birthDate')}</Label>
                  <Input id="period-date" type="date" dir="ltr" required max={dayKey(today)} className="min-h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="period-flow">{t('f.flow')}</Label>
                  <Select value={flow} onValueChange={(v) => setFlow(v as FlowLevel)}>
                    <SelectTrigger id="period-flow" className="min-h-11 w-full" aria-label={t('f.flow')}>
                      <span className="truncate">{t(`f.flow${flow}`)}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {FLOWS.map((f) => (
                        <SelectItem key={f} value={f}>{t(`f.flow${f}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={busy} className="min-h-11 w-full sm:w-auto">
                {t('f.markPeriod')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="niva-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" aria-hidden />
              {t('f.logIntimacy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const el = (e.currentTarget.elements.namedItem('intimacy-date') as HTMLInputElement | null);
                if (el?.value) logDay(el.value, 'INTIMACY');
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="intimacy-date">{t('born.birthDate')}</Label>
                <Input id="intimacy-date" type="date" dir="ltr" required max={dayKey(today)} className="min-h-11" />
              </div>
              <Button type="submit" disabled={busy} className="min-h-11 w-full sm:w-auto">
                {t('f.markIntimacy')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <section className="space-y-3" aria-label={t('f.history')}>
        <h2 className="text-lg font-semibold">{t('f.history')}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {([
            { title: t('f.legendPeriod'), icon: Droplets, entries: period.slice(-10).reverse(), kind: 'PERIOD' as const },
            { title: t('f.legendIntimacy'), icon: Heart, entries: intimacy.slice(-10).reverse(), kind: 'INTIMACY' as const },
          ]).map(({ title, icon: Icon, entries, kind }) => (
            <Card key={kind} className="niva-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                  {title}
                  <Badge variant="secondary" className="num text-[10px]">{entries.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-10 w-full" />
                ) : entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {entries.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                        <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p dir="auto" className="text-sm font-medium truncate">{formatDate(new Date(e.date), locale)}</p>
                          {kind === 'PERIOD' && e.flow && (
                            <p className="text-xs text-muted-foreground">{t(`f.flow${e.flow}`)}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => removeEntry(kind, e.id)}
                          aria-label={t('common.delete')}
                          className="shrink-0 text-muted-foreground hover:text-destructive min-h-11 min-w-11"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Day-log dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => (!v ? setSelected(null) : undefined)}>
        <DialogContent className="max-w-sm" dir="auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{t('f.dayActions')}</DialogTitle>
            <DialogDescription dir="auto" className="text-sm">
              {selected ? formatDate(selected, locale) : ''}
              {selectedKind && KIND_LEGEND[selectedKind] ? (
                <Badge variant="secondary" className="ms-2 text-[10px]">
                  {t(KIND_LEGEND[selectedKind]!)}
                </Badge>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="day-flow">{t('f.flow')}</Label>
              <Select value={flow} onValueChange={(v) => setFlow(v as FlowLevel)}>
                <SelectTrigger id="day-flow" className="min-h-11 w-full" aria-label={t('f.flow')}>
                  <span className="truncate">{t(`f.flow${flow}`)}</span>
                </SelectTrigger>
                <SelectContent>
                  {FLOWS.map((f) => (
                    <SelectItem key={f} value={f}>{t(`f.flow${f}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={busy} onClick={() => selected && logDay(selected, 'PERIOD', flow)} className="w-full min-h-11">
              <Droplets className="h-4 w-4 me-2" aria-hidden />
              {t('f.markPeriod')}
            </Button>
            <Button disabled={busy} onClick={() => selected && logDay(selected, 'INTIMACY')} variant="outline" className="w-full min-h-11">
              <Heart className="h-4 w-4 me-2 text-rose-500" aria-hidden />
              {t('f.markIntimacy')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
