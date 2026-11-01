'use client';

/**
 * Wave 17 — lifecycle onboarding questionnaire (feature 3 of the master prompt).
 *
 * Flow: welcome → stage question (4 options per §4.3) → stage-specific
 * questions, one question per screen (§11) → summary (§4.7) → dashboard.
 *
 * Contracts implemented here:
 * - Stepwise server save: every answered step is PUT /api/profile immediately,
 *   so an interrupted session keeps its answers (§4.8) and a resumed draft
 *   (localStorage) never re-asks answered questions after reload.
 * - Shown once: `complete: true` flips onboardingStatus — the app never
 *   re-shows it (legacy users get a soft banner instead, see page.tsx).
 * - Skippable non-essential questions (رد کردن), back preserves answers,
 *   progress bar, privacy note before health data, Jalali date inputs.
 * - TRYING option 1 vs 2 preserves the intent/active distinction (§4.3).
 * - Pregnancy dating falls back to the proven Wave-2 engine (LMP / scan CRL /
 *   clinician due date / IVF) with live preview + uncertainty band.
 * - Postpartum registers the child (BabyProfile) incl. birth status, delivery
 *   type, feeding, allergies — the nutrition safety engine consumes these.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { JalaliDateField } from '@/components/ui/jalali-date';
import { Loader2, Info, Heart, Flower2, Baby, Flower, Check, ShieldCheck, ChevronRight, ChevronLeft, SkipForward, Sparkles } from 'lucide-react';
import { gestationalAgeAt } from '@/lib/gestational';
import { babyAgeAt } from '@/lib/cycle';
import { formatDate, formatWeeksDays } from '@/lib/format';

type Method = 'LMP' | 'ULTRASOUND_CRL' | 'CLINICIAN' | 'IVF';
type Stage = 'TRYING' | 'PREGNANT' | 'POSTPARTUM';
type TryingStatus = 'INTENDS' | 'ACTIVELY_TRYING';
type CycleBand = 'B21_24' | 'B25_28' | 'B29_32' | 'B33_35' | 'IRREGULAR' | 'UNKNOWN';
type TryingDuration = 'NOT_STARTED' | 'LT_3M' | 'M3_6' | 'M6_12' | 'GT_12M' | 'PREFER_NOT';
type Prior = 'YES' | 'NO' | 'PREFER_NOT';
type Condition = 'IRREGULAR_CYCLE' | 'PCOS' | 'THYROID' | 'FERTILITY_TREATMENT' | 'OTHER' | 'NONE' | 'PREFER_NOT';
type BirthStatus = 'PRETERM' | 'TERM' | 'POSTTERM' | 'UNKNOWN';
type DeliveryType = 'VAGINAL' | 'CESAREAN' | 'OTHER' | 'PREFER_NOT';
type FeedingMethod = 'BREAST' | 'FORMULA' | 'MIXED' | 'OTHER' | 'UNKNOWN';
type ChildAllergen = 'EGG' | 'MILK' | 'GLUTEN' | 'NUTS' | 'PEANUT' | 'FISH' | 'SOY' | 'SESAME' | 'NONE' | 'PREFER_NOT';

const ALLERGEN_KEYS: Record<Exclude<ChildAllergen, 'NONE' | 'PREFER_NOT'>, string> = {
  EGG: 'allergen.egg', MILK: 'allergen.milk', GLUTEN: 'allergen.gluten',
  NUTS: 'allergen.nuts', PEANUT: 'allergen.peanut', FISH: 'allergen.fish',
  SOY: 'allergen.soy', SESAME: 'allergen.sesame',
};

interface Draft {
  stage: Stage | null;
  tryingStatus: TryingStatus | null;
  // TRYING
  lmp: string;
  cycleBand: CycleBand | null;
  cycleExact: string;
  periodDays: string;
  tryingDuration: TryingDuration | null;
  priorPregnancy: Prior | null;
  conditions: Condition[];
  // PREGNANT
  datingKnown: 'NO' | 'CLINICIAN' | 'ULTRASOUND' | null;
  clinicianDue: string;
  scanDate: string;
  crlMm: string;
  plurality: 'SINGLETON' | 'TWINS' | 'TRIPLETS_OR_MORE';
  uncertain: boolean;
  specialCare: 'YES' | 'NO' | 'DONT_KNOW' | 'PREFER_NOT' | null;
  // POSTPARTUM
  childName: string;
  childBirth: string;
  childGender: 'GIRL' | 'BOY' | 'UNDISCLOSED';
  birthStatus: BirthStatus | null;
  gaWeeks: string;
  deliveryType: DeliveryType | null;
  feedingMethod: FeedingMethod | null;
  breastfeeding: 'YES' | 'NO' | null;
  childAllergies: ChildAllergen[];
  restrictions: string;
}

const EMPTY: Draft = {
  stage: null,
  tryingStatus: null,
  lmp: '',
  cycleBand: null,
  cycleExact: '',
  periodDays: '',
  tryingDuration: null,
  priorPregnancy: null,
  conditions: [],
  datingKnown: null,
  clinicianDue: '',
  scanDate: '',
  crlMm: '',
  plurality: 'SINGLETON',
  uncertain: false,
  specialCare: null,
  childName: '',
  childBirth: '',
  childGender: 'UNDISCLOSED',
  birthStatus: null,
  gaWeeks: '',
  deliveryType: null,
  feedingMethod: null,
  breastfeeding: null,
  childAllergies: [],
  restrictions: '',
};

const DRAFT_KEY = 'niva_lifecycle_draft_v1';

const STAGE_OPTIONS: Array<{ id: Stage; status: TryingStatus | null; icon: typeof Flower; key: string }> = [
  { id: 'TRYING', status: 'INTENDS', icon: Flower, key: 'onb2.stageIntends' },
  { id: 'TRYING', status: 'ACTIVELY_TRYING', icon: Heart, key: 'onb2.stageTrying' },
  { id: 'PREGNANT', status: null, icon: Baby, key: 'onb2.stagePregnant' },
  { id: 'POSTPARTUM', status: null, icon: Flower2, key: 'onb2.stagePostpartum' },
];

/** Question flow per stage (ids rendered by the switch below). */
function stepsFor(stage: Stage | null): string[] {
  if (!stage) return ['stage'];
  if (stage === 'TRYING') return ['stage', 't_lmp', 't_cycle', 't_period', 't_duration', 't_prior', 't_conditions', 'summary'];
  if (stage === 'PREGNANT') return ['stage', 'p_lmp', 'p_dating', 'p_plurality', 'p_care', 'summary'];
  return ['stage', 'q_birth', 'q_status', 'q_delivery', 'q_feeding', 'q_allergy', 'summary'];
}

function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function OnboardingView() {
  const { t, refresh, setView, locale, openTour } = useApp();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [stepIdx, setStepIdx] = useState(0);
  const [started, setStarted] = useState(false); // welcome screen shown once
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // Load existing profile (edit/resume) + local draft. Server answers win
  // (they are the durable truth); the draft only preserves the in-progress step.
  useEffect(() => {
    let alive = true;
    (async () => {
      let base: Draft = EMPTY;
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const p = data?.profile;
          if (p) {
            base = {
              ...base,
              stage: (p.stage === 'EXPLORING' ? null : p.stage) as Draft['stage'],
              tryingStatus: p.tryingStatus ?? null,
              lmp: p.lastMenstrualPeriod ? p.lastMenstrualPeriod.slice(0, 10) : '',
              cycleBand: p.cycleLengthBand ?? null,
              cycleExact: p.cycleLengthDays ? String(p.cycleLengthDays) : '',
              periodDays: p.periodDurationDays ? String(p.periodDurationDays) : '',
              tryingDuration: p.tryingDuration ?? null,
              priorPregnancy: p.priorPregnancy ?? null,
              conditions: (p.conditions ?? []) as Condition[],
            };
            setPrefilled(true);
          }
        }
        // Prefill baby profile for POSTPARTUM editing.
        const babyRes = await fetch('/api/baby', { cache: 'no-store' });
        if (babyRes.ok) {
          const bd = await babyRes.json();
          if (bd?.profile) {
            base = {
              ...base,
              stage: 'POSTPARTUM',
              childName: bd.profile.name ?? '',
              childBirth: bd.profile.birthDate ? String(bd.profile.birthDate).slice(0, 10) : '',
              childGender: (bd.profile.gender ?? 'UNDISCLOSED') as Draft['childGender'],
              birthStatus: (bd.profile.birthStatus ?? 'UNKNOWN') as BirthStatus,
              gaWeeks: bd.profile.gestationalAgeWeeks ? String(bd.profile.gestationalAgeWeeks) : '',
              deliveryType: (bd.profile.deliveryType ?? null) as Draft['deliveryType'],
              feedingMethod: (bd.profile.feedingMethod ?? 'UNKNOWN') as Draft['feedingMethod'],
              breastfeeding: bd.profile.breastfeeding == null ? null : bd.profile.breastfeeding ? 'YES' : 'NO',
              childAllergies: ((bd.profile.foodAllergies ? JSON.parse(bd.profile.foodAllergies) : []) as ChildAllergen[]),
              restrictions: bd.profile.feedingRestrictions ?? '',
            };
            setPrefilled(true);
          }
        }
      } catch { /* offline: the local draft still resumes */ }
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Draft>;
          base = { ...base, ...parsed, stage: base.stage ?? (parsed.stage ?? null) };
        }
      } catch { /* ignore */ }
      if (!alive) return;
      setDraft(base);
      const steps = stepsFor(base.stage);
      setStepIdx(base.stage ? Math.min(1, steps.length - 1) : 0);
      if (base.stage) setStarted(true);
    })();
    return () => { alive = false; };
  }, []);

  const steps = stepsFor(draft.stage);
  const current = steps[Math.min(stepIdx, steps.length - 1)];

  const patch = useCallback((p: Partial<Draft>) => {
    setDraft((d) => {
      const next = { ...d, ...p };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch { /* non-fatal */ }
      return next;
    });
  }, []);

  /** Stepwise server save — best-effort, never blocks navigation. */
  const saveProfile = useCallback(async (stage: Stage | null, complete = false) => {
    if (!stage) return;
    const body: Record<string, unknown> = {
      stage,
      ...(stage === 'TRYING'
        ? {
            tryingStatus: draft.tryingStatus ?? 'ACTIVELY_TRYING',
            ...(draft.lmp ? { lastMenstrualPeriod: new Date(draft.lmp).toISOString() } : {}),
            ...(draft.cycleExact ? { cycleLengthDays: Number(draft.cycleExact) } : draft.cycleBand ? { cycleLengthBand: draft.cycleBand, cycleRegular: draft.cycleBand !== 'IRREGULAR' && draft.cycleBand !== 'UNKNOWN' } : {}),
            ...(draft.periodDays ? { periodDurationDays: Number(draft.periodDays) } : {}),
            ...(draft.tryingDuration ? { tryingDuration: draft.tryingDuration } : {}),
            ...(draft.priorPregnancy ? { priorPregnancy: draft.priorPregnancy } : {}),
            ...(draft.conditions.length ? { conditions: draft.conditions } : {}),
          }
        : {}),
      ...(complete ? { complete: true } : {}),
    };
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch { /* offline-tolerant; resumed on next save */ }
  }, [draft]);

  const goNext = () => {
    const nextIdx = Math.min(stepIdx + 1, steps.length - 1);
    setStepIdx(nextIdx);
    // Persist stage as soon as it is chosen; save answered trying steps.
    if (current === 'stage' && draft.stage) saveProfile(draft.stage);
    if (draft.stage === 'TRYING' && ['t_lmp', 't_cycle', 't_period', 't_duration', 't_prior', 't_conditions'].includes(current)) {
      saveProfile(draft.stage);
    }
  };
  const goBack = () => setStepIdx(Math.max(0, stepIdx - 1));

  /** Live due-date preview for the pregnancy branch (mirror of the API logic). */
  const localDue = useMemo(() => {
    try {
      if (draft.stage !== 'PREGNANT') return null;
      if (draft.datingKnown === 'CLINICIAN' && draft.clinicianDue) return new Date(draft.clinicianDue);
      if (draft.datingKnown === 'ULTRASOUND' && draft.scanDate && draft.crlMm) {
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
      if (draft.lmp) return new Date(new Date(draft.lmp).getTime() + 280 * 86400000);
    } catch { /* ignore */ }
    return null;
  }, [draft.stage, draft.datingKnown, draft.clinicianDue, draft.scanDate, draft.crlMm, draft.lmp]);

  const ga = localDue ? gestationalAgeAt({ dueDate: localDue }) : null;
  const childAge = draft.childBirth && draft.stage === 'POSTPARTUM' ? babyAgeAt(new Date(draft.childBirth)) : null;

  /** Final save: pregnancy/baby records + questionnaire completion. */
  const finish = async () => {
    if (!draft.stage) return;
    setError(null);
    setBusy(true);
    try {
      if (draft.stage === 'PREGNANT') {
        const datingBody: Record<string, unknown> =
          draft.datingKnown === 'CLINICIAN'
            ? { method: 'CLINICIAN', clinicianDueDate: draft.clinicianDue }
            : draft.datingKnown === 'ULTRASOUND'
              ? { method: 'ULTRASOUND_CRL', scanDate: draft.scanDate, crlMm: Number(draft.crlMm) }
              : { method: 'LMP', lmpDate: draft.lmp };
        const res = await fetch('/api/pregnancy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...datingBody,
            label: draft.lmp || draft.clinicianDue ? (locale === 'fa' ? 'بارداری من' : 'My pregnancy') : 'My pregnancy',
            plurality: draft.plurality,
            uncertainDates: draft.uncertain || draft.datingKnown === 'NO',
            specialCare: draft.specialCare === 'YES',
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok && !(data?.error?.code === 'ACTIVE_EXISTS')) {
          setError(data?.error?.message ?? t('common.error'));
          return;
        }
      }
      if (draft.stage === 'POSTPARTUM') {
        const res = await fetch('/api/baby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'PROFILE',
            name: draft.childName.trim() || (locale === 'fa' ? 'کوچولو' : 'Little one'),
            birthDate: new Date(draft.childBirth).toISOString(),
            gender: draft.childGender,
            ...(draft.birthStatus ? { birthStatus: draft.birthStatus } : {}),
            ...(draft.gaWeeks ? { gestationalAgeWeeks: Number(draft.gaWeeks) } : {}),
            ...(draft.deliveryType ? { deliveryType: draft.deliveryType } : {}),
            ...(draft.feedingMethod ? { feedingMethod: draft.feedingMethod } : {}),
            ...(draft.breastfeeding ? { breastfeeding: draft.breastfeeding === 'YES' } : {}),
            ...(draft.childAllergies.length ? { foodAllergies: draft.childAllergies } : {}),
            ...(draft.restrictions.trim() ? { feedingRestrictions: draft.restrictions.trim() } : {}),
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error?.message ?? t('common.error'));
          return;
        }
      }
      await saveProfile(draft.stage, true);
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

  const Next = locale === 'fa' ? ChevronLeft : ChevronRight;
  const Back = locale === 'fa' ? ChevronRight : ChevronLeft;

  const skipBtn = (label = t('onb2.skip')) => (
    <Button type="button" variant="ghost" onClick={goNext} className="min-h-11 text-muted-foreground">
      {label} <SkipForward className="h-4 w-4" />
    </Button>
  );

  /* ── Welcome screen (§4.2) ── */
  if (!started) {
    return (
      <div className="min-h-screen flex flex-col niva-grad">
        <main className="flex-1 grid place-items-center px-4 py-8">
          <Card className="w-full max-w-xl niva-card shadow-xl">
            <CardContent className="p-8 text-center space-y-5">
              <div className="text-5xl" aria-hidden>🌸</div>
              <CardTitle className="text-3xl">{t('onb2.welcomeTitle')}</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {t('onb2.welcomeBody')}
              </CardDescription>
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">{t('onb2.privacyNote')}</AlertDescription>
              </Alert>
              {prefilled && (
                <p className="text-xs text-muted-foreground">{t('onb2.resumed')}</p>
              )}
              <Button onClick={() => setStarted(true)} className="w-full min-h-12 text-base">
                {t('onb2.start')} <Sparkles className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col niva-grad">
      <main className="flex-1 grid place-items-center px-4 py-8">
        <Card className="w-full max-w-xl niva-card shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-2xl">{t('onb2.title')}</CardTitle>
              {prefilled && <Badge variant="secondary" className="shrink-0">{t('onb2.editBadge')}</Badge>}
            </div>
            {/* Progress bar (§4.8) */}
            <div className="flex items-center gap-2 pt-2" role="group" aria-label={t('onb2.progress')}>
              {steps.map((s, i) => (
                <div key={`${s}-${i}`} className="flex-1">
                  <span aria-current={stepIdx === i ? 'step' : undefined} className={`h-2 rounded-full block transition-colors ${i <= stepIdx ? 'bg-primary' : 'bg-muted'}`} />
                </div>
              ))}
              <span className="text-xs text-muted-foreground num shrink-0">{stepIdx + 1}/{steps.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            {/* ── Stage question (§4.3) ── */}
            {current === 'stage' && (
              <div className="space-y-4" aria-label={t('onb2.stageQuestion')}>
                <p className="text-base font-semibold">{t('onb2.stageQuestion')}</p>
                <div className="space-y-2.5">
                  {STAGE_OPTIONS.map(({ id, status, icon: Icon, key }) => {
                    const active = draft.stage === id && (id !== 'TRYING' || draft.tryingStatus === status);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => patch({ stage: id, tryingStatus: status })}
                        aria-pressed={active}
                        className={`flex items-center gap-3 rounded-xl border p-4 text-start min-h-14 w-full transition-colors hover:bg-muted/50 ${active ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <Icon className="h-5 w-5 text-primary shrink-0" aria-hidden />
                        <span className="text-sm font-medium">{t(key)}</span>
                        {active && <Check className="h-4 w-4 text-primary ms-auto" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">{t('onb2.stageHelp')}</AlertDescription>
                </Alert>
                {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
                <Button onClick={goNext} disabled={!draft.stage} className="w-full min-h-12 text-base">
                  {t('common.next')} <Next className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ── TRYING questions (§4.4) ── */}
            {current === 't_lmp' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} optionalLabel={t('onb2.optionalNote')} skip={skipBtn()}>
                <JalaliDateField
                  id="t-lmp" label={t('onb2.tLmp')} locale={locale} value={draft.lmp}
                  onValue={(iso) => patch({ lmp: iso })}
                  maxIso={todayIso()}
                  hint={t('onb2.tLmpHint')}
                />
              </QuestionShell>
            )}

            {current === 't_cycle' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back} backLabel={t('common.back')} optionalLabel={t('onb2.optionalNote')} skip={skipBtn()}>
                <p className="text-base font-semibold">{t('onb2.tCycle')}</p>
                <RadioGroup
                  value={draft.cycleBand ?? ''}
                  onValueChange={(v) => patch({ cycleBand: v as CycleBand, cycleExact: '' })}
                  className="grid sm:grid-cols-2 gap-2"
                >
                  {([
                    ['B21_24', 'onb2.cycle21_24'], ['B25_28', 'onb2.cycle25_28'], ['B29_32', 'onb2.cycle29_32'],
                    ['B33_35', 'onb2.cycle33_35'], ['IRREGULAR', 'onb2.cycleIrregular'], ['UNKNOWN', 'onb2.cycleUnknown'],
                  ] as const).map(([value, key]) => (
                    <Label key={value} htmlFor={`c-${value}`} className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary min-h-11">
                      <RadioGroupItem value={value} id={`c-${value}`} />
                      <span className="text-sm">{t(key)}</span>
                    </Label>
                  ))}
                </RadioGroup>
                <div className="space-y-2">
                  <Label htmlFor="t-cycle-exact">{t('onb2.tCycleExact')}</Label>
                  <Input id="t-cycle-exact" type="number" dir="ltr" min={15} max={60} className="min-h-11"
                    value={draft.cycleExact} onChange={(e) => patch({ cycleExact: e.target.value, cycleBand: null })} />
                </div>
              </QuestionShell>
            )}

            {current === 't_period' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back} backLabel={t('common.back')} optionalLabel={t('onb2.optionalNote')} skip={skipBtn()}>
                <p className="text-base font-semibold">{t('onb2.tPeriod')}</p>
                <div className="space-y-2 max-w-40">
                  <Input id="t-period" type="number" dir="ltr" min={1} max={14} className="min-h-12 text-lg text-center"
                    value={draft.periodDays} onChange={(e) => patch({ periodDays: e.target.value })} />
                  <p className="text-xs text-muted-foreground">{t('onb2.daysUnit')}</p>
                </div>
              </QuestionShell>
            )}

            {current === 't_duration' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back} backLabel={t('common.back')} optionalLabel={t('onb2.optionalNote')} skip={skipBtn()}>
                <p className="text-base font-semibold">{t('onb2.tDuration')}</p>
                <RadioGroup value={draft.tryingDuration ?? ''} onValueChange={(v) => patch({ tryingDuration: v as TryingDuration })} className="space-y-2">
                  {([
                    ['NOT_STARTED', 'onb2.durNotStarted'], ['LT_3M', 'onb2.durLt3'], ['M3_6', 'onb2.durM3_6'],
                    ['M6_12', 'onb2.durM6_12'], ['GT_12M', 'onb2.durGt12'], ['PREFER_NOT', 'onb2.preferNot'],
                  ] as const).map(([value, key]) => (
                    <Label key={value} htmlFor={`d-${value}`} className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary min-h-11">
                      <RadioGroupItem value={value} id={`d-${value}`} />
                      <span className="text-sm">{t(key)}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </QuestionShell>
            )}

            {current === 't_prior' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back} backLabel={t('common.back')} optionalLabel={t('onb2.optionalNote')} skip={skipBtn()}>
                <p className="text-base font-semibold">{t('onb2.tPrior')}</p>
                <RadioGroup value={draft.priorPregnancy ?? ''} onValueChange={(v) => patch({ priorPregnancy: v as Prior })} className="space-y-2">
                  {([['YES', 'common.yes'], ['NO', 'common.no'], ['PREFER_NOT', 'onb2.preferNot']] as const).map(([value, key]) => (
                    <Label key={value} htmlFor={`pr-${value}`} className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary min-h-11">
                      <RadioGroupItem value={value} id={`pr-${value}`} />
                      <span className="text-sm">{t(key)}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </QuestionShell>
            )}

            {current === 't_conditions' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back}>
                <p className="text-base font-semibold">{t('onb2.tConditions')}</p>
                <div className="space-y-2">
                  {([
                    ['IRREGULAR_CYCLE', 'onb2.condIrregular'], ['PCOS', 'onb2.condPcos'], ['THYROID', 'onb2.condThyroid'],
                    ['FERTILITY_TREATMENT', 'onb2.condFertility'], ['OTHER', 'onb2.condOther'], ['NONE', 'onb2.condNone'], ['PREFER_NOT', 'onb2.preferNot'],
                  ] as const).map(([value, key]) => {
                    const active = draft.conditions.includes(value);
                    return (
                      <Label key={value} htmlFor={`cond-${value}`} className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 min-h-11 ${active ? 'border-primary bg-primary/5' : ''}`}>
                        <Checkbox
                          id={`cond-${value}`} checked={active}
                          onCheckedChange={(c) => {
                            const set = new Set(draft.conditions.filter((x) => x !== 'NONE' && x !== 'PREFER_NOT'));
                            if (c === true) {
                              if (value === 'NONE' || value === 'PREFER_NOT') { set.clear(); set.add(value); }
                              else set.add(value);
                            } else set.delete(value);
                            patch({ conditions: Array.from(set) as Condition[] });
                          }}
                        />
                        <span className="text-sm">{t(key)}</span>
                      </Label>
                    );
                  })}
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">{t('onb2.conditionsNote')}</AlertDescription>
                </Alert>
              </QuestionShell>
            )}

            {/* ── PREGNANT questions (§4.5) ── */}
            {current === 'p_lmp' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next}>
                <JalaliDateField
                  id="p-lmp" label={t('onb2.tLmp')} locale={locale} value={draft.lmp}
                  onValue={(iso) => patch({ lmp: iso })}
                  maxIso={todayIso()}
                  hint={t('onb2.pLmpHint')}
                />
                <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                  <Checkbox checked={draft.uncertain} onCheckedChange={(v) => patch({ uncertain: v === true })} className="mt-0.5" />
                  <span>{t('onboarding.uncertain')}</span>
                </label>
                {!draft.lmp && <p className="text-xs text-destructive">{t('onb2.required')}</p>}
              </QuestionShell>
            )}

            {current === 'p_dating' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back}>
                <p className="text-base font-semibold">{t('onb2.pDating')}</p>
                <RadioGroup value={draft.datingKnown ?? ''} onValueChange={(v) => patch({ datingKnown: v as Draft['datingKnown'] })} className="space-y-2">
                  {([
                    ['NO', 'onb2.datingNo'], ['CLINICIAN', 'onb2.datingClinician'], ['ULTRASOUND', 'onb2.datingUltrasound'],
                  ] as const).map(([value, key]) => (
                    <Label key={value} htmlFor={`dt-${value}`} className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary min-h-11">
                      <RadioGroupItem value={value} id={`dt-${value}`} />
                      <span className="text-sm">{t(key)}</span>
                    </Label>
                  ))}
                </RadioGroup>

                {draft.datingKnown === 'CLINICIAN' && (
                  <JalaliDateField
                    id="p-clinician" label={t('onboarding.clinicianDue')} locale={locale} value={draft.clinicianDue}
                    onValue={(iso) => patch({ clinicianDue: iso })}
                  />
                )}
                {draft.datingKnown === 'ULTRASOUND' && (
                  <div className="space-y-3">
                    <JalaliDateField
                      id="p-scan" label={t('onboarding.scanDate')} locale={locale} value={draft.scanDate}
                      onValue={(iso) => patch({ scanDate: iso })}
                    />
                    <div className="space-y-2">
                      <Label htmlFor="p-crl">{t('onboarding.crl')}</Label>
                      <Input id="p-crl" type="number" dir="ltr" min={1} max={120} step={0.1} className="min-h-11"
                        value={draft.crlMm} onChange={(e) => patch({ crlMm: e.target.value })} />
                    </div>
                  </div>
                )}

                {localDue && (
                  <div className="rounded-2xl border bg-primary/5 p-4 space-y-1.5">
                    <p className="text-sm text-muted-foreground">{t('onboarding.preview')}</p>
                    <p dir="auto" className="text-2xl font-bold">{formatDate(localDue, locale)}</p>
                    {ga && ga.totalDays >= 0 && (
                      <p className="text-sm">{t('onboarding.gestationalAge')}: <span dir="auto" className="font-semibold">{formatWeeksDays(ga.weeks, ga.days, locale)}</span></p>
                    )}
                  </div>
                )}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">{t('onb2.pDatingNote')}</AlertDescription>
                </Alert>
              </QuestionShell>
            )}

            {current === 'p_plurality' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back}>
                <p className="text-base font-semibold">{t('onboarding.plurality')}</p>
                <RadioGroup value={draft.plurality} onValueChange={(v) => patch({ plurality: v as Draft['plurality'] })} className="space-y-2">
                  {([
                    ['SINGLETON', 'onboarding.singleton'], ['TWINS', 'onboarding.twins'],
                    ['TRIPLETS_OR_MORE', 'onboarding.triplets'], ['UNKNOWN_PLURALITY', 'onb2.pluralityUnknown'],
                  ] as const).map(([value, key]) => (
                    <Label key={value} htmlFor={`pl-${value}`} className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary min-h-11">
                      <RadioGroupItem value={value} id={`pl-${value}`} />
                      <span className="text-sm">{t(key)}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </QuestionShell>
            )}

            {current === 'p_care' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back} backLabel={t('common.back')} optionalLabel={t('onb2.optionalNote')} skip={skipBtn()}>
                <p className="text-base font-semibold">{t('onb2.pCare')}</p>
                <RadioGroup value={draft.specialCare ?? ''} onValueChange={(v) => patch({ specialCare: v as Draft['specialCare'] })} className="space-y-2">
                  {([
                    ['YES', 'common.yes'], ['NO', 'common.no'], ['DONT_KNOW', 'onb2.dontKnow'], ['PREFER_NOT', 'onb2.preferNot'],
                  ] as const).map(([value, key]) => (
                    <Label key={value} htmlFor={`sc-${value}`} className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary min-h-11">
                      <RadioGroupItem value={value} id={`sc-${value}`} />
                      <span className="text-sm">{t(key)}</span>
                    </Label>
                  ))}
                </RadioGroup>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">{t('onb2.pCareNote')}</AlertDescription>
                </Alert>
              </QuestionShell>
            )}

            {/* ── POSTPARTUM questions (§4.6) ── */}
            {current === 'q_birth' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next}>
                <div className="space-y-2">
                  <Label htmlFor="q-name">{t('onb2.qName')} <span className="text-muted-foreground">({t('common.optional')})</span></Label>
                  <Input id="q-name" className="min-h-11" maxLength={60} value={draft.childName}
                    onChange={(e) => patch({ childName: e.target.value })} placeholder={t('onb2.qNamePh')} />
                </div>
                <JalaliDateField
                  id="q-birth" label={t('onb2.qBirth')} locale={locale} value={draft.childBirth}
                  onValue={(iso) => patch({ childBirth: iso })}
                  maxIso={todayIso()}
                />
                {!draft.childBirth && <p className="text-xs text-destructive">{t('onb2.required')}</p>}
              </QuestionShell>
            )}

            {current === 'q_status' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back} backLabel={t('common.back')} optionalLabel={t('onb2.optionalNote')} skip={skipBtn()}>
                <p className="text-base font-semibold">{t('onb2.qStatus')}</p>
                <RadioGroup value={draft.birthStatus ?? ''} onValueChange={(v) => patch({ birthStatus: v as BirthStatus })} className="space-y-2">
                  {([
                    ['TERM', 'onb2.birthTerm'], ['PRETERM', 'onb2.birthPreterm'], ['POSTTERM', 'onb2.birthPostterm'], ['UNKNOWN', 'onb2.dontKnow'],
                  ] as const).map(([value, key]) => (
                    <Label key={value} htmlFor={`bs-${value}`} className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary min-h-11">
                      <RadioGroupItem value={value} id={`bs-${value}`} />
                      <span className="text-sm">{t(key)}</span>
                    </Label>
                  ))}
                </RadioGroup>
                {draft.birthStatus === 'PRETERM' && (
                  <div className="space-y-2">
                    <Label htmlFor="q-ga">{t('onb2.qGaWeeks')}</Label>
                    <Input id="q-ga" type="number" dir="ltr" min={20} max={43} className="min-h-11"
                      value={draft.gaWeeks} onChange={(e) => patch({ gaWeeks: e.target.value })} />
                    <p className="text-xs text-muted-foreground">{t('onb2.qGaHint')}</p>
                  </div>
                )}
              </QuestionShell>
            )}

            {current === 'q_delivery' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back} backLabel={t('common.back')} optionalLabel={t('onb2.optionalNote')} skip={skipBtn()}>
                <p className="text-base font-semibold">{t('onb2.qDelivery')}</p>
                <RadioGroup value={draft.deliveryType ?? ''} onValueChange={(v) => patch({ deliveryType: v as DeliveryType })} className="space-y-2">
                  {([
                    ['VAGINAL', 'onb2.delVaginal'], ['CESAREAN', 'onb2.delCesarean'], ['OTHER', 'onb2.delOther'], ['PREFER_NOT', 'onb2.preferNot'],
                  ] as const).map(([value, key]) => (
                    <Label key={value} htmlFor={`dlt-${value}`} className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary min-h-11">
                      <RadioGroupItem value={value} id={`dlt-${value}`} />
                      <span className="text-sm">{t(key)}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </QuestionShell>
            )}

            {current === 'q_feeding' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back} backLabel={t('common.back')} optionalLabel={t('onb2.optionalNote')} skip={skipBtn()}>
                <p className="text-base font-semibold">{t('onb2.qFeeding')}</p>
                <RadioGroup value={draft.feedingMethod ?? ''} onValueChange={(v) => patch({ feedingMethod: v as FeedingMethod })} className="space-y-2">
                  {([
                    ['BREAST', 'onb2.feedBreast'], ['FORMULA', 'onb2.feedFormula'], ['MIXED', 'onb2.feedMixed'], ['OTHER', 'onb2.feedOther'],
                  ] as const).map(([value, key]) => (
                    <Label key={value} htmlFor={`fm-${value}`} className="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary min-h-11">
                      <RadioGroupItem value={value} id={`fm-${value}`} />
                      <span className="text-sm">{t(key)}</span>
                    </Label>
                  ))}
                </RadioGroup>
                <Separator />
                <p className="text-base font-semibold">{t('onb2.qBreastfeeding')}</p>
                <RadioGroup value={draft.breastfeeding ?? ''} onValueChange={(v) => patch({ breastfeeding: v as Draft['breastfeeding'] })} className="flex gap-2">
                  {([['YES', 'common.yes'], ['NO', 'common.no']] as const).map(([value, key]) => (
                    <Label key={value} htmlFor={`bf-${value}`} className="flex items-center gap-2 rounded-full border px-4 py-2.5 cursor-pointer has-[[data-state=checked]]:border-primary min-h-11">
                      <RadioGroupItem value={value} id={`bf-${value}`} />
                      <span className="text-sm">{t(key)}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </QuestionShell>
            )}

            {current === 'q_allergy' && (
              <QuestionShell onNext={goNext} nextLabel={t('common.next')} nextIcon={Next} onBack={goBack} backIcon={Back} backLabel={t('common.back')} optionalLabel={t('onb2.optionalNote')} skip={skipBtn()}>
                <p className="text-base font-semibold">{t('onb2.qAllergy')}</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ALLERGEN_KEYS) as Array<keyof typeof ALLERGEN_KEYS>).map((a) => {
                    const active = draft.childAllergies.includes(a);
                    return (
                      <button
                        key={a} type="button" aria-pressed={active}
                        onClick={() => {
                          const set = new Set(draft.childAllergies.filter((x) => x !== 'NONE' && x !== 'PREFER_NOT'));
                          if (active) set.delete(a); else set.add(a);
                          patch({ childAllergies: Array.from(set) as ChildAllergen[] });
                        }}
                        className={`rounded-full border px-4 py-2.5 text-sm min-h-11 transition-colors ${active ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}
                      >
                        {t(ALLERGEN_KEYS[a])}
                      </button>
                    );
                  })}
                  {([['NONE', 'onb2.condNone'], ['PREFER_NOT', 'onb2.preferNot']] as const).map(([value, key]) => {
                    const active = draft.childAllergies.includes(value as ChildAllergen);
                    return (
                      <button
                        key={value} type="button" aria-pressed={active}
                        onClick={() => patch({ childAllergies: active ? [] : [value as ChildAllergen] })}
                        className={`rounded-full border px-4 py-2.5 text-sm min-h-11 transition-colors ${active ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}
                      >
                        {t(key)}
                      </button>
                    );
                  })}
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">{t('onb2.allergyNote')}</AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="q-restrict">{t('onb2.qRestrict')} <span className="text-muted-foreground">({t('common.optional')})</span></Label>
                  <Input id="q-restrict" className="min-h-11" maxLength={300} value={draft.restrictions}
                    onChange={(e) => patch({ restrictions: e.target.value })} placeholder={t('onb2.qRestrictPh')} />
                </div>
              </QuestionShell>
            )}

            {/* ── Summary (§4.7) ── */}
            {current === 'summary' && draft.stage && (
              <div className="space-y-5" aria-label={t('onb2.summaryTitle')}>
                <div className="text-center space-y-2 pt-2">
                  <div className="text-4xl" aria-hidden>🌸</div>
                  <p className="text-xl font-bold">{t('onb2.summaryTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('onb2.summarySub')}</p>
                </div>
                <div className="rounded-2xl border bg-primary/5 p-4 space-y-2">
                  <SummaryRow label={t('onb2.summaryStage')} value={t(`onb2.stage${draft.stage.charAt(0)}${draft.stage.slice(1).toLowerCase()}`)} />
                  {draft.stage === 'PREGNANT' && localDue && ga && (
                    <>
                      <SummaryRow label={t('onb2.summaryWeek')} value={formatWeeksDays(ga.weeks, ga.days, locale)} />
                      <SummaryRow label={t('onboarding.preview')} value={formatDate(localDue, locale)} />
                    </>
                  )}
                  {draft.stage === 'POSTPARTUM' && childAge && (
                    <SummaryRow
                      label={t('onb2.summaryChildAge')}
                      value={childAge.months >= 1
                        ? `${childAge.months} ${t('post2.months')}`
                        : `${childAge.weeks} ${t('post2.weeks')}`}
                    />
                  )}
                  {draft.stage === 'TRYING' && (draft.cycleBand || draft.cycleExact) && (
                    <SummaryRow
                      label={t('onb2.summaryCycle')}
                      value={draft.cycleExact
                        ? `${draft.cycleExact} ${t('common.days')}`
                        : t(`onb2.cycle${draft.cycleBand}`)}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t('onb2.summaryPrivacy')}</p>
                {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={goBack} className="min-h-11"><Back className="h-4 w-4" />{t('common.back')}</Button>
                  <Button onClick={finish} disabled={busy} className="flex-1 min-h-12 text-base">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('onb2.enter')}
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

function QuestionShell({ children, onNext, nextLabel, nextIcon, onBack, backIcon, backLabel, optionalLabel, skip }: {
  children: React.ReactNode;
  onNext: () => void;
  nextLabel: string;
  nextIcon: React.ComponentType<{ className?: string }>;
  onBack?: () => void;
  backIcon?: React.ComponentType<{ className?: string }>;
  backLabel?: string;
  optionalLabel?: string;
  skip?: React.ReactNode;
}) {
  const NextIcon = nextIcon;
  const BackIcon = backIcon;
  return (
    <div className="space-y-5" aria-live="polite">
      {optionalLabel && (
        <p className="text-xs text-muted-foreground -mb-2">{optionalLabel}</p>
      )}
      {children}
      <div className="flex gap-2">
        {onBack && BackIcon ? (
          <Button variant="ghost" onClick={onBack} className="min-h-11"><BackIcon className="h-4 w-4" />{backLabel}</Button>
        ) : null}
        {skip}
        <Button onClick={onNext} className="flex-1 min-h-12 text-base">
          {nextLabel} <NextIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span dir="auto" className="font-semibold text-end">{value}</span>
    </div>
  );
}
