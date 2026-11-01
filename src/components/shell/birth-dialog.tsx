'use client';

/**
 * Wave 14 — birth registration dialog («کوچولو به دنیا آمد»).
 * Collects the baby's details, creates/updates the BabyProfile, transitions
 * the pregnancy to POSTPARTUM and switches the preference stage — the single
 * gateway from the pregnancy journey into the first-year companion.
 * Reused by the dashboard (active pregnancy, week ≥ 36) and the postpartum
 * view (no profile yet / edit existing profile).
 */

import { useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { JalaliDateField } from '@/components/ui/jalali-date';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Baby } from 'lucide-react';

export interface BabyProfileLike {
  name: string;
  birthDate: string;
  gender: string;
  birthWeightG?: number | null;
  birthLengthCm?: number | null;
  birthNote?: string | null;
}

interface Draft {
  name: string;
  birthDate: string;
  gender: 'GIRL' | 'BOY' | 'UNDISCLOSED';
  weight: string;
  length: string;
  note: string;
}

function todayLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function BirthDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  /** When provided the dialog edits the profile instead of first registration. */
  existing?: BabyProfileLike | null;
}) {
  const { t, refresh, locale } = useApp();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    name: '', birthDate: todayLocal(), gender: 'UNDISCLOSED', weight: '', length: '', note: '',
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      name: existing?.name ?? '',
      birthDate: existing?.birthDate ? existing.birthDate.slice(0, 10) : todayLocal(),
      gender: (existing?.gender as Draft['gender']) ?? 'UNDISCLOSED',
      weight: existing?.birthWeightG ? String(existing.birthWeightG) : '',
      length: existing?.birthLengthCm ? String(existing.birthLengthCm) : '',
      note: existing?.birthNote ?? '',
    });
  }, [open, existing]);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const submit = async () => {
    if (!draft.name.trim()) {
      toast({ description: t('err.validation'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const profileBody = {
        kind: 'PROFILE',
        name: draft.name.trim(),
        birthDate: new Date(draft.birthDate).toISOString(),
        gender: draft.gender,
        ...(draft.weight ? { birthWeightG: Number(draft.weight) } : {}),
        ...(draft.length ? { birthLengthCm: Number(draft.length) } : {}),
        ...(draft.note.trim() ? { birthNote: draft.note.trim() } : {}),
      };
      const res = await fetch('/api/baby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileBody),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
        return;
      }
      // Transition pregnancy + preference stage (best-effort: profile is saved
      // either way; a user without an active pregnancy record still proceeds).
      await fetch('/api/pregnancy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TRANSITION', transition: 'POSTPARTUM' }),
      }).catch(() => null);
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'POSTPARTUM' }),
      }).catch(() => null);
      await refresh();
      toast({ description: t('born.success') });
      onClose();
    } catch {
      toast({ description: t('common.error'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-md" dir="auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Baby className="h-5 w-5 text-primary" aria-hidden />
            {t('born.title')}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{t('born.desc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="born-name">{t('born.name')}</Label>
            <Input
              id="born-name" value={draft.name} maxLength={60} required
              onChange={(e) => patch({ name: e.target.value })} className="min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <JalaliDateField
              id="born-date"
              label={t('born.birthDate')}
              locale={locale}
              value={draft.birthDate}
              onValue={(iso) => patch({ birthDate: iso })}
              maxIso={todayLocal()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('born.gender')}</Label>
            <RadioGroup
              value={draft.gender}
              onValueChange={(v) => patch({ gender: v as Draft['gender'] })}
              className="flex flex-wrap gap-2"
            >
              {([
                ['GIRL', t('born.girl')],
                ['BOY', t('born.boy')],
                ['UNDISCLOSED', t('born.undisclosed')],
              ] as const).map(([value, label]) => (
                <Label
                  key={value}
                  htmlFor={`g-${value}`}
                  className="flex items-center gap-2 rounded-full border px-4 py-2.5 cursor-pointer has-[[data-state=checked]]:border-primary min-h-11"
                >
                  <RadioGroupItem value={value} id={`g-${value}`} />
                  <span className="text-sm">{label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="born-weight">{t('born.weight')}</Label>
              <Input
                id="born-weight" type="number" dir="ltr" min={500} max={7000}
                value={draft.weight} onChange={(e) => patch({ weight: e.target.value })}
                placeholder="—" className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="born-length">{t('born.length')}</Label>
              <Input
                id="born-length" type="number" dir="ltr" min={25} max={70}
                value={draft.length} onChange={(e) => patch({ length: e.target.value })}
                placeholder="—" className="min-h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="born-note">{t('born.note')}</Label>
            <Textarea
              id="born-note" value={draft.note} maxLength={300} rows={2}
              onChange={(e) => patch({ note: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="min-h-11">{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={busy} className="min-h-11">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('born.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
