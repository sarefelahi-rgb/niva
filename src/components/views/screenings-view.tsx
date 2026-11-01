'use client';

/**
 * Wave 17 — «آزمایش‌ها و سونوگرافی‌های بارداری» (feature 6).
 * Read-only catalog of the reviewed seed: ultrasounds / lab tests / screenings
 * / diagnostic tests. Each card carries purpose, typical window, indication
 * class, plain-language method, limitations, preparation and the source.
 * A "relevant around now" band highlights items matching the current
 * gestational week — framed as a conversation with the clinician, never a
 * schedule, and the app never outputs results or diagnoses (§7.6).
 */

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/app';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Microscope, Waves, FlaskConical, ScanSearch, ShieldCheck, CircleAlert,
  Info, CalendarClock, Stethoscope,
} from 'lucide-react';
import { gestationalAgeAt } from '@/lib/gestational';
import type { Locale } from '@/lib/i18n';

interface ScreeningItem {
  slug: string;
  kind: string;
  nameFa: string;
  nameEn: string;
  purposeFa: string;
  purposeEn: string;
  weeksFrom: number | null;
  weeksTo: number | null;
  indication: string;
  methodFa: string;
  methodEn: string;
  clinicianMayOrderFa: string | null;
  clinicianMayOrderEn: string | null;
  limitationsFa: string;
  limitationsEn: string;
  preparationFa: string | null;
  preparationEn: string | null;
  medicalReference: string;
  reviewedAt: string;
  inWindow: boolean | null;
}

const KIND_ICON: Record<string, typeof Microscope> = {
  ULTRASOUND: Waves,
  LAB_TEST: FlaskConical,
  SCREENING: ScanSearch,
  DIAGNOSTIC: Microscope,
};

const KINDS = ['ULTRASOUND', 'LAB_TEST', 'SCREENING', 'DIAGNOSTIC'] as const;

function fmtWeeks(from: number | null, to: number | null, locale: Locale): string {
  const fa = locale === 'fa';
  const n = (v: number) => new Intl.NumberFormat(fa ? 'fa-IR' : 'en-US').format(v);
  if (from == null && to == null) return '';
  if (from != null && to != null) return fa ? `هفته ${n(from)} تا ${n(to)}` : `Weeks ${from}–${to}`;
  if (from != null) return fa ? `از هفته ${n(from)}` : `From week ${from}`;
  return fa ? `تا هفته ${n(to!)}` : `Until week ${to}`;
}

export function ScreeningsView() {
  const { t, locale, pregnancy } = useApp();
  const [items, setItems] = useState<ScreeningItem[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<string>('all');

  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/screenings', { signal: ac.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        setItems((data?.items ?? []) as ScreeningItem[]);
        setCurrentWeek(data?.currentWeek ?? null);
      })
      .catch(() => undefined)
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, []);

  // Client week when the pregnancy is already known from the store.
  const dueDate = pregnancy?.dueDate ?? null;
  const storeWeek = useMemo(() => {
    if (!dueDate) return null;
    const ga = gestationalAgeAt({ dueDate: new Date(dueDate) });
    return ga.totalDays >= 0 ? Math.min(Math.max(ga.weeks, 4), 40) : null;
  }, [dueDate]);
  const week = currentWeek ?? storeWeek;

  const shown = useMemo(
    () => items.filter((i) => (kind === 'all' ? true : i.kind === kind)),
    [items, kind],
  );
  const inWindow = shown.filter((i) => i.inWindow);
  const rest = shown.filter((i) => !i.inWindow);

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Microscope className="h-6 w-6 text-primary" aria-hidden />{t('scr.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('scr.sub')}</p>
      </header>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">{t('scr.windowNote')} {t('scr.disclaimer')}</AlertDescription>
      </Alert>

      {/* Kind filter */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('scr.kindAll')}>
        <button type="button" aria-pressed={kind === 'all'} onClick={() => setKind('all')}
          className={`rounded-full border px-4 py-2.5 text-sm min-h-11 transition-colors ${kind === 'all' ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}>
          {t('scr.kindAll')}
        </button>
        {KINDS.map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(kind === k ? 'all' : k)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm min-h-11 transition-colors ${kind === k ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}>
              <Icon className="h-4 w-4" aria-hidden />{t(`scr.kind.${k}`)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Items relevant around the current week */}
          {week != null && inWindow.length > 0 && (
            <section className="space-y-2" aria-label={t('scr.weekNow')}>
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
                {t('scr.weekNow')}
                <Badge variant="secondary" className="num">{locale === 'fa' ? `هفته ${new Intl.NumberFormat('fa-IR').format(week)}` : `Week ${week}`}</Badge>
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {inWindow.map((item) => <ScreeningCard key={item.slug} item={item} locale={locale} highlight />)}
              </Accordion>
            </section>
          )}

          <section className="space-y-2" aria-label={t('scr.kindAll')}>
            {week != null && inWindow.length > 0 && <h2 className="text-sm font-bold text-muted-foreground">{t('scr.kindAll')}</h2>}
            <Accordion type="single" collapsible className="space-y-2">
              {rest.map((item) => <ScreeningCard key={item.slug} item={item} locale={locale} />)}
            </Accordion>
          </section>
        </>
      )}
    </div>
  );
}

function ScreeningCard({ item, locale, highlight }: { item: ScreeningItem; locale: Locale; highlight?: boolean }) {
  const { t } = useApp();
  const fa = locale === 'fa';
  const Icon = KIND_ICON[item.kind] ?? Microscope;
  const indicationKey = item.indication === 'ROUTINE' ? 'scr.routine' : item.indication === 'CONDITIONAL' ? 'scr.conditional' : 'scr.clinician';
  const indicationVariant = item.indication === 'ROUTINE' ? 'default' : item.indication === 'CONDITIONAL' ? 'secondary' : 'outline';
  const window = fmtWeeks(item.weeksFrom, item.weeksTo, locale);

  return (
    <AccordionItem value={item.slug} className={`border rounded-2xl niva-card px-4 ${highlight ? 'border-primary/50 bg-primary/5' : ''}`}>
      <AccordionTrigger className="hover:no-underline py-3.5">
        <span className="flex items-center gap-2.5 text-start min-w-0 flex-1">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary shrink-0">
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-snug">{fa ? item.nameFa : item.nameEn}</span>
            {window && <span className="block text-[11px] text-muted-foreground num">{window}</span>}
          </span>
        </span>
        {item.inWindow && (
          <Badge className="shrink-0 ms-2 bg-primary/15 text-primary border-0" variant="outline">{t('scr.weekNow')}</Badge>
        )}
      </AccordionTrigger>
      <AccordionContent className="text-sm leading-relaxed space-y-3 pb-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="gap-1"><Icon className="h-3 w-3" aria-hidden />{t(`scr.kind.${item.kind}`)}</Badge>
          <Badge variant={indicationVariant as 'default' | 'secondary' | 'outline'}>{t(indicationKey)}</Badge>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground mb-1">{t('scr.purpose')}</p>
          <p>{fa ? item.purposeFa : item.purposeEn}</p>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground mb-1">{t('scr.method')}</p>
          <p>{fa ? item.methodFa : item.methodEn}</p>
        </div>

        <div className="rounded-xl bg-warning/5 border border-warning/30 p-2.5">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5"><CircleAlert className="h-3.5 w-3.5" aria-hidden />{t('scr.limitations')}</p>
          <p className="text-xs leading-relaxed">{fa ? item.limitationsFa : item.limitationsEn}</p>
        </div>

        {(fa ? item.preparationFa : item.preparationEn) && (
          <div className="text-xs">
            <p className="font-bold mb-0.5">{t('scr.preparation')}</p>
            <p className="text-muted-foreground leading-relaxed">{fa ? item.preparationFa : item.preparationEn}</p>
          </div>
        )}

        {(fa ? item.clinicianMayOrderFa : item.clinicianMayOrderEn) && (
          <div className="text-xs">
            <p className="font-bold mb-0.5 flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" aria-hidden />{t('scr.clinicianMayOrder')}</p>
            <p className="text-muted-foreground leading-relaxed">{fa ? item.clinicianMayOrderFa : item.clinicianMayOrderEn}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
          <p className="text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 inline text-secondary" aria-hidden /> {item.medicalReference}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {t('scr.reviewedAt')}: <span dir="auto">{new Intl.DateTimeFormat(fa ? 'fa-IR-u-ca-persian' : 'en-US', { dateStyle: 'medium' }).format(new Date(item.reviewedAt))}</span>
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
