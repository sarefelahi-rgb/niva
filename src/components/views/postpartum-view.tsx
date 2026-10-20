'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bath, Flower2, HeartCrack, Loader2, Milk, Moon, Scale, StickyNote, Trash2, TriangleAlert, Baby } from 'lucide-react';

interface FeedingEntry {
  id: string;
  fedAt: string;
  method: string;
  side: string;
  durationMin: number | null;
  amountMl: number | null;
  notes: string | null;
}

interface BabyCareEntry {
  id: string;
  happenedAt: string;
  kind: string;
  detail: string | null;
  value: number | null;
  note: string | null;
}

const METHOD_LABEL: Record<string, string> = {
  BREAST: 'post.feedBreast',
  BOTTLE_BREASTMILK: 'post.feedBottleMilk',
  BOTTLE_FORMULA: 'post.feedFormula',
  MIXED: 'post.feedMixed',
};

const SIDE_LABEL: Record<string, string> = {
  LEFT: 'post.sideLeft',
  RIGHT: 'post.sideRight',
  BOTH: 'post.sideBoth',
  NONE: 'post.sideNone',
};

const DETAIL_LABEL: Record<string, string> = {
  WET: 'post.diaperWet',
  SOILED: 'post.diaperSoiled',
  BOTH: 'post.diaperBoth',
};

const CARE_KIND_LABEL: Record<string, string> = {
  DIAPER: 'post.careDiaper',
  BATH: 'post.careBath',
  WEIGHT: 'post.careWeight',
  SLEEP: 'post.careSleep',
  NOTE: 'post.careNote',
};

/** Date → datetime-local input value in the user's local timezone. */
function toLocalInput(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function PostpartumView() {
  const { t, locale, pregnancy, setView } = useApp();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [busyFeed, setBusyFeed] = useState(false);
  const [busyCare, setBusyCare] = useState(false);
  const [feeding, setFeeding] = useState<FeedingEntry[]>([]);
  const [care, setCare] = useState<BabyCareEntry[]>([]);
  const [feedsLast24h, setFeedsLast24h] = useState(0);

  // Feeding form state
  const [fedAt, setFedAt] = useState(() => toLocalInput(new Date()));
  const [method, setMethod] = useState('BREAST');
  const [side, setSide] = useState('LEFT');
  const [durationMin, setDurationMin] = useState('');
  const [amountMl, setAmountMl] = useState('');
  const [feedNotes, setFeedNotes] = useState('');

  // Care form state
  const [happenedAt, setHappenedAt] = useState(() => toLocalInput(new Date()));
  const [careKind, setCareKind] = useState('DIAPER');
  const [detail, setDetail] = useState('WET');
  const [valueStr, setValueStr] = useState('');
  const [careNote, setCareNote] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/baby', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error('load failed');
      setFeeding(Array.isArray(data?.feeding) ? data.feeding : []);
      setCare(Array.isArray(data?.care) ? data.care : []);
      setFeedsLast24h(Number(data?.feedsLast24h) || 0);
    } catch {
      toast({ description: t('err.validation'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => { load(); }, [load]);

  const submitFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyFeed(true);
    try {
      const res = await fetch('/api/baby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'FEEDING',
          fedAt: new Date(fedAt).toISOString(),
          method,
          side: method === 'BREAST' ? side : 'NONE',
          durationMin: durationMin ? Number(durationMin) : undefined,
          amountMl: amountMl ? Number(amountMl) : undefined,
          notes: feedNotes || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast({ description: t('wellness.saved') });
        setFedAt(toLocalInput(new Date()));
        setDurationMin(''); setAmountMl(''); setFeedNotes('');
        await load();
      } else {
        toast({ description: data?.error?.message ?? t('err.validation'), variant: 'destructive' });
      }
    } catch {
      toast({ description: t('err.validation'), variant: 'destructive' });
    } finally {
      setBusyFeed(false);
    }
  };

  const submitCare = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyCare(true);
    try {
      const res = await fetch('/api/baby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'CARE',
          happenedAt: new Date(happenedAt).toISOString(),
          careKind,
          detail: careKind === 'DIAPER' ? detail : undefined,
          value: (careKind === 'SLEEP' || careKind === 'WEIGHT') && valueStr ? Number(valueStr) : undefined,
          note: careNote || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast({ description: t('wellness.saved') });
        setHappenedAt(toLocalInput(new Date()));
        setValueStr(''); setCareNote('');
        await load();
      } else {
        toast({ description: data?.error?.message ?? t('err.validation'), variant: 'destructive' });
      }
    } catch {
      toast({ description: t('err.validation'), variant: 'destructive' });
    } finally {
      setBusyCare(false);
    }
  };

  const removeEntry = async (kind: 'FEEDING' | 'CARE', id: string) => {
    try {
      const res = await fetch(`/api/baby?kind=${kind}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      await load();
    } catch {
      toast({ description: t('err.validation'), variant: 'destructive' });
    }
  };

  const recovery = locale === 'fa'
    ? [
      'ترشحات واژینال (لوکیا) طی چند هفته کم و روشن‌تر می‌شود؛ خونریزی شدید نیازمند بررسی فوری است.',
      'درد و انقباض رحم طبیعی است اما درد شدید را گزارش کنید.',
      'سینه‌ها ممکن است پر و حساس شوند؛ علائم گرفتگی یا قرمزی را پیگیری کنید.',
      'خستگی طبیعی است؛ هر زمان نوزاد می‌خوابد شما هم استراحت کنید.',
    ]
    : [
      'Vaginal discharge (lochia) lessens and lightens over weeks; heavy bleeding needs urgent review.',
      'Uterine cramping is expected, but severe pain should be reported.',
      'Breasts may become full and tender; watch for signs of engorgement or redness.',
      'Fatigue is normal; rest whenever your newborn sleeps.',
    ];

  const newborn = locale === 'fa'
    ? [
      'تغذیه مکرر (هر ۲–۳ ساعت) و شمارش پوشک‌های خیس به‌عنوان نشانگر تغذیه کافی.',
      'خواب نوزاد روی سطحی سخت و صاف، در اتاق شما و بدون بالشت یا پتو نرم.',
      'زردی پوست یا چشم در ۲۴ ساعت اول یا تشدید آن را فوراً گزارش کنید.',
      'تب نوزاد (۳۸ درجه یا بیشتر) همیشه اورژانس است.',
    ]
    : [
      'Frequent feeding (every 2–3 hours) and counting wet diapers as adequate-intake markers.',
      'Baby sleeps on a firm, flat surface in your room, without pillows or soft bedding.',
      'Report jaundice in the first 24 hours, or any worsening yellowing, immediately.',
      'Any newborn fever (38°C or higher) is always an emergency.',
    ];

  const careIcon = (kind: string) => {
    switch (kind) {
      case 'DIAPER': return <Baby className="h-4 w-4 text-primary shrink-0" aria-hidden />;
      case 'SLEEP': return <Moon className="h-4 w-4 text-primary shrink-0" aria-hidden />;
      case 'BATH': return <Bath className="h-4 w-4 text-primary shrink-0" aria-hidden />;
      case 'WEIGHT': return <Scale className="h-4 w-4 text-primary shrink-0" aria-hidden />;
      default: return <StickyNote className="h-4 w-4 text-primary shrink-0" aria-hidden />;
    }
  };

  const careDetail = (entry: BabyCareEntry): string | null => {
    if (entry.kind === 'DIAPER' && entry.detail) return t(DETAIL_LABEL[entry.detail] ?? 'post.detailDiaper');
    if (entry.kind === 'SLEEP' && entry.value !== null) return `${entry.value}h`;
    if (entry.kind === 'WEIGHT' && entry.value !== null) return `${entry.value}g`;
    return entry.note;
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Flower2 className="h-6 w-6 text-primary" />{t('post.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('post.sub')}</p>
      </header>

      <Alert className="border-destructive/40 bg-destructive/5">
        <HeartCrack className="h-4 w-4 text-destructive" />
        <AlertTitle className="text-destructive font-semibold">{t('post.mood')}</AlertTitle>
        <AlertDescription className="text-sm leading-relaxed">{t('post.alert')}</AlertDescription>
      </Alert>

      <Alert className="border-warning/40 bg-warning/5">
        <TriangleAlert className="h-4 w-4" />
        <AlertDescription className="text-sm leading-relaxed">{t('post.warning')}</AlertDescription>
      </Alert>

      {!pregnancy || pregnancy.status !== 'POSTPARTUM' ? (
        <Card className="niva-card">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm leading-relaxed">
              {locale === 'fa'
                ? 'این بخش برای دوره پس از زایمان آماده شده است. پس از تولد، از بخش داشبورد وضعیت بارداری را به «پس از زایمان» تغییر دهید تا محتوای این صفحه فعال شود.'
                : 'This section is ready for your postpartum period. After birth, transition your pregnancy status to “Postpartum” from the dashboard to activate this page\u2019s tools.'}
            </p>
            <Button variant="outline" onClick={() => setView('timeline')} className="min-h-11">{t('nav.timeline')}</Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Feeding log */}
      <Card className="niva-card">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2"><Milk className="h-4 w-4 text-primary" />{t('post.feedingLog')}</CardTitle>
            <Badge variant="secondary" className="num text-xs">{t('post.feedsToday')}: {feedsLast24h}</Badge>
          </div>
          <p className="text-sm text-muted-foreground font-normal">{t('post.feedingSub')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitFeed} className="space-y-3" aria-label={t('post.feedingLog')}>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="feed-at">{t('post.fedAt')}</Label>
                <Input id="feed-at" type="datetime-local" dir="ltr" value={fedAt} onChange={(e) => setFedAt(e.target.value)} required className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feed-method">{t('post.method')}</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="feed-method" className="min-h-11 w-full" aria-label={t('post.method')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREAST">{t('post.feedBreast')}</SelectItem>
                    <SelectItem value="BOTTLE_BREASTMILK">{t('post.feedBottleMilk')}</SelectItem>
                    <SelectItem value="BOTTLE_FORMULA">{t('post.feedFormula')}</SelectItem>
                    <SelectItem value="MIXED">{t('post.feedMixed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {method === 'BREAST' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="feed-side">{t('post.side')}</Label>
                  <Select value={side} onValueChange={setSide}>
                    <SelectTrigger id="feed-side" className="min-h-11 w-full" aria-label={t('post.side')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEFT">{t('post.sideLeft')}</SelectItem>
                      <SelectItem value="RIGHT">{t('post.sideRight')}</SelectItem>
                      <SelectItem value="BOTH">{t('post.sideBoth')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="feed-duration">{t('post.durationMin')}</Label>
                <Input id="feed-duration" type="number" min={1} max={120} dir="ltr" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="—" className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feed-amount">{t('post.amountMl')}</Label>
                <Input id="feed-amount" type="number" min={1} max={500} dir="ltr" value={amountMl} onChange={(e) => setAmountMl(e.target.value)} placeholder="—" className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feed-notes">{t('wellness.notes')}</Label>
                <Input id="feed-notes" value={feedNotes} onChange={(e) => setFeedNotes(e.target.value)} maxLength={300} className="min-h-11" />
              </div>
            </div>
            <Button type="submit" disabled={busyFeed} className="min-h-11">
              {busyFeed && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('post.addFeed')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Baby care log */}
      <Card className="niva-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Baby className="h-4 w-4 text-primary" />{t('post.babyLog')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitCare} className="space-y-3" aria-label={t('post.babyLog')}>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="care-at">{t('post.happenedAt')}</Label>
                <Input id="care-at" type="datetime-local" dir="ltr" value={happenedAt} onChange={(e) => setHappenedAt(e.target.value)} required className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="care-kind">{t('post.careKind')}</Label>
                <Select value={careKind} onValueChange={(v) => { setCareKind(v); setValueStr(''); }}>
                  <SelectTrigger id="care-kind" className="min-h-11 w-full" aria-label={t('post.careKind')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIAPER">{t('post.diaper')}</SelectItem>
                    <SelectItem value="BATH">{t('post.bath')}</SelectItem>
                    <SelectItem value="WEIGHT">{t('post.weightG')}</SelectItem>
                    <SelectItem value="SLEEP">{t('post.sleepHours')}</SelectItem>
                    <SelectItem value="NOTE">{t('post.noteOnly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {careKind === 'DIAPER' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="care-detail">{t('post.detailDiaper')}</Label>
                  <Select value={detail} onValueChange={setDetail}>
                    <SelectTrigger id="care-detail" className="min-h-11 w-full" aria-label={t('post.detailDiaper')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WET">{t('post.diaperWet')}</SelectItem>
                      <SelectItem value="SOILED">{t('post.diaperSoiled')}</SelectItem>
                      <SelectItem value="BOTH">{t('post.diaperBoth')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {careKind === 'SLEEP' || careKind === 'WEIGHT' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="care-value">{careKind === 'SLEEP' ? t('post.sleepHours') : t('post.weightG')}</Label>
                  <Input
                    id="care-value"
                    type="number"
                    dir="ltr"
                    min={careKind === 'SLEEP' ? 0 : 200}
                    max={careKind === 'SLEEP' ? 24 : 15000}
                    step={careKind === 'SLEEP' ? 0.1 : 1}
                    value={valueStr}
                    onChange={(e) => setValueStr(e.target.value)}
                    placeholder="—"
                    className="min-h-11"
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="care-note">{t('wellness.notes')}</Label>
                <Input id="care-note" value={careNote} onChange={(e) => setCareNote(e.target.value)} maxLength={300} className="min-h-11" />
              </div>
            </div>
            <Button type="submit" disabled={busyCare} className="min-h-11">
              {busyCare && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('post.addCare')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="niva-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('post.recovery')}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm leading-relaxed">
              {recovery.map((x, i) => <li key={i} className="flex gap-2"><span className="text-primary mt-0.5">•</span>{x}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="niva-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('post.newborn')}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm leading-relaxed">
              {newborn.map((x, i) => <li key={i} className="flex gap-2"><span className="text-primary mt-0.5">•</span>{x}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recent logs */}
      <section className="space-y-3" aria-label={t('post.recentLogs')}>
        <h2 className="text-lg font-semibold">{t('post.recentLogs')}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="niva-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Milk className="h-4 w-4 text-primary" />{t('post.feedingLog')}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : feeding.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('post.noEntries')}</p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {feeding.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Milk className="h-4 w-4 text-primary shrink-0" aria-hidden />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium truncate">
                          {t(METHOD_LABEL[f.method] ?? 'post.feedMixed')}
                          {f.method === 'BREAST' && f.side && f.side !== 'NONE' ? ` · ${t(SIDE_LABEL[f.side] ?? 'post.sideNone')}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground num">
                          {new Date(f.fedAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                          {f.durationMin ? ` · ${f.durationMin}min` : ''}{f.amountMl ? ` · ${f.amountMl}ml` : ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry('FEEDING', f.id)}
                        aria-label={t('notifs.delete')}
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

          <Card className="niva-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Baby className="h-4 w-4 text-primary" />{t('post.babyLog')}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : care.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('post.noEntries')}</p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {care.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                      {careIcon(c.kind)}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium truncate">
                          {t(CARE_KIND_LABEL[c.kind] ?? 'post.careNote')}
                          {careDetail(c) ? <span className="text-muted-foreground"> · {careDetail(c)}</span> : null}
                        </p>
                        <p className="text-xs text-muted-foreground num">{new Date(c.happenedAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry('CARE', c.id)}
                        aria-label={t('notifs.delete')}
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
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('post.everyBaby')}</p>
      </section>

      <Card className="niva-card">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{t('status.IN_REVIEW')}</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {locale === 'fa'
              ? 'محتوای این صفحه آموزشی است و «ابزار غربالگری تشخیصی» نیست. برای ارزیابی افسردگی پس از زایمان با متخصص سلامت روان یا پزشک خود صحبت کنید.'
              : 'This page\u2019s content is educational and is not a diagnostic screening tool. For postpartum depression assessment, speak with a mental-health professional or your physician.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
