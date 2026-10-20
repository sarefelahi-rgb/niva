'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import type { Locale } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { ProvenanceBadge } from '@/components/content/provenance-badge';
import {
  Salad, Apple, Carrot, Beef, Milk, Wheat, Droplets, Footprints, MoonStar, Smile,
  Zap, CloudRain, CheckCircle2, TriangleAlert, Minus, Plus, HeartHandshake,
} from 'lucide-react';

/* ─── DTOs ─────────────────────────────────────────────────────────────────── */

interface NutritionEntryDTO { id: string; date: string; waterMl: number; fruits: number; vegetables: number; protein: number; dairy: number; grains: number; notes: string | null }
interface ExerciseEntryDTO { id: string; date: string; type: string; minutes: number; intensity: string; notes: string | null }
interface SleepEntryDTO { id: string; date: string; hours: number; quality: number; interruptions: number; notes: string | null }
interface MoodEntryDTO { id: string; date: string; mood: number; energy: number; anxiety: number; tags: string; notes: string | null }
interface ContentItem { id: string; slug: string; category: string; titleEn: string; titleFa: string; bodyEn: string; bodyFa: string; sources: string; status: string; evidenceGrade?: string; reviewedAt?: string | null }

type NutriData = { entries: NutritionEntryDTO[]; today: NutritionEntryDTO | null };
type ExerciseData = { entries: ExerciseEntryDTO[]; weeklyMinutes: number; sessionsWeek: number };
type SleepData = { entries: SleepEntryDTO[]; today: SleepEntryDTO | null };
type MoodData = { entries: MoodEntryDTO[]; today: MoodEntryDTO | null };

const CATEGORIES = ['NUTRITION', 'EXERCISE', 'SLEEP', 'MOOD'] as const;
type ContentCat = (typeof CATEGORIES)[number];
type ContentMap = Record<ContentCat, ContentItem[]>;
const EMPTY_CONTENT: ContentMap = { NUTRITION: [], EXERCISE: [], SLEEP: [], MOOD: [] };

const todayKey = () => new Date().toISOString().slice(0, 10);
const fmtDay = (iso: string, locale: Locale) => new Date(iso).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US');
const clampInt = (v: number, lo: number, hi: number) => Math.min(Math.max(Math.trunc(v), lo), hi);
const halfHourStep = (h: number) => Math.abs(h * 10 - Math.round(h * 10)) < 1e-9;

/* ─── Shared field helpers (tracking-view slider convention) ───────────────── */

function SliderField({ label, value, onChange, min = 1, max = 5 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <Label>{label}</Label>
        <span className="text-sm font-semibold num">{value}/{max}</span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={1} aria-label={label} />
    </div>
  );
}

function HistoryCard({ title, rows }: { title: string; rows: React.ReactNode[] | null }) {
  return (
    <Card className="niva-card">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows && rows.length > 0
          ? <div className="max-h-96 overflow-y-auto pe-1">{rows}</div>
          : <p className="text-sm text-muted-foreground">—</p>}
      </CardContent>
    </Card>
  );
}

function TodayBadge({ logged }: { logged: boolean | null }) {
  const { t } = useApp();
  if (logged === null) return null;
  return logged
    ? <Badge variant="secondary" className="ms-auto gap-1"><CheckCircle2 className="h-3 w-3" aria-hidden />{t('wellness.todayDone')}</Badge>
    : <span className="ms-auto text-xs font-normal text-muted-foreground">{t('wellness.todayEmpty')}</span>;
}

/* ─── Reviewed guidance (ProvenanceBadge contract, mirrors nutrition-view) ─── */

function GuidanceSection({ items }: { items: ContentItem[] }) {
  const { t, locale } = useApp();
  if (items.length === 0) return null;
  const title = (c: ContentItem) => (locale === 'fa' ? c.titleFa : c.titleEn);
  const body = (c: ContentItem) => (locale === 'fa' ? c.bodyFa : c.bodyEn);
  const sources = (c: ContentItem): Array<{ citation: string; url?: string }> => {
    try { return JSON.parse(c.sources) as Array<{ citation: string; url?: string }>; } catch { return []; }
  };
  return (
    <section aria-label="education">
      <h2 className="font-semibold mb-2">{t('wellness.guidance')}</h2>
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
    </section>
  );
}

/* ─── Nutrition tab ────────────────────────────────────────────────────────── */

const SERVINGS = [
  { key: 'fruits', icon: Apple },
  { key: 'vegetables', icon: Carrot },
  { key: 'protein', icon: Beef },
  { key: 'dairy', icon: Milk },
  { key: 'grains', icon: Wheat },
] as const;
type ServingKey = (typeof SERVINGS)[number]['key'];

function NutritionTab({ data, reload, items }: { data: NutriData | null; reload: () => Promise<unknown>; items: ContentItem[] }) {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [water, setWater] = useState('0');
  const [servings, setServings] = useState<Record<ServingKey, number>>({ fruits: 0, vegetables: 0, protein: 0, dairy: 0, grains: 0 });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data?.today) return;
    const e = data.today;
    setWater(String(e.waterMl));
    setServings({ fruits: e.fruits, vegetables: e.vegetables, protein: e.protein, dairy: e.dairy, grains: e.grains });
    setNotes(e.notes ?? '');
  }, [data]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/wellness/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayKey(),
          waterMl: clampInt(Number(water) || 0, 0, 10_000),
          ...servings,
          notes: notes.trim() || undefined,
        }),
      });
      if (res.ok) { toast({ description: t('wellness.saved') }); await reload(); }
      else toast({ description: res.status === 429 ? t('err.rateLimit') : t('err.validation'), variant: 'destructive' });
    } catch {
      toast({ description: t('common.error'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.entries.map((e) => (
    <div key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
      <span className="text-xs text-muted-foreground num w-24 shrink-0">{fmtDay(e.date, locale)}</span>
      <Droplets className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
      <span className="num font-medium">{e.waterMl}</span>
      <span className="text-xs text-muted-foreground">ml</span>
      <span className="ms-auto flex items-center gap-2 text-xs num">
        <span className="flex items-center gap-0.5" title={t('wellness.fruits')}><Apple className="h-3 w-3" aria-hidden />{e.fruits}</span>
        <span className="flex items-center gap-0.5" title={t('wellness.vegetables')}><Carrot className="h-3 w-3" aria-hidden />{e.vegetables}</span>
        <span className="flex items-center gap-0.5" title={t('wellness.protein')}><Beef className="h-3 w-3" aria-hidden />{e.protein}</span>
        <span className="flex items-center gap-0.5" title={t('wellness.dairy')}><Milk className="h-3 w-3" aria-hidden />{e.dairy}</span>
        <span className="flex items-center gap-0.5" title={t('wellness.grains')}><Wheat className="h-3 w-3" aria-hidden />{e.grains}</span>
      </span>
    </div>
  )) ?? null;

  return (
    <>
      <Card className="niva-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Droplets className="h-4 w-4 text-primary" aria-hidden />{t('wellness.tabNutrition')}
            <TodayBadge logged={data ? Boolean(data.today) : null} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="w-water">{t('wellness.water')}</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <Input
                id="w-water" type="number" inputMode="numeric" min={0} max={10000} step={50}
                value={water} onChange={(e) => setWater(e.target.value)}
                className="w-28 min-h-11 num" aria-label={t('wellness.water')}
              />
              {[250, 500].map((ml) => (
                <Button key={ml} type="button" variant="outline" className="min-h-11"
                  onClick={() => setWater(String(clampInt((Number(water) || 0) + ml, 0, 10_000)))}>
                  +{ml}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{t('wellness.waterHint')}</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{t('wellness.servings')}</Label>
            <div className="space-y-2 mt-1.5">
              {SERVINGS.map(({ key, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-sm flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />{t(`wellness.${key}`)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-11 w-11" aria-label={`- ${t(`wellness.${key}`)}`}
                      onClick={() => setServings((s) => ({ ...s, [key]: Math.max(0, s[key] - 1) }))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold num" aria-live="polite">{servings[key]}</span>
                    <Button type="button" variant="outline" size="icon" className="h-11 w-11" aria-label={`+ ${t(`wellness.${key}`)}`}
                      onClick={() => setServings((s) => ({ ...s, [key]: Math.min(20, s[key] + 1) }))}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="w-notes">{t('wellness.notes')}</Label>
            <Input id="w-notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="mt-1.5 min-h-11" />
          </div>

          <Button onClick={save} disabled={busy} className="w-full min-h-12">
            <Salad className="h-4 w-4" aria-hidden />{t('wellness.save')}
          </Button>
        </CardContent>
      </Card>

      <HistoryCard title={t('wellness.history')} rows={rows} />
      <GuidanceSection items={items} />
    </>
  );
}

/* ─── Exercise tab ─────────────────────────────────────────────────────────── */

const EX_TYPES = ['WALK', 'SWIM', 'YOGA', 'PILATES', 'STRENGTH', 'STRETCH', 'PELVIC_FLOOR', 'OTHER'] as const;
const EX_LABEL: Record<string, string> = {
  WALK: 'wellness.exWalk', SWIM: 'wellness.exSwim', YOGA: 'wellness.exYoga', PILATES: 'wellness.exPilates',
  STRENGTH: 'wellness.exStrength', STRETCH: 'wellness.exStretch', PELVIC_FLOOR: 'wellness.exPelvic', OTHER: 'wellness.exOther',
};
const INTENSITIES = ['LIGHT', 'MODERATE', 'VIGOROUS'] as const;
const INT_LABEL: Record<string, string> = { LIGHT: 'wellness.intLight', MODERATE: 'wellness.intModerate', VIGOROUS: 'wellness.intVigorous' };

function ExerciseTab({ data, reload, items }: { data: ExerciseData | null; reload: () => Promise<unknown>; items: ContentItem[] }) {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [type, setType] = useState<string>('WALK');
  const [minutes, setMinutes] = useState('30');
  const [intensity, setIntensity] = useState<string>('MODERATE');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const mins = Math.trunc(Number(minutes) || 0);
    if (mins < 5 || mins > 300) {
      toast({ description: t('err.validation'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/wellness/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayKey(), type, minutes: mins, intensity, notes: notes.trim() || undefined }),
      });
      if (res.ok) { toast({ description: t('wellness.saved') }); await reload(); }
      else toast({ description: res.status === 429 ? t('err.rateLimit') : t('err.validation'), variant: 'destructive' });
    } catch {
      toast({ description: t('common.error'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.entries.map((e) => (
    <div key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
      <span className="text-xs text-muted-foreground num w-24 shrink-0">{fmtDay(e.date, locale)}</span>
      <span className="truncate">{t(EX_LABEL[e.type] ?? 'wellness.exOther')}</span>
      <span className="ms-auto flex items-center gap-1.5 shrink-0">
        <span className="num font-medium">{e.minutes}</span>
        <span className="text-xs text-muted-foreground">{t('wellness.minutes')}</span>
        <Badge variant="outline" className="text-[10px]">{t(INT_LABEL[e.intensity] ?? 'wellness.intModerate')}</Badge>
      </span>
    </div>
  )) ?? null;

  return (
    <>
      <Card className="niva-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Footprints className="h-4 w-4 text-primary" aria-hidden />{t('wellness.tabExercise')}
          </CardTitle>
          {data && (
            <p className="text-sm text-muted-foreground">
              <span className="num font-semibold text-foreground">{data.weeklyMinutes}</span> {t('wellness.minutes')}
              {' · '}
              <span className="num font-semibold text-foreground">{data.sessionsWeek}</span> {t('wellness.sessionsWeek')}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('wellness.exerciseType')}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1.5 min-h-11 w-full" aria-label={t('wellness.exerciseType')}><SelectValue /></SelectTrigger>
                <SelectContent>{EX_TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t(EX_LABEL[ty])}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="w-minutes">{t('wellness.minutes')}</Label>
              <Input id="w-minutes" type="number" inputMode="numeric" min={5} max={300} step={5} value={minutes}
                onChange={(e) => setMinutes(e.target.value)} className="mt-1.5 min-h-11 num" aria-label={t('wellness.minutes')} />
            </div>
          </div>
          <div>
            <Label>{t('wellness.intensity')}</Label>
            <Select value={intensity} onValueChange={setIntensity}>
              <SelectTrigger className="mt-1.5 min-h-11 w-full" aria-label={t('wellness.intensity')}><SelectValue /></SelectTrigger>
              <SelectContent>{INTENSITIES.map((i) => <SelectItem key={i} value={i}>{t(INT_LABEL[i])}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {intensity === 'VIGOROUS' && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />{t('wellness.vigorousNote')}
            </p>
          )}
          <div>
            <Label htmlFor="w-ex-notes">{t('wellness.notes')}</Label>
            <Input id="w-ex-notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="mt-1.5 min-h-11" />
          </div>
          <Button onClick={save} disabled={busy} className="w-full min-h-12">{t('wellness.save')}</Button>
          <p className="text-xs text-muted-foreground">{t('wellness.exWarn')}</p>
        </CardContent>
      </Card>

      <HistoryCard title={t('wellness.history')} rows={rows} />
      <GuidanceSection items={items} />
    </>
  );
}

/* ─── Sleep tab ────────────────────────────────────────────────────────────── */

function SleepTab({ data, reload, items }: { data: SleepData | null; reload: () => Promise<unknown>; items: ContentItem[] }) {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [hours, setHours] = useState('8');
  const [quality, setQuality] = useState(3);
  const [interruptions, setInterruptions] = useState('0');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data?.today) return;
    setHours(String(data.today.hours));
    setQuality(data.today.quality);
    setInterruptions(String(data.today.interruptions));
    setNotes(data.today.notes ?? '');
  }, [data]);

  const save = async () => {
    const h = Number(hours);
    if (!Number.isFinite(h) || h < 0 || h > 24 || !halfHourStep(h)) {
      toast({ description: t('err.validation'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/wellness/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayKey(),
          hours: h,
          quality,
          interruptions: clampInt(Number(interruptions) || 0, 0, 20),
          notes: notes.trim() || undefined,
        }),
      });
      if (res.ok) { toast({ description: t('wellness.saved') }); await reload(); }
      else toast({ description: res.status === 429 ? t('err.rateLimit') : t('err.validation'), variant: 'destructive' });
    } catch {
      toast({ description: t('common.error'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const dots = (q: number) => '●'.repeat(q) + '○'.repeat(5 - q);
  const rows = data?.entries.map((e) => (
    <div key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
      <span className="text-xs text-muted-foreground num w-24 shrink-0">{fmtDay(e.date, locale)}</span>
      <span className="num font-medium">{e.hours}</span>
      <span className="text-xs text-muted-foreground">{t('wellness.hours')}</span>
      <span className="ms-auto flex items-center gap-2 shrink-0">
        <span className="text-[11px] tracking-widest text-primary num" aria-label={`${t('wellness.quality')} ${e.quality}/5`}>{dots(e.quality)}</span>
        {e.interruptions > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground num" title={t('wellness.interruptions')}>
            <MoonStar className="h-3 w-3" aria-hidden />{e.interruptions}
          </span>
        )}
      </span>
    </div>
  )) ?? null;

  return (
    <>
      <Card className="niva-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <MoonStar className="h-4 w-4 text-primary" aria-hidden />{t('wellness.tabSleep')}
            <TodayBadge logged={data ? Boolean(data.today) : null} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="w-hours">{t('wellness.hours')}</Label>
              <Input id="w-hours" type="number" inputMode="decimal" min={0} max={24} step={0.5} value={hours}
                onChange={(e) => setHours(e.target.value)} className="mt-1.5 min-h-11 num" aria-label={t('wellness.hours')} />
            </div>
            <div>
              <Label htmlFor="w-interruptions">{t('wellness.interruptions')}</Label>
              <Input id="w-interruptions" type="number" inputMode="numeric" min={0} max={20} step={1} value={interruptions}
                onChange={(e) => setInterruptions(e.target.value)} className="mt-1.5 min-h-11 num" aria-label={t('wellness.interruptions')} />
            </div>
          </div>
          <SliderField label={t('wellness.quality')} value={quality} onChange={setQuality} />
          <div>
            <Label htmlFor="w-sleep-notes">{t('wellness.notes')}</Label>
            <Input id="w-sleep-notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="mt-1.5 min-h-11" />
          </div>
          <Button onClick={save} disabled={busy} className="w-full min-h-12">{t('wellness.save')}</Button>
        </CardContent>
      </Card>

      <HistoryCard title={t('wellness.history')} rows={rows} />
      <GuidanceSection items={items} />
    </>
  );
}

/* ─── Mood tab ─────────────────────────────────────────────────────────────── */

const TAG_LIST = ['TIRED', 'ANXIOUS', 'HOPEFUL', 'CALM', 'OVERWHELMED', 'GRATEFUL', 'SAD', 'ENERGETIC'] as const;
type MoodTag = (typeof TAG_LIST)[number];
const TAG_LABELS: Record<Locale, Record<MoodTag, string>> = {
  fa: { TIRED: 'خسته', ANXIOUS: 'مضطرب', HOPEFUL: 'امیدوار', CALM: 'آرام', OVERWHELMED: 'غرق‌شده', GRATEFUL: 'سپاسگزار', SAD: 'غمگین', ENERGETIC: 'پرانرژی' },
  en: { TIRED: 'Tired', ANXIOUS: 'Anxious', HOPEFUL: 'Hopeful', CALM: 'Calm', OVERWHELMED: 'Overwhelmed', GRATEFUL: 'Grateful', SAD: 'Sad', ENERGETIC: 'Energetic' },
};

function MoodTab({ data, reload, items }: { data: MoodData | null; reload: () => Promise<unknown>; items: ContentItem[] }) {
  const { t, locale, setView } = useApp();
  const { toast } = useToast();
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [anxiety, setAnxiety] = useState(3);
  const [tags, setTags] = useState<MoodTag[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  useEffect(() => {
    if (!data?.today) return;
    setMood(data.today.mood);
    setEnergy(data.today.energy);
    setAnxiety(data.today.anxiety);
    try { setTags((JSON.parse(data.today.tags) as MoodTag[]).filter((x) => TAG_LIST.includes(x))); } catch { setTags([]); }
    setNotes(data.today.notes ?? '');
  }, [data]);

  const toggleTag = (tag: MoodTag) => {
    setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : cur.length >= 4 ? cur : [...cur, tag]));
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/wellness/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayKey(), mood, energy, anxiety, tags, notes: notes.trim() || undefined }),
      });
      const body = res.ok ? await res.json().catch(() => null) : null;
      if (res.ok) {
        setShowSupport(Boolean(body?.showSupport));
        toast({ description: t('wellness.saved') });
        await reload();
      } else {
        toast({ description: res.status === 429 ? t('err.rateLimit') : t('err.validation'), variant: 'destructive' });
      }
    } catch {
      toast({ description: t('common.error'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const parseTags = (raw: string): MoodTag[] => {
    try { return (JSON.parse(raw) as MoodTag[]).filter((x) => TAG_LIST.includes(x)); } catch { return []; }
  };

  const rows = data?.entries.map((e) => {
    const parsed = parseTags(e.tags);
    return (
      <div key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
        <span className="text-xs text-muted-foreground num w-24 shrink-0">{fmtDay(e.date, locale)}</span>
        <span className="flex items-center gap-0.5 text-xs" title={t('wellness.moodScore')}><Smile className="h-3 w-3" aria-hidden /><span className="num font-medium">{e.mood}</span></span>
        <span className="flex items-center gap-0.5 text-xs" title={t('wellness.energyScore')}><Zap className="h-3 w-3" aria-hidden /><span className="num font-medium">{e.energy}</span></span>
        <span className="flex items-center gap-0.5 text-xs" title={t('wellness.anxietyScore')}><CloudRain className="h-3 w-3" aria-hidden /><span className="num font-medium">{e.anxiety}</span></span>
        {parsed.length > 0 && (
          <span className="ms-auto flex flex-wrap gap-1 justify-end">
            {parsed.map((tag) => <Badge key={tag} variant="outline" className="text-[10px]">{TAG_LABELS[locale][tag]}</Badge>)}
          </span>
        )}
      </div>
    );
  }) ?? null;

  return (
    <>
      {showSupport && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <HeartHandshake className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
            <p className="text-sm leading-relaxed flex-1">{t('wellness.lowMoodSupport')}</p>
            <Button variant="outline" onClick={() => setView('safety')} className="min-h-11 shrink-0">{t('nav.safety')}</Button>
          </CardContent>
        </Card>
      )}

      <Card className="niva-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Smile className="h-4 w-4 text-primary" aria-hidden />{t('wellness.tabMood')}
            <TodayBadge logged={data ? Boolean(data.today) : null} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SliderField label={t('wellness.moodScore')} value={mood} onChange={setMood} />
          <SliderField label={t('wellness.energyScore')} value={energy} onChange={setEnergy} />
          <SliderField label={t('wellness.anxietyScore')} value={anxiety} onChange={setAnxiety} />
          <div>
            <Label className="text-xs text-muted-foreground">{t('wellness.tags')}</Label>
            <div className="flex flex-wrap gap-2 mt-1.5" role="group" aria-label={t('wellness.tags')}>
              {TAG_LIST.map((tag) => (
                <Button key={tag} type="button" variant={tags.includes(tag) ? 'default' : 'outline'}
                  className="rounded-full min-h-11 px-4" aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                  {TAG_LABELS[locale][tag]}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="w-mood-notes">{t('wellness.notes')}</Label>
            <Input id="w-mood-notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="mt-1.5 min-h-11" />
          </div>
          <Button onClick={save} disabled={busy} className="w-full min-h-12">{t('wellness.save')}</Button>
        </CardContent>
      </Card>

      <HistoryCard title={t('wellness.history')} rows={rows} />
      <GuidanceSection items={items} />
    </>
  );
}

/* ─── View shell ───────────────────────────────────────────────────────────── */

export function WellnessView() {
  const { t } = useApp();
  const { toast } = useToast();
  const [nutrition, setNutrition] = useState<NutriData | null>(null);
  const [exercise, setExercise] = useState<ExerciseData | null>(null);
  const [sleepData, setSleepData] = useState<SleepData | null>(null);
  const [moodData, setMoodData] = useState<MoodData | null>(null);
  const [content, setContent] = useState<ContentMap>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const get = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [n, e, s, m] = await Promise.all([
      get('/api/wellness/nutrition?days=14'),
      get('/api/wellness/exercise?days=14'),
      get('/api/wellness/sleep?days=14'),
      get('/api/wellness/mood?days=14'),
    ]);
    setNutrition(n);
    setExercise(e);
    setSleepData(s);
    setMoodData(m);
    return { n, e, s, m };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { n, e, s, m } = await reload();
      const pairs = await Promise.all(CATEGORIES.map(async (cat) => {
        try {
          const r = await fetch(`/api/content?category=${cat}`);
          const d = await r.json();
          return [cat, (d.contents ?? []) as ContentItem[]] as const;
        } catch {
          return [cat, []] as const;
        }
      }));
      if (!alive) return;
      // A total data-fetch failure (e.g. network/server error) is surfaced once.
      if (!n && !e && !s && !m) toast({ description: t('common.error'), variant: 'destructive' });
      setContent(Object.fromEntries(pairs) as ContentMap);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [reload]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl" aria-busy="true">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Salad className="h-6 w-6 text-primary" />{t('wellness.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('wellness.sub')}</p>
        </header>
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Salad className="h-6 w-6 text-primary" />{t('wellness.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('wellness.sub')}</p>
      </header>

      <Tabs defaultValue="nutrition">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1">
          <TabsTrigger value="nutrition" className="min-h-11">{t('wellness.tabNutrition')}</TabsTrigger>
          <TabsTrigger value="exercise" className="min-h-11">{t('wellness.tabExercise')}</TabsTrigger>
          <TabsTrigger value="sleep" className="min-h-11">{t('wellness.tabSleep')}</TabsTrigger>
          <TabsTrigger value="mood" className="min-h-11">{t('wellness.tabMood')}</TabsTrigger>
        </TabsList>
        <TabsContent value="nutrition" className="mt-4 space-y-4"><NutritionTab data={nutrition} reload={reload} items={content.NUTRITION} /></TabsContent>
        <TabsContent value="exercise" className="mt-4 space-y-4"><ExerciseTab data={exercise} reload={reload} items={content.EXERCISE} /></TabsContent>
        <TabsContent value="sleep" className="mt-4 space-y-4"><SleepTab data={sleepData} reload={reload} items={content.SLEEP} /></TabsContent>
        <TabsContent value="mood" className="mt-4 space-y-4"><MoodTab data={moodData} reload={reload} items={content.MOOD} /></TabsContent>
      </Tabs>
    </div>
  );
}
