'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TriangleAlert } from 'lucide-react';

const SYMPTOMS = ['nausea', 'fatigue', 'heartburn', 'backPain', 'swelling', 'headache', 'cramps', 'dizziness', 'insomnia', 'breathless'] as const;

interface Entry {
  id: string; date: string; energy: number | null; nausea: number | null; sleep: number | null;
  mood: number | null; weightKg: number | null; systolic: number | null; diastolic: number | null;
  kickCount: number | null; symptoms: string; notes: string | null;
}

export function TrackingView() {
  const { t, locale, pregnancy } = useApp();
  const { toast } = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [bpAlert, setBpAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [energy, setEnergy] = useState(3);
  const [nausea, setNausea] = useState(0);
  const [sleep, setSleep] = useState(3);
  const [mood, setMood] = useState(3);
  const [weightKg, setWeightKg] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [kickCount, setKickCount] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/tracking').then((r) => r.json()).catch(() => null);
    if (res) { setEntries(res.entries ?? []); setBpAlert(Boolean(res.bpAlert)); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          energy, nausea, sleep, mood,
          weightKg: weightKg ? Number(weightKg) : undefined,
          systolic: systolic ? Number(systolic) : undefined,
          diastolic: diastolic ? Number(diastolic) : undefined,
          kickCount: kickCount ? Number(kickCount) : undefined,
          symptoms: selected,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ description: t('track.saved') });
        if (data.safetyLevel === 'EMERGENCY') {
          toast({ description: t('assist.emergencyBanner'), variant: 'destructive' });
        }
        setSelected([]); setNotes(''); setKickCount(''); setSystolic(''); setDiastolic('');
        await load();
      } else {
        toast({ description: data?.error?.message ?? t('err.validation'), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const weights = entries.filter((e) => e.weightKg).slice(0, 20).reverse();
  const moods = entries.filter((e) => e.mood).slice(0, 14).reverse();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{t('track.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('track.sub')}</p>
      </header>

      {bpAlert && (
        <Alert className="border-destructive/40 bg-destructive/5">
          <TriangleAlert className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">{t('track.bpNote')}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={submit} className="grid lg:grid-cols-2 gap-4" aria-label={t('track.title')}>
        <Card className="niva-card">
          <CardHeader className="pb-3"><CardTitle className="text-base">{t('dash.trackToday')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tk-date">{t('track.date')}</Label>
                <Input id="tk-date" type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} required className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tk-weight">{t('track.weight')}</Label>
                <Input id="tk-weight" type="number" step={0.1} dir="ltr" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="—" className="min-h-11" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tk-sys">{t('track.systolic')}</Label>
                <Input id="tk-sys" type="number" dir="ltr" value={systolic} onChange={(e) => setSystolic(e.target.value)} placeholder="120" className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tk-dia">{t('track.diastolic')}</Label>
                <Input id="tk-dia" type="number" dir="ltr" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder="80" className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tk-kick">{t('track.kicks')}</Label>
                <Input id="tk-kick" type="number" dir="ltr" value={kickCount} onChange={(e) => setKickCount(e.target.value)} placeholder="—" className="min-h-11" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('track.symptoms')}</Label>
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOMS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSelected((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}
                    aria-pressed={selected.includes(s)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors min-h-9 ${selected.includes(s) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                  >
                    {t(`sym.${s}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tk-notes">{t('track.notes')}</Label>
              <textarea id="tk-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm min-h-11" />
            </div>
          </CardContent>
        </Card>

        <Card className="niva-card">
          <CardHeader className="pb-3"><CardTitle className="text-base">{t('track.trends')}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <SliderField label={t('track.energy')} value={energy} onChange={setEnergy} max={5} />
            <SliderField label={t('track.nausea')} value={nausea} onChange={setNausea} max={5} />
            <SliderField label={t('track.sleepQ')} value={sleep} onChange={setSleep} max={5} />
            <SliderField label={t('track.mood')} value={mood} onChange={setMood} max={5} />
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1 min-h-12" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </div>
            {(weights.length > 1 || moods.length > 1) && (
              <div className="border-t pt-4 space-y-3">
                {weights.length > 1 && <Sparkline label={t('track.weight')} values={weights.map((e) => e.weightKg as number)} unit="kg" />}
                {moods.length > 1 && <Sparkline label={t('track.mood')} values={moods.map((e) => e.mood as number)} max={5} />}
              </div>
            )}
          </CardContent>
        </Card>
      </form>

      {/* History */}
      <Card className="niva-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">{t('track.history')}</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-32 w-full" /> : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-xl">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/95 backdrop-blur text-muted-foreground text-xs">
                  <tr>
                    <th className="p-2.5 text-start">{t('track.date')}</th>
                    <th className="p-2.5 text-start">{t('track.mood')}</th>
                    <th className="p-2.5 text-start">{t('track.weight')}</th>
                    <th className="p-2.5 text-start">{t('track.bp')}</th>
                    <th className="p-2.5 text-start">{t('track.symptoms')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="p-2.5 num">{new Date(e.date).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</td>
                      <td className="p-2.5 num">{e.mood ?? '—'}/5</td>
                      <td className="p-2.5 num">{e.weightKg ?? '—'}</td>
                      <td className="p-2.5 num">{e.systolic ? `${e.systolic}/${e.diastolic}` : '—'}</td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-1">
                          {safeParse(e.symptoms).map((s) => <Badge key={s} variant="secondary" className="text-[10px] px-1.5">{t(`sym.${s}`) || s}</Badge>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function safeParse(s: string): string[] {
  try { return JSON.parse(s) as string[]; } catch { return []; }
}

function SliderField({ label, value, onChange, max = 5 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <Label>{label}</Label>
        <span className="text-sm font-semibold num">{value}/{max}</span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={0} max={max} step={1} aria-label={label} />
    </div>
  );
}

function Sparkline({ label, values, unit = '', max }: { label: string; values: number[]; unit?: string; max?: number }) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const top = max ?? hi;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 30 - ((v - (max ? 0 : lo)) / (max ?? span)) * 26;
    return `${x},${Math.max(2, Math.min(30, y))}`;
  }).join(' ');
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="num">{values[values.length - 1]}{unit}</span>
      </div>
      <svg viewBox="0 0 100 32" className="w-full h-10" role="img" aria-label={label}>
        <polyline points={pts} fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
