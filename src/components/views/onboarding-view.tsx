'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Info, Heart, Search, Baby, Flower2, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { gestationalAgeAt } from '@/lib/gestational';
import { formatDate, formatWeeksDays } from '@/lib/format';

type Method = 'LMP' | 'ULTRASOUND_CRL' | 'CLINICIAN' | 'IVF';
type Stage = 'TRYING' | 'PREGNANT' | 'POSTPARTUM' | 'EXPLORING';
const GOALS = ['NUTRITION', 'SLEEP', 'MOOD', 'BIRTH_PREP', 'POSTPARTUM_CARE', 'FITNESS', 'BABY_MOVEMENT'] as const;
type Goal = (typeof GOALS)[number];

interface Draft {
  step: number;
  stage: Stage;
  label: string;
  method: Method;
  lmpDate: string;
  scanDate: string;
  crlMm: string;
  transferDate: string;
  embryoAgeDays: string;
  clinicianDue: string;
  plurality: 'SINGLETON' | 'TWINS' | 'TRIPLETS_OR_MORE';
  uncertain: boolean;
  goals: Goal[];
  units: 'METRIC' | 'IMPERIAL';
}

const EMPTY: Draft = {
  step: 0,
  stage: 'PREGNANT',
  label: '',
  method: 'LMP',
  lmpDate: '',
  scanDate: '',
  crlMm: '',
  transferDate: '',
  embryoAgeDays: '5',
  clinicianDue: '',
  plurality: 'SINGLETON',
  uncertain: false,
  goals: [],
  units: 'METRIC',
};

const DRAFT_KEY = 'niva_onboarding_draft_v2';

const STAGES: Array<{ id: Stage; icon: typeof Heart; key: string }> = [
  { id: 'TRYING', icon: Flower2, key: 'onboarding.stageTrying' },
  { id: 'PREGNANT', icon: Baby, key: 'onboarding.stagePregnant' },
  { id: 'POSTPARTUM', icon: Heart, key: 'onboarding.stagePostpartum' },
  { id: 'EXPLORING', icon: Search, key: 'onboarding.stageExploring' },
];

const GOAL_LABELS: Record<Goal, string> = {
  NUTRITION: 'onboarding.goalNutrition',
  SLEEP: 'onboarding.goalSleep',
  MOOD: 'onboarding.goalMood',
  BIRTH_PREP: 'onboarding.goalBirthPrep',
  POSTPARTUM_CARE: 'onboarding.goalPostpartum',
  FITNESS: 'onboarding.goalFitness',
  BABY_MOVEMENT: 'onboarding.goalMovement',
};

export function OnboardingView() {
  const { t, refresh, setView, locale, openTour } = useApp();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);

  // Resumable wizard: draft persists in localStorage so an interrupted
  // onboarding continues where it left off (Wave 2.2).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Draft>;
        setDraft({ ...EMPTY, ...parsed });
        setResumed(true);
      } else {
        setDraft((d) => ({ ...d, label: locale === 'fa' ? 'بارداری من' : 'My pregnancy' }));
      }
    } catch {
      setDraft((d) => ({ ...d, label: locale === 'fa' ? 'بارداری من' : 'My pregnancy' }));
    }
  }, [locale]);

  const patch = useCallback((p: Partial<Draft>) => {
    setDraft((d) => {
      const next = { ...d, ...p };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch { /* storage unavailable — wizard still works, just not resumable */ }
      return next;
    });
  }, []);

  const steps = draft.stage === 'PREGNANT' ? [t('onboarding.stepStage'), t('onboarding.stepDating'), t('onboarding.stepPrefs')] : [t('onboarding.stepStage'), t('onboarding.stepPrefs')];
  const lastStep = steps.length - 1;

  const datingBody = useMemo(() => {
    const body: Record<string, unknown> = { method: draft.method };
    if (draft.method === 'LMP') body.lmpDate = draft.lmpDate;
    if (draft.method === 'ULTRASOUND_CRL') { body.scanDate = draft.scanDate; body.crlMm = Number(draft.crlMm); }
    if (draft.method === 'IVF') { body.transferDate = draft.transferDate; body.embryoAgeDays = Number(draft.embryoAgeDays); }
    if (draft.method === 'CLINICIAN') body.clinicianDueDate = draft.clinicianDue;
    return body;
  }, [draft]);

  const finish = async () => {
    setError(null);
    setBusy(true);
    try {
      if (draft.stage === 'PREGNANT') {
        const res = await fetch('/api/pregnancy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...datingBody, label: draft.label || 'My pregnancy', plurality: draft.plurality, uncertainDates: draft.uncertain }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error?.message ?? data?.error?.code ?? t('common.error'));
          return;
        }
      }
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: draft.stage, goals: draft.goals, units: draft.units }),
      });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      await refresh();
      openTour();
      setView('dashboard');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const localDue = useMemo(() => {
    try {
      if (draft.method === 'LMP' && draft.lmpDate) return new Date(new Date(draft.lmpDate).getTime() + 280 * 86400000);
      if (draft.method === 'ULTRASOUND_CRL' && draft.scanDate && draft.crlMm) {
        const table: Array<[number, number]> = [[2,35],[5,42],[10,49],[16,56],[23,63],[31,70],[41,77],[51,84],[62,91],[74,98],[87,105],[110,119]];
        const crl = Number(draft.crlMm);
        if (crl >= 2 && crl <= 110) {
          let days = 119;
          for (let i = 0; i < table.length - 1; i++) {
            const [m1, d1] = table[i]; const [m2, d2] = table[i + 1];
            if (crl >= m1 && crl <= m2) { days = Math.round(d1 + ((crl - m1) / (m2 - m1)) * (d2 - d1)); break; }
          }
          return new Date(new Date(draft.scanDate).getTime() + (280 - days) * 86400000);
        }
      }
      if (draft.method === 'IVF' && draft.transferDate) return new Date(new Date(draft.transferDate).getTime() + (266 - Number(draft.embryoAgeDays || 5)) * 86400000);
      if (draft.method === 'CLINICIAN' && draft.clinicianDue) return new Date(draft.clinicianDue);
    } catch { /* ignore */ }
    return null;
  }, [draft]);

  const ga = localDue ? gestationalAgeAt({ dueDate: localDue }) : null;
  const Next = locale === 'fa' ? ChevronLeft : ChevronRight;
  const Back = locale === 'fa' ? ChevronRight : ChevronLeft;

  return (
    <div className="min-h-screen flex flex-col niva-grad">
      <main className="flex-1 grid place-items-center px-4 py-8">
        <Card className="w-full max-w-xl niva-card shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">{t('onboarding.title')}</CardTitle>
            <CardDescription className="leading-relaxed">{t('onboarding.intro')}</CardDescription>
            {/* Step indicator */}
            <div className="flex items-center gap-2 pt-2" role="group" aria-label={t('onboarding.progress')}>
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <span
                    aria-current={draft.step === i ? 'step' : undefined}
                    className={`h-2 rounded-full flex-1 transition-colors ${i <= draft.step ? 'bg-primary' : 'bg-muted'}`}
                  />
                </div>
              ))}
              <span className="text-xs text-muted-foreground num shrink-0">{draft.step + 1}/{steps.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            {resumed && draft.step > 0 && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">{t('onboarding.resumed')}</AlertDescription>
              </Alert>
            )}

            {/* ── Step 1: stage selection ── */}
            {draft.step === 0 && (
              <div className="space-y-4" aria-label={t('onboarding.stepStage')}>
                <p className="text-sm font-medium">{t('onboarding.stageQuestion')}</p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {STAGES.map(({ id, icon: Icon, key }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => patch({ stage: id })}
                      aria-pressed={draft.stage === id}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-start min-h-14 transition-colors hover:bg-muted/50 ${draft.stage === id ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm font-medium">{t(key)}</span>
                      {draft.stage === id && <Check className="h-4 w-4 text-primary ms-auto" />}
                    </button>
                  ))}
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">{t('onboarding.stageHelp')}</AlertDescription>
                </Alert>
                <Button onClick={() => patch({ step: 1 })} className="w-full min-h-12 text-base">
                  {t('common.next')} <Next className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ── Step 2a: dating (PREGNANT only) ── */}
            {draft.step === 1 && draft.stage === 'PREGNANT' && (
              <div className="space-y-5" aria-label={t('onboarding.stepDating')}>
                <div className="space-y-2">
                  <Label htmlFor="pg-label">{t('onboarding.nameLabel')}</Label>
                  <Input id="pg-label" value={draft.label} onChange={(e) => patch({ label: e.target.value })} maxLength={60} className="min-h-11" />
                </div>

                <div className="space-y-2">
                  <Label>{t('onboarding.datingMethod')}</Label>
                  <RadioGroup value={draft.method} onValueChange={(v) => patch({ method: v as Method })} className="grid sm:grid-cols-2 gap-2">
                    {([
                      ['LMP', t('onboarding.lmp')],
                      ['ULTRASOUND_CRL', t('onboarding.ultrasound')],
                      ['CLINICIAN', t('onboarding.clinician')],
                      ['IVF', t('onboarding.ivf')],
                    ] as const).map(([value, labelTxt]) => (
                      <Label key={value} htmlFor={`m-${value}`} className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary min-h-11">
                        <RadioGroupItem value={value} id={`m-${value}`} />
                        <span className="text-sm">{labelTxt}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {draft.method === 'LMP' && (
                  <div className="space-y-2">
                    <Label htmlFor="lmp">{t('onboarding.lmpDate')}</Label>
                    <Input id="lmp" type="date" dir="ltr" value={draft.lmpDate} onChange={(e) => patch({ lmpDate: e.target.value })} required className="min-h-11" />
                  </div>
                )}
                {draft.method === 'ULTRASOUND_CRL' && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="scan">{t('onboarding.scanDate')}</Label>
                      <Input id="scan" type="date" dir="ltr" value={draft.scanDate} onChange={(e) => patch({ scanDate: e.target.value })} required className="min-h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crl">{t('onboarding.crl')}</Label>
                      <Input id="crl" type="number" dir="ltr" min={1} max={120} step={0.1} value={draft.crlMm} onChange={(e) => patch({ crlMm: e.target.value })} required className="min-h-11" />
                    </div>
                  </div>
                )}
                {draft.method === 'IVF' && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="transfer">{t('onboarding.transferDate')}</Label>
                      <Input id="transfer" type="date" dir="ltr" value={draft.transferDate} onChange={(e) => patch({ transferDate: e.target.value })} required className="min-h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embryo">{t('onboarding.embryoAge')}</Label>
                      <Input id="embryo" type="number" dir="ltr" min={1} max={6} value={draft.embryoAgeDays} onChange={(e) => patch({ embryoAgeDays: e.target.value })} required className="min-h-11" />
                    </div>
                  </div>
                )}
                {draft.method === 'CLINICIAN' && (
                  <div className="space-y-2">
                    <Label htmlFor="cdd">{t('onboarding.clinicianDue')}</Label>
                    <Input id="cdd" type="date" dir="ltr" value={draft.clinicianDue} onChange={(e) => patch({ clinicianDue: e.target.value })} required className="min-h-11" />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t('onboarding.plurality')}</Label>
                  <RadioGroup value={draft.plurality} onValueChange={(v) => patch({ plurality: v as Draft['plurality'] })} className="flex flex-wrap gap-2">
                    {([
                      ['SINGLETON', t('onboarding.singleton')],
                      ['TWINS', t('onboarding.twins')],
                      ['TRIPLETS_OR_MORE', t('onboarding.triplets')],
                    ] as const).map(([value, labelTxt]) => (
                      <Label key={value} htmlFor={`p-${value}`} className="flex items-center gap-2 rounded-full border px-4 py-2.5 cursor-pointer has-[[data-state=checked]]:border-primary min-h-11">
                        <RadioGroupItem value={value} id={`p-${value}`} />
                        <span className="text-sm">{labelTxt}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {draft.method === 'LMP' && (
                  <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                    <Checkbox checked={draft.uncertain} onCheckedChange={(v) => patch({ uncertain: v === true })} className="mt-0.5" />
                    <span>{t('onboarding.uncertain')}</span>
                  </label>
                )}

                {/* Live preview + uncertainty band */}
                {localDue && (
                  <div className="rounded-2xl border bg-primary/5 p-4 space-y-1.5">
                    <p className="text-sm text-muted-foreground">{t('onboarding.preview')}</p>
                    {/* Wave 6.3: Jalali date via lib/format — RTL month words need dir="auto", not .num */}
                    <p dir="auto" className="text-2xl font-bold">{formatDate(localDue, locale)}</p>
                    {ga && ga.totalDays >= 0 && (
                      <p className="text-sm">
                        {t('onboarding.gestationalAge')}: <span dir="auto" className="font-semibold">{formatWeeksDays(ga.weeks, ga.days, locale)}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t('onboarding.uncertaintyBand')}{' '}
                      <span className="num">
                        {t(draft.uncertain || draft.method === 'LMP' ? 'onboarding.uncertaintyDaysLmp' : draft.method === 'CLINICIAN' ? 'onboarding.uncertaintyDaysClinician' : 'onboarding.uncertaintyDaysScan')}
                      </span>
                    </p>
                  </div>
                )}

                {draft.method !== 'CLINICIAN' && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs leading-relaxed">{t('onboarding.uncertainNote')}</AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => patch({ step: 0 })} className="min-h-11"><Back className="h-4 w-4" />{t('common.back')}</Button>
                  <Button onClick={() => patch({ step: 2 })} className="flex-1 min-h-12 text-base">
                    {t('common.next')} <Next className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2b/3: preferences (progressive profiling) ── */}
            {((draft.step === 1 && draft.stage !== 'PREGNANT') || draft.step === 2) && (
              <div className="space-y-5" aria-label={t('onboarding.stepPrefs')}>
                <p className="text-sm text-muted-foreground">{t('onboarding.prefsIntro')}</p>

                <div className="space-y-2">
                  <Label>{t('onboarding.goals')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => {
                      const active = draft.goals.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          aria-pressed={active}
                          onClick={() => patch({ goals: active ? draft.goals.filter((x) => x !== g) : [...draft.goals, g] })}
                          className={`rounded-full border px-4 py-2.5 text-sm min-h-11 transition-colors ${active ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}
                        >
                          {t(GOAL_LABELS[g])}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('onboarding.units')}</Label>
                  <RadioGroup value={draft.units} onValueChange={(v) => patch({ units: v as Draft['units'] })} className="flex gap-2">
                    {(['METRIC', 'IMPERIAL'] as const).map((u) => (
                      <Label key={u} htmlFor={`u-${u}`} className="flex items-center gap-2 rounded-full border px-4 py-2.5 cursor-pointer has-[[data-state=checked]]:border-primary min-h-11">
                        <RadioGroupItem value={u} id={`u-${u}`} />
                        <span className="text-sm">{t(`onboarding.units${u === 'METRIC' ? 'Metric' : 'Imperial'}`)}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">{t('onboarding.prefsPrivacy')}</AlertDescription>
                </Alert>

                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => patch({ step: draft.step - 1 })} className="min-h-11"><Back className="h-4 w-4" />{t('common.back')}</Button>
                  <Button onClick={finish} disabled={busy} className="flex-1 min-h-12 text-base">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('onboarding.finish')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
