'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Baby, Timer, Trash2, TriangleAlert } from 'lucide-react';

/** Stable persistence slugs — never rename, they key BirthPlanItem rows. */
const PLAN_KEYS = ['support-person', 'pain-options', 'intervention-preferences', 'feeding-approach', 'episiotomy-tearing', 'newborn-screening'];
const BAG_KEYS = ['documents-medical-file', 'clothes-socks', 'charger-powerbank', 'baby-clothes-blanket', 'car-seat', 'hygiene-items'];

interface ContractionEntry {
  id: string;
  startedAt: string;
  durationSec: number;
  intensity: number | null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function fmtClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${pad2(m)}:${pad2(s)}`;
}

/** 5-1-1 pattern over the last 2h of entries (client-computed, per spec). */
function is511Pattern(entries: ContractionEntry[]): boolean {
  const recent = entries
    .map((e) => ({ ...e, ts: new Date(e.startedAt).getTime() }))
    .filter((e) => !Number.isNaN(e.ts) && e.ts >= Date.now() - 2 * 3_600_000)
    .sort((a, b) => a.ts - b.ts);
  if (recent.length < 3) return false;
  const windowSec = (recent[recent.length - 1].ts - recent[0].ts) / 1000;
  if (windowSec < 55 * 60) return false;
  const gaps: number[] = [];
  for (let i = 1; i < recent.length; i++) gaps.push((recent[i].ts - recent[i - 1].ts) / 1000);
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const avgDur = recent.reduce((a, b) => a + b.durationSec, 0) / recent.length;
  return avgGap <= 330 && avgDur >= 55;
}

export function BirthPrepView() {
  const { t, locale, setView } = useApp();
  const { toast } = useToast();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const savedToastShown = useRef(false);

  // Contraction timer state
  const [contractions, setContractions] = useState<ContractionEntry[]>([]);
  const [loadingContractions, setLoadingContractions] = useState(true);
  const [running, setRunning] = useState(false);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [intensity, setIntensity] = useState(3);
  const [savingContraction, setSavingContraction] = useState(false);

  const loadContractions = useCallback(async () => {
    try {
      const res = await fetch('/api/contractions', { cache: 'no-store' });
      const data = await res.json();
      setContractions(Array.isArray(data?.entries) ? data.entries : []);
    } catch {
      toast({ description: t('err.validation'), variant: 'destructive' });
    } finally {
      setLoadingContractions(false);
    }
  }, [t, toast]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/birth-prep', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && Array.isArray(data?.items)) {
          const map: Record<string, boolean> = {};
          for (const item of data.items) {
            if (item?.category && item?.itemKey) map[`${item.category}:${item.itemKey}`] = Boolean(item.done);
          }
          // User toggles made before hydration win over the server snapshot.
          setChecked((prev) => ({ ...map, ...prev }));
        }
      } catch {
        /* checklist still usable locally; save attempts will surface errors */
      }
    })();
    loadContractions();
  }, [loadContractions]);

  // 1s ticker only while the timer runs; cleared on stop/unmount (no leaks).
  useEffect(() => {
    if (!running || startTs === null) return;
    setElapsedSec(Math.floor((Date.now() - startTs) / 1000));
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTs) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, startTs]);

  const persistToggle = async (category: 'BIRTH_PLAN' | 'HOSPITAL_BAG', itemKey: string, done: boolean) => {
    try {
      const res = await fetch('/api/birth-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, itemKey, done }),
      });
      if (!res.ok) throw new Error('save failed');
      if (!savedToastShown.current) {
        savedToastShown.current = true;
        toast({ description: t('birth.savedNote') });
      }
    } catch {
      // Roll the optimistic toggle back so UI matches the server.
      setChecked((prev) => ({ ...prev, [`${category}:${itemKey}`]: !done }));
      toast({ description: t('err.validation'), variant: 'destructive' });
    }
  };

  const toggle = (category: 'BIRTH_PLAN' | 'HOSPITAL_BAG', itemKey: string) => {
    const next = !checked[`${category}:${itemKey}`];
    setChecked((prev) => ({ ...prev, [`${category}:${itemKey}`]: next })); // optimistic
    persistToggle(category, itemKey, next);
  };

  const startTimer = () => {
    const now = Date.now();
    setStartTs(now);
    setElapsedSec(0);
    setRunning(true);
  };

  const stopTimer = async () => {
    if (startTs === null) return;
    const durationSec = Math.max(5, Math.round((Date.now() - startTs) / 1000));
    setRunning(false);
    setSavingContraction(true);
    try {
      const res = await fetch('/api/contractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startedAt: new Date(startTs).toISOString(), durationSec, intensity }),
      });
      if (!res.ok) throw new Error('save failed');
      setStartTs(null);
      setElapsedSec(0);
      await loadContractions();
      toast({ description: t('wellness.saved') });
    } catch {
      toast({ description: t('err.validation'), variant: 'destructive' });
    } finally {
      setSavingContraction(false);
    }
  };

  const removeContraction = async (id: string) => {
    const snapshot = contractions;
    setContractions((prev) => prev.filter((c) => c.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/contractions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
    } catch {
      setContractions(snapshot);
      toast({ description: t('err.validation'), variant: 'destructive' });
    }
  };

  const planItems = locale === 'fa'
    ? ['همراه حضور در زایمان را مشخص کنم', 'روش مدیریت درد را با تیم مراقبت بررسی کنم', 'نظر خودم درباره مداخلات را یادداشت کنم', 'نوع تغذیه نوزاد را تصمیم بگیرم', 'درباره برش و بازشده (اگر لازم شد) سؤال کنم', 'نقص اصلاح نشده‌ای درباره اسکرین‌شناسی نوزاد دارم؟ از پزشک بپرسم']
    : ['Decide who will be present at the birth', 'Discuss pain management options with my care team', 'Write down my preferences about interventions', 'Decide on newborn feeding approach', 'Ask about episiotomy/tearing care if needed', 'Ask my clinician about newborn screening'];

  const bagItems = locale === 'fa'
    ? ['مدارک شناسایی و پرونده پزشکی', 'لباس راحت برای مادر و جوراب', 'شارژر موبایل و پاوربانک', 'لباس نوزاد و پتو', 'صندلی ایمنی خودرو برای بازگشت', 'لوازم بهداشتی شخصی']
    : ['ID documents and medical file', 'Comfortable clothes and socks for the mother', 'Phone charger and power bank', 'Baby clothes and blanket', 'Car seat for the ride home', 'Personal hygiene items'];

  const laborSigns = locale === 'fa'
    ? [
      'انقباضات منظم که قوی‌تر و نزدیک‌تر می‌شوند',
      'پاره شدن کیسه آب (نشت یا جریان مایع)',
      'خروج سد مهری (ترشح مخاطی خونی)',
      'کاهش شدید یا غیرعادی حرکت جنین — فوراً تماس بگیرید',
    ]
    : [
      'Regular contractions that get stronger and closer together',
      'Water breaking (leaking or gushing fluid)',
      'Bloody show (mucus plug loss)',
      'Significantly or unusually decreased fetal movement — call immediately',
    ];

  const planDone = PLAN_KEYS.filter((k) => checked[`BIRTH_PLAN:${k}`]).length;
  const bagDone = BAG_KEYS.filter((k) => checked[`HOSPITAL_BAG:${k}`]).length;
  const patternOn = is511Pattern(contractions);

  const checklistRow = (category: 'BIRTH_PLAN' | 'HOSPITAL_BAG', itemKey: string, text: string) => (
    <Label key={itemKey} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 min-h-11">
      <Checkbox
        checked={Boolean(checked[`${category}:${itemKey}`])}
        onCheckedChange={() => toggle(category, itemKey)}
        className="mt-0.5"
        aria-label={text}
      />
      <span className="text-sm leading-relaxed">{text}</span>
    </Label>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Baby className="h-6 w-6 text-primary" />{t('birth.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('birth.sub')}</p>
      </header>

      <Accordion type="multiple" defaultValue={['plan', 'bag', 'signs']} className="space-y-3">
        <AccordionItem value="plan" className="border rounded-xl niva-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">{t('birth.plan')}</span>
            <span className="text-xs text-muted-foreground num ms-2">{t('birth.progress')} {planDone}/{PLAN_KEYS.length}</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2.5 pb-4">
            {planItems.map((p, i) => checklistRow('BIRTH_PLAN', PLAN_KEYS[i], p))}
            <p className="text-xs text-muted-foreground leading-relaxed">{t('birth.planNote')}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="bag" className="border rounded-xl niva-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">{t('birth.bag')}</span>
            <span className="text-xs text-muted-foreground num ms-2">{t('birth.progress')} {bagDone}/{BAG_KEYS.length}</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2.5 pb-4">
            {bagItems.map((b, i) => checklistRow('HOSPITAL_BAG', BAG_KEYS[i], b))}
            <p className="text-xs text-muted-foreground leading-relaxed">{t('birth.planNote')}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="signs" className="border rounded-xl niva-card px-4">
          <AccordionTrigger className="hover:no-underline"><span className="font-semibold">{t('birth.signs')}</span></AccordionTrigger>
          <AccordionContent className="pb-4">
            <ul className="space-y-2">
              {laborSigns.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                  <span className="grid place-items-center shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold num">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              {locale === 'fa'
                ? 'این فهرست آموزشی است. در صورت تردید، همیشه با ماما یا پزشک خود تماس بگیرید.'
                : 'This list is educational. If in doubt, always call your midwife or physician.'}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Contraction timer */}
      <Card className="niva-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Timer className="h-4 w-4 text-primary" />{t('birth.timer')}</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">{t('birth.timerSub')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {running ? (
            <div className="space-y-4">
              <p className="text-center text-4xl font-bold num tabular-nums" aria-live="polite">{fmtClock(elapsedSec)}</p>
              <div>
                <div className="flex justify-between mb-1.5">
                  <Label htmlFor="contraction-intensity">{t('birth.intensity')}</Label>
                  <span className="text-sm font-semibold num">{intensity}/5</span>
                </div>
                <Slider
                  id="contraction-intensity"
                  value={[intensity]}
                  onValueChange={(v) => setIntensity(v[0] ?? 3)}
                  min={1}
                  max={5}
                  step={1}
                  aria-label={t('birth.intensity')}
                />
              </div>
              <Button variant="destructive" size="lg" onClick={stopTimer} disabled={savingContraction} className="w-full min-h-12 text-base">
                {t('birth.stop')}
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={startTimer} disabled={savingContraction} className="w-full min-h-12 text-base">
              <Timer className="h-5 w-5" />
              {t('birth.start')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Recent contractions */}
      <Card className="niva-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">{t('birth.recent')}</CardTitle></CardHeader>
        <CardContent>
          {loadingContractions ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : contractions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('birth.noContractions')}</p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {contractions.map((c, idx) => {
                const prev = contractions[idx - 1]; // later entry in desc order
                const gapSec = prev ? Math.round((new Date(prev.startedAt).getTime() - new Date(c.startedAt).getTime()) / 1000) : null;
                return (
                  <li key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium num">{new Date(c.startedAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{t('birth.duration')} <span className="num">{fmtClock(c.durationSec)}</span></span>
                        <span>{t('birth.gap')} <span className="num">{gapSec !== null && Number.isFinite(gapSec) && gapSec >= 0 ? fmtClock(gapSec) : '—'}</span></span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 shrink-0" aria-label={`${t('birth.intensity')} ${c.intensity ?? '—'}/5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={`h-2 w-2 rounded-full ${c.intensity && n <= c.intensity ? 'bg-primary' : 'bg-muted'}`} />
                      ))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeContraction(c.id)}
                      aria-label={t('notifs.delete')}
                      className="shrink-0 text-muted-foreground hover:text-destructive min-h-11 min-w-11"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 5-1-1 pattern banner */}
      <Card className={patternOn ? 'border-amber-500/40 bg-amber-500/5' : 'niva-card'} role="status">
        <CardContent className="p-4 flex gap-3">
          <Timer className={`h-4 w-4 mt-0.5 shrink-0 ${patternOn ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
          <div className="space-y-1">
            <p className={`text-sm font-semibold ${patternOn ? 'text-amber-600 dark:text-amber-400' : ''}`}>{t('birth.patternTitle')}</p>
            <p className={`text-sm leading-relaxed ${patternOn ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
              {t(patternOn ? 'birth.patternOn' : 'birth.patternOff')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Always-on safety callout */}
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <TriangleAlert className="h-4 w-4 text-destructive shrink-0" aria-hidden />
          <p className="text-sm leading-relaxed flex-1">{t('birth.callout')}</p>
          <Button variant="outline" onClick={() => setView('safety')} className="min-h-11 shrink-0">{t('nav.safety')}</Button>
        </CardContent>
      </Card>

      <Card className="niva-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">{t('birth.education')}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            {locale === 'fa'
              ? 'کلاس‌های آمادگی زایمان به کاهش اضطراب و بهبود تجربه زایمان کمک می‌کنند. درباره گزینه‌های مدیریت درد (تنفسی، حرکتی، دارویی و بی‌حسی اپیدورال) پیش از زایمان با تیم مراقبت گفتگو کنید.'
              : 'Childbirth education classes reduce anxiety and improve birth experience. Discuss pain management options (breathing, movement, medication, epidural) with your care team before labor.'}
          </p>
          <Badge variant="outline" className="text-[10px]">{t('status.IN_REVIEW')}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
