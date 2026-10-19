'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { WEEKLY_CONTENT } from '@/data/weekly-content';
import { gestationalAgeAt } from '@/lib/gestational';
import { Sparkles, Star } from 'lucide-react';

export function TimelineView() {
  const { t, pregnancy, locale, setView } = useApp();
  const ga = pregnancy?.dueDate ? gestationalAgeAt({ dueDate: new Date(pregnancy.dueDate) }) : null;
  const currentWeek = ga ? Math.min(Math.max(ga.weeks, 4), 40) : 4;
  const [active, setActive] = useState(currentWeek);

  const weeks = useMemo(() => WEEKLY_CONTENT, []);
  const activeContent = weeks.find((w) => w.week === active);

  return (
    <div className="space-y-5">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold">{t('timeline.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('timeline.sub')}</p>
      </header>

      {/* Week rail */}
      <ScrollArea className="w-full whitespace-nowrap rounded-xl">
        <div className="flex gap-2 pb-3">
          {weeks.map((w) => (
            <button
              key={w.week}
              onClick={() => setActive(w.week)}
              aria-current={active === w.week ? 'true' : undefined}
              className={`shrink-0 h-14 min-w-14 rounded-xl border px-3 flex flex-col items-center justify-center transition-all min-h-11 ${
                active === w.week
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                  : w.week === currentWeek
                    ? 'border-primary/60 bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-muted'
              }`}
            >
              <span className="text-xs opacity-70">{t('common.week')}</span>
              <span className="text-lg font-bold num leading-none">{w.week}</span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Active week card */}
      {activeContent && (
        <Card className="niva-card niva-grad overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{locale === 'fa' ? `هفته ${activeContent.week}` : `Week ${activeContent.week}`}</h2>
              {activeContent.milestone && <Badge className="gap-1"><Star className="h-3 w-3" />{t('timeline.milestone')}</Badge>}
              {ga && activeContent.week === currentWeek && <Badge variant="secondary">{locale === 'fa' ? 'هفته شما' : 'Your current week'}</Badge>}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Stat label={t('dash.babySize')} value={(locale === 'fa' ? activeContent.sizeComparisonFa : activeContent.sizeComparisonEn).replace(/^حدود به اندازه‌ی\s*/, '').replace(/^About the size of\s*/i, '')} />
              {activeContent.lengthCm != null && <Stat label={t('timeline.length')} value={<span className="num">≈ {activeContent.lengthCm} cm</span>} />}
              {activeContent.weightG != null && <Stat label={t('timeline.weight')} value={<span className="num">≈ {activeContent.weightG} g</span>} />}
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm sm:text-base leading-relaxed">{locale === 'fa' ? activeContent.highlightsFa : activeContent.highlightsEn}</p>
              <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4">
                <p className="text-sm leading-relaxed">{locale === 'fa' ? activeContent.maternalTipsFa : activeContent.maternalTipsEn}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setView('studio')} className="min-h-11">
                <Sparkles className="h-4 w-4 me-1.5" />
                {locale === 'fa' ? 'مشاهده در استودیو سه‌بعدی' : 'See it in the 3D studio'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All weeks accordion */}
      <Accordion type="single" collapsible className="space-y-2">
        {weeks.map((w) => (
          <AccordionItem key={w.week} value={`w${w.week}`} className="border rounded-xl niva-card px-4">
            <AccordionTrigger className="hover:no-underline py-3.5">
              <span className="flex items-center gap-2.5 text-start">
                <span className="font-bold num w-8">{w.week}</span>
                <span className="text-sm">{locale === 'fa' ? w.sizeComparisonFa : w.sizeComparisonEn}</span>
                {w.milestone && <Star className="h-3.5 w-3.5 text-primary shrink-0" />}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed space-y-2 pb-4">
              <p>{locale === 'fa' ? w.highlightsFa : w.highlightsEn}</p>
              <p className="text-muted-foreground">{locale === 'fa' ? w.maternalTipsFa : w.maternalTipsEn}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card/60 p-3.5">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}
