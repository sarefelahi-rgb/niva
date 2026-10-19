'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Salad, ShieldCheck, CircleAlert } from 'lucide-react';
import { WEEKLY_CONTENT } from '@/data/weekly-content';
import { gestationalAgeAt } from '@/lib/gestational';
import { ProvenanceBadge } from '@/components/content/provenance-badge';

interface ContentItem { id: string; slug: string; category: string; titleEn: string; titleFa: string; bodyEn: string; bodyFa: string; sources: string; status: string; evidenceGrade?: string; reviewedAt?: string | null }

export function NutritionView() {
  const { t, locale, pregnancy } = useApp();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const ga = pregnancy?.dueDate ? gestationalAgeAt({ dueDate: new Date(pregnancy.dueDate) }) : null;
  const week = ga ? Math.min(Math.max(ga.weeks, 4), 40) : null;
  const weekContent = week ? WEEKLY_CONTENT.find((w) => w.week === week) : null;

  useEffect(() => {
    fetch('/api/content?category=NUTRITION').then(async (r) => {
      const data = await r.json();
      // Nutrition category KB entries are stored under their own category; fall back to all non-weekly.
      const list = (data.contents ?? []) as ContentItem[];
      setItems(list.length > 0 ? list : await fetch('/api/content').then((r2) => r2.json()).then((d2) => (d2.contents ?? []).filter((c: ContentItem) => c.category !== 'WEEKLY')));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const title = (c: ContentItem) => (locale === 'fa' ? c.titleFa : c.titleEn);
  const body = (c: ContentItem) => (locale === 'fa' ? c.bodyFa : c.bodyEn);
  const sources = (c: ContentItem): Array<{ citation: string; url?: string }> => {
    try { return JSON.parse(c.sources) as Array<{ citation: string; url?: string }>; } catch { return []; }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Salad className="h-6 w-6 text-primary" />{t('nutri.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('nutri.sub')}</p>
      </header>

      {weekContent && (
        <Card className="niva-card niva-grad">
          <CardContent className="p-5">
            <Badge variant="secondary" className="mb-2 num">{locale === 'fa' ? `هفته ${week}` : `Week ${week}`}</Badge>
            <p className="text-sm leading-relaxed">{locale === 'fa' ? weekContent.maternalTipsFa : weekContent.maternalTipsEn}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="niva-card border-secondary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-secondary-foreground"><ShieldCheck className="h-4 w-4" />{t('nutri.favor')}</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <ul className="space-y-1.5">
              {(locale === 'fa'
                ? ['سبزیجات برگ‌سبز و حبوبات (فولات و آهن)', 'لبنیات کم‌چرب برای کلسیم و ویتامین D', 'ماهی کم‌جیوه مثل سالمون، دوبار در هفته', 'میوه‌های متنوع و غلات کامل', 'نوشیدن آب کافی در طول روز']
                : ['Leafy greens and legumes (folate and iron)', 'Low-fat dairy for calcium and vitamin D', 'Low-mercury fish such as salmon, twice a week', 'A variety of fruits and whole grains', 'Plenty of water throughout the day']
              ).map((x, i) => <li key={i} className="flex gap-2"><span className="text-secondary mt-0.5">•</span>{x}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="niva-card border-destructive/25">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-destructive"><CircleAlert className="h-4 w-4" />{t('nutri.avoid')}</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <ul className="space-y-1.5">
              {(locale === 'fa'
                ? ['الکل و دخانیات — هیچ مقدار بی‌خطر نیست', 'کافئین بیش از ۲۰۰ میلی‌گرم در روز', 'گوشت خام، ماهی خام و تخم‌مرغ خام', 'پنیرهای غیرپاستوریزه و لبنیات خام', 'ماهی‌های پرجیوه مثل کوسه و شمشیرماهی']
                : ['Alcohol and tobacco — no safe amount', 'More than 200 mg caffeine per day', 'Raw meat, raw fish, and raw eggs', 'Unpasteurized cheeses and raw dairy', 'High-mercury fish such as shark and swordfish']
              ).map((x, i) => <li key={i} className="flex gap-2"><span className="text-destructive mt-0.5">•</span>{x}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      <section aria-label="education">
        <h2 className="font-semibold mb-2">{t('nutri.basics')}</h2>
        {loading ? <Skeleton className="h-40 w-full" /> : (
          <Accordion type="single" collapsible className="space-y-2">
            {items.map((c) => (
              <AccordionItem key={c.id} value={c.id} className="border rounded-xl niva-card px-4">
                <AccordionTrigger className="hover:no-underline py-3.5">
                  <span className="flex items-center gap-2 text-start">
                    <span className="text-sm font-medium">{title(c)}</span>
                    <ProvenanceBadge status={c.status} evidenceGrade={c.evidenceGrade} compact />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed space-y-2 pb-4">
                  <ProvenanceBadge status={c.status} evidenceGrade={c.evidenceGrade} reviewedAt={c.reviewedAt} />
                  <p>{body(c)}</p>
                  <p className="text-xs text-muted-foreground">
                    {sources(c).map((s, i) => <span key={i} className="block">{s.citation}</span>)}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>
    </div>
  );
}
