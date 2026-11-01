'use client';

/**
 * Wave 17 — «مسیر من» journey switcher (feature 4.4 of the master prompt).
 *
 * Settings card that performs the validated stage transitions:
 *   TRYING → PREGNANT   (requires pregnancy details — mini-form here, then the
 *                        existing /api/pregnancy engine + /api/profile POST)
 *   PREGNANT → POSTPARTUM (opens the existing BirthDialog gateway)
 *   POSTPARTUM → TRYING  (new journey; nothing is ever deleted)
 *
 * The state machine lives server-side (/api/profile POST) — this UI only
 * mirrors it. History (LifecycleHistory) is append-only.
 */

import { useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JalaliDateField } from '@/components/ui/jalali-date';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BirthDialog } from '@/components/shell/birth-dialog';
import { Baby, Flower2, CalendarHeart, Route, PencilLine, Loader2 } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

const STAGE_KEY: Record<string, string> = {
  TRYING: 'journey.trying',
  PREGNANT: 'journey.pregnant',
  POSTPARTUM: 'journey.postpartum',
  EXPLORING: 'scr.kindAll',
};

export function JourneyCard() {
  const { t, refresh, setView, locale } = useApp();
  const { toast } = useToast();
  const [stage, setStage] = useState<string | null>(null);
  const [tryingStatus, setTryingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pgOpen, setPgOpen] = useState(false); // pregnancy mini-form (TRYING→PREGNANT)
  const [birthOpen, setBirthOpen] = useState(false); // PREGNANT→POSTPARTUM via BirthDialog
  const [lmp, setLmp] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setStage(d?.profile?.stage ?? d?.preference?.stage ?? 'EXPLORING');
        setTryingStatus(d?.profile?.tryingStatus ?? null);
      })
      .catch(() => setStage(null))
      .finally(() => setLoading(false));
  }, []);

  const switchTo = async (target: 'TRYING') => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: target }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? t('common.error'));
        return;
      }
      await refresh();
      setStage(target);
      toast({ description: t('journey.done') });
    } finally {
      setBusy(false);
    }
  };

  const confirmPregnancy = async () => {
    if (!lmp) {
      setError(t('onb2.required'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 1) register the pregnancy (existing dating engine), 2) flip the stage.
      const res = await fetch('/api/pregnancy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'LMP',
          lmpDate: new Date(lmp).toISOString(),
          label: locale === 'fa' ? 'بارداری من' : 'My pregnancy',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok && data?.error?.code !== 'ACTIVE_EXISTS') {
        setError(data?.error?.message ?? t('common.error'));
        return;
      }
      const res2 = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'PREGNANT' }),
      });
      if (!res2.ok) {
        const d2 = await res2.json().catch(() => null);
        setError(d2?.error?.message ?? t('common.error'));
        return;
      }
      await refresh();
      setPgOpen(false);
      setStage('PREGNANT');
      toast({ description: t('journey.done') });
    } finally {
      setBusy(false);
    }
  };

  const todayIso = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  };

  return (
    <Card className="niva-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4" />{t('journey.switchTitle')}
          {!loading && stage && <Badge variant="secondary" className="ms-1">{t(STAGE_KEY[stage] ?? stage)}</Badge>}
          {stage === 'TRYING' && tryingStatus && (
            <Badge variant="outline" className="text-[10px]">
              {t(tryingStatus === 'INTENDS' ? 'journey.tryingIntends' : 'journey.tryingActive')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{t('journey.switchSub')}</p>

        {/* Edit questionnaire */}
        <Button variant="outline" onClick={() => setView('onboarding')} className="min-h-11 w-full sm:w-auto">
          <PencilLine className="h-4 w-4 me-2" aria-hidden />{t('onb2.editBadge')}
        </Button>

        {/* TRYING → PREGNANT */}
        {stage === 'TRYING' && (
          <Button onClick={() => setPgOpen(true)} disabled={busy} className="min-h-11 w-full sm:w-auto">
            <Baby className="h-4 w-4 me-2" aria-hidden />{t('journey.toPregnant')}
          </Button>
        )}

        {/* PREGNANT → POSTPARTUM (the single birth gateway) */}
        {stage === 'PREGNANT' && (
          <Button onClick={() => setBirthOpen(true)} disabled={busy} className="min-h-11 w-full sm:w-auto">
            <Flower2 className="h-4 w-4 me-2" aria-hidden />{t('journey.toPostpartum')}
          </Button>
        )}

        {/* POSTPARTUM → TRYING (history preserved) */}
        {stage === 'POSTPARTUM' && (
          <Button variant="outline" onClick={() => switchTo('TRYING')} disabled={busy} className="min-h-11 w-full sm:w-auto">
            <CalendarHeart className="h-4 w-4 me-2" aria-hidden />{t('journey.toTrying')}
          </Button>
        )}

        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      </CardContent>

      {/* TRYING → PREGNANT mini-form */}
      <Dialog open={pgOpen} onOpenChange={setPgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-start">{t('journey.toPregnant')}</DialogTitle>
            <DialogDescription className="text-start">{t('journey.pregnancyNeed')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <JalaliDateField
              id="journey-lmp" label={t('onb2.tLmp')} locale={locale as Locale} value={lmp}
              onValue={setLmp} maxIso={todayIso()}
            />
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPgOpen(false)} className="min-h-11">{t('common.cancel')}</Button>
            <Button onClick={confirmPregnancy} disabled={busy} className="min-h-11">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PREGNANT → POSTPARTUM through the existing birth-registration gateway */}
      <BirthDialog
        open={birthOpen}
        onClose={() => {
          setBirthOpen(false);
          fetch('/api/profile', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { setStage(d?.profile?.stage ?? d?.preference?.stage ?? 'PREGNANT'); })
            .catch(() => undefined);
        }}
      />
    </Card>
  );
}
