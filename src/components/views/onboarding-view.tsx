'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Info } from 'lucide-react';
import { gestationalAgeAt } from '@/lib/gestational';

type Method = 'LMP' | 'ULTRASOUND_CRL' | 'CLINICIAN' | 'IVF';

export function OnboardingView() {
  const { t, refresh, setView, locale } = useApp();
  const [method, setMethod] = useState<Method>('LMP');
  const [label, setLabel] = useState(locale === 'fa' ? 'بارداری من' : 'My pregnancy');
  const [lmpDate, setLmpDate] = useState('');
  const [scanDate, setScanDate] = useState('');
  const [crlMm, setCrlMm] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [embryoAgeDays, setEmbryoAgeDays] = useState('5');
  const [clinicianDue, setClinicianDue] = useState('');
  const [plurality, setPlurality] = useState<'SINGLETON' | 'TWINS' | 'TRIPLETS_OR_MORE'>('SINGLETON');
  const [uncertain, setUncertain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const body: Record<string, unknown> = { method };
    if (method === 'LMP') body.lmpDate = lmpDate;
    if (method === 'ULTRASOUND_CRL') { body.scanDate = scanDate; body.crlMm = Number(crlMm); }
    if (method === 'IVF') { body.transferDate = transferDate; body.embryoAgeDays = Number(embryoAgeDays); }
    if (method === 'CLINICIAN') body.clinicianDueDate = clinicianDue;
    return body;
  }, [method, lmpDate, scanDate, crlMm, transferDate, embryoAgeDays, clinicianDue]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/pregnancy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...preview, label, plurality, uncertainDates: uncertain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error?.code ?? t('common.error'));
        return;
      }
      await refresh();
      setView('dashboard');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const localDue = useMemo(() => {
    // Client-side preview of the EDD for immediate feedback (server revalidates).
    try {
      if (method === 'LMP' && lmpDate) return new Date(new Date(lmpDate).getTime() + 280 * 86400000);
      if (method === 'ULTRASOUND_CRL' && scanDate && crlMm) {
        const table: Array<[number, number]> = [[2,35],[5,42],[10,49],[16,56],[23,63],[31,70],[41,77],[51,84],[62,91],[74,98],[87,105],[110,119]];
        const crl = Number(crlMm);
        if (crl >= 2 && crl <= 110) {
          let days = 119;
          for (let i = 0; i < table.length - 1; i++) {
            const [m1, d1] = table[i]; const [m2, d2] = table[i + 1];
            if (crl >= m1 && crl <= m2) { days = Math.round(d1 + ((crl - m1) / (m2 - m1)) * (d2 - d1)); break; }
          }
          return new Date(new Date(scanDate).getTime() + (280 - days) * 86400000);
        }
      }
      if (method === 'IVF' && transferDate) return new Date(new Date(transferDate).getTime() + (266 - Number(embryoAgeDays || 5)) * 86400000);
      if (method === 'CLINICIAN' && clinicianDue) return new Date(clinicianDue);
    } catch { /* ignore */ }
    return null;
  }, [method, lmpDate, scanDate, crlMm, transferDate, embryoAgeDays, clinicianDue]);

  const ga = localDue ? gestationalAgeAt({ dueDate: localDue }) : null;

  return (
    <div className="min-h-screen flex flex-col niva-grad">
      <main className="flex-1 grid place-items-center px-4 py-8">
        <Card className="w-full max-w-xl niva-card shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">{t('onboarding.title')}</CardTitle>
            <CardDescription className="leading-relaxed">{t('onboarding.intro')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5" aria-label={t('onboarding.title')}>
              <div className="space-y-2">
                <Label htmlFor="pg-label">{t('onboarding.nameLabel')}</Label>
                <Input id="pg-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} className="min-h-11" />
              </div>

              <div className="space-y-2">
                <Label>{t('onboarding.datingMethod')}</Label>
                <RadioGroup value={method} onValueChange={(v) => setMethod(v as Method)} className="grid sm:grid-cols-2 gap-2">
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

              {method === 'LMP' && (
                <div className="space-y-2">
                  <Label htmlFor="lmp">{t('onboarding.lmpDate')}</Label>
                  <Input id="lmp" type="date" dir="ltr" value={lmpDate} onChange={(e) => setLmpDate(e.target.value)} required className="min-h-11" />
                </div>
              )}
              {method === 'ULTRASOUND_CRL' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="scan">{t('onboarding.scanDate')}</Label>
                    <Input id="scan" type="date" dir="ltr" value={scanDate} onChange={(e) => setScanDate(e.target.value)} required className="min-h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crl">{t('onboarding.crl')}</Label>
                    <Input id="crl" type="number" dir="ltr" min={1} max={120} step={0.1} value={crlMm} onChange={(e) => setCrlMm(e.target.value)} required className="min-h-11" />
                  </div>
                </div>
              )}
              {method === 'IVF' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="transfer">{t('onboarding.transferDate')}</Label>
                    <Input id="transfer" type="date" dir="ltr" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} required className="min-h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="embryo">{t('onboarding.embryoAge')}</Label>
                    <Input id="embryo" type="number" dir="ltr" min={1} max={6} value={embryoAgeDays} onChange={(e) => setEmbryoAgeDays(e.target.value)} required className="min-h-11" />
                  </div>
                </div>
              )}
              {method === 'CLINICIAN' && (
                <div className="space-y-2">
                  <Label htmlFor="cdd">{t('onboarding.clinicianDue')}</Label>
                  <Input id="cdd" type="date" dir="ltr" value={clinicianDue} onChange={(e) => setClinicianDue(e.target.value)} required className="min-h-11" />
                  <p className="text-xs text-muted-foreground">{t('onboarding.uncertainNote')}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('onboarding.plurality')}</Label>
                <RadioGroup value={plurality} onValueChange={(v) => setPlurality(v as typeof plurality)} className="flex flex-wrap gap-2">
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

              {method === 'LMP' && (
                <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                  <Checkbox checked={uncertain} onCheckedChange={(v) => setUncertain(v === true)} className="mt-0.5" />
                  <span>{t('onboarding.uncertain')}</span>
                </label>
              )}

              {/* Live preview */}
              {localDue && (
                <div className="rounded-2xl border bg-primary/5 p-4 space-y-1.5">
                  <p className="text-sm text-muted-foreground">{t('onboarding.preview')}</p>
                  <p className="text-2xl font-bold num">{localDue.toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</p>
                  {ga && ga.totalDays >= 0 && (
                    <p className="text-sm">
                      {t('onboarding.gestationalAge')}: <span className="font-semibold num">{ga.weeks} {t('common.weeks')} + {ga.days} {t('common.days')}</span>
                    </p>
                  )}
                </div>
              )}

              {method !== 'CLINICIAN' && (
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
                <Button type="button" variant="ghost" onClick={() => setView('dashboard')}>{t('common.cancel')}</Button>
                <Button type="submit" className="flex-1 min-h-12 text-base" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('onboarding.finish')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
