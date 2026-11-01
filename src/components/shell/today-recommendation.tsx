'use client';

/**
 * Wave 17 — «توصیه امروز نیوا» dashboard card (feature 1).
 * One card, top of every journey's dashboard: day-stable selection (server
 * side), Jalali date, category icon, 30–70-word summary, «بیشتر بدانید» opens
 * the reviewed full content with its source and review date. Entry animation
 * is subtle and disabled under prefers-reduced-motion (global CSS rule).
 */

import { useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  HeartPulse, Salad, CalendarHeart, ShieldCheck, Brain, Sparkles, Baby,
  Flower2, ExternalLink, Quote, Loader2, Leaf,
} from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n';

interface RecPayload {
  recommendation: {
    slug: string;
    title: string; titleEn: string;
    summary: string; summaryEn: string;
    fullContent: string; fullContentEn: string;
    category: string;
    medicalSource: string;
    sourceUrl: string | null;
    medicallyReviewedAt: string | null;
  } | null;
  day: string;
  stage: string;
  week: number | null;
  childAgeDays: number | null;
}

const CATEGORY_ICON: Record<string, typeof Salad> = {
  NUTRITION: Salad,
  MEDICAL: HeartPulse,
  LIFESTYLE: Leaf,
  MENTAL_HEALTH: Brain,
  SAFETY: ShieldCheck,
  GROWTH: Baby,
  CYCLE: CalendarHeart,
  FEEDING: Baby,
  PREP: Flower2,
};

export function TodayRecommendationCard() {
  const { t, locale } = useApp();
  const [data, setData] = useState<RecPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const tz = (() => {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; }
    })();
    const url = tz ? `/api/recommendation?tz=${encodeURIComponent(tz)}` : '/api/recommendation';
    fetch(url, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: RecPayload) => setData(d))
      .catch(() => setFailed(true));
  }, []);

  const rec = data?.recommendation ?? null;
  const fa = locale === 'fa';
  const title = rec ? (fa ? rec.title : rec.titleEn) : '';
  const summary = rec ? (fa ? rec.summary : rec.summaryEn) : '';
  const full = rec ? (fa ? rec.fullContent : rec.fullContentEn) : '';
  const Icon = rec ? (CATEGORY_ICON[rec.category] ?? Sparkles) : Sparkles;

  // Context chip: which personal signal picked this tip (or the honest fallback).
  const contextLabel = rec
    ? data?.stage === 'PREGNANT' && data?.week != null
      ? t('rec.week')
      : data?.stage === 'POSTPARTUM' && data?.childAgeDays != null
        ? t('rec.childAge')
        : data?.stage === 'TRYING'
          ? t('rec.trying')
          : t('rec.general')
    : '';

  return (
    <Card className="niva-card border-primary/30 bg-primary/5 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid place-items-center h-11 w-11 rounded-2xl bg-primary/15 text-primary shrink-0" aria-hidden>
            <Icon className="h-5.5 w-5.5 h-[22px] w-[22px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-base sm:text-lg font-bold">{t('rec.title')}</h2>
              <Badge variant="secondary" className="text-[10px]">{t('rec.date')} · <span dir="auto">{formatDate(new Date(), locale as Locale)}</span></Badge>
            </div>

            {failed ? (
              <p className="text-sm text-muted-foreground mt-2">{t('common.error')}</p>
            ) : !rec ? (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>{t('common.loading')}</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mt-1">{contextLabel}</p>
                <p className="text-sm sm:text-[15px] leading-relaxed mt-2.5 flex gap-1.5">
                  <Quote className="h-3.5 w-3.5 text-primary/50 shrink-0 mt-1 rotate-180" aria-hidden />
                  <span>{summary}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3.5">
                  <Button onClick={() => setOpen(true)} size="sm" className="min-h-11 px-4">
                    {t('rec.more')}
                  </Button>
                  {rec.medicallyReviewedAt && (
                    <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-secondary" aria-hidden />
                      {t('rec.reviewed')}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-start leading-snug">
              <Icon className="h-5 w-5 text-primary shrink-0" aria-hidden />
              {title}
            </DialogTitle>
            <DialogDescription className="text-start">
              {t('rec.title')} · <span dir="auto">{data ? formatDate(new Date(`${data.day}T12:00:00`), locale as Locale) : ''}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {full.split('\n\n').map((p, i) => (
              <p key={i} className="text-sm leading-relaxed">{p}</p>
            ))}
            {rec?.medicalSource && (
              <div className="rounded-xl border bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-secondary" aria-hidden />
                  {t('rec.source')}
                </p>
                <p className="text-xs text-muted-foreground">{rec.medicalSource}</p>
                {rec.sourceUrl && (
                  <a
                    href={rec.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary underline inline-flex items-center gap-1"
                  >
                    {rec.sourceUrl.replace(/^https?:\/\//, '').slice(0, 60)}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
                {rec.medicallyReviewedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    {t('rec.reviewed')} · <span dir="auto">{formatDate(new Date(rec.medicallyReviewedAt), locale as Locale)}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
