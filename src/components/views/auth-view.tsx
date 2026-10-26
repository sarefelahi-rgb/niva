'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Smartphone, KeyRound, Wand2 } from 'lucide-react';
import { setToken } from '@/lib/auth-token';
import { maskMobile, normalizeDigits } from '@/lib/phone';

/**
 * Wave 11 — OTP-first sign-in. The ONLY consumer auth surface:
 *   1) mobile number → sms.ir one-time code (hashed at rest, 5-min TTL)
 *   2) code → session. First-time numbers are registered automatically.
 * In sandbox/preview (no SMS_IR_API_KEY) the request response carries a
 * devCode hint so the flow stays testable; with credentials set, the hint
 * never appears and real SMS is sent via the sms.ir verify template.
 */

type Step = 'phone' | 'code';

export function AuthView() {
  const { t, refresh, setView, locale } = useApp();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const requestOtp = async () => {
    setError(null);
    const cleaned = normalizeDigits(phone).replace(/[^\d+]/g, '');
    if (cleaned.replace(/\D/g, '').length < 10) {
      setError(t('auth.phoneInvalid'));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned, locale }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? t('common.error'));
        return;
      }
      setStep('code');
      setResendIn(60);
      setDevMode(Boolean(data?.devMode));
      setDevCode(data?.devCode ?? null);
      setCode('');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      const cleaned = normalizeDigits(phone).replace(/[^\d+]/g, '');
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned, code: normalizeDigits(code), locale }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? t('common.error'));
        return;
      }
      if (data.token) setToken(data.token);
      await refresh();
      // Doctors land in their panel; everyone else on the dashboard.
      setView(data.role === 'DOCTOR' ? 'doctor' : 'dashboard');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? t('common.error'));
        return;
      }
      if (data?.token) setToken(data.token);
      await refresh();
      setView('dashboard');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col niva-grad">
      <main className="flex-1 grid place-items-center px-4 py-10">
        <Card className="w-full max-w-md niva-card shadow-xl">
          <CardHeader className="text-center space-y-2">
            <span className="mx-auto grid place-items-center h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-bold text-lg">N</span>
            <CardTitle className="text-2xl">{t('auth.otpWelcome')}</CardTitle>
            <CardDescription>{t('app.tagline')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'phone' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  requestOtp();
                }}
                className="space-y-4"
                aria-label={t('auth.otpTitle')}
              >
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('auth.phone')}</Label>
                  <div className="relative">
                    <Smartphone className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="phone"
                      type="tel"
                      dir="ltr"
                      inputMode="tel"
                      placeholder="0912 345 6789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      autoComplete="tel"
                      className="min-h-11 num ps-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('auth.otpIntro')}</p>
                </div>
                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full min-h-12 text-base" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  <KeyRound className="h-4 w-4 me-2" aria-hidden="true" />
                  {t('auth.getOtp')}
                </Button>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyOtp();
                }}
                className="space-y-4"
                aria-label={t('auth.verifyOtp')}
              >
                <p className="text-sm text-muted-foreground" dir="auto">
                  {t('auth.otpSent')} <span dir="ltr" className="font-medium text-foreground num">{maskMobile(normalizeDigits(phone).replace(/[^\d+]/g, ''))}</span>
                </p>
                {devMode && devCode && (
                  <div
                    role="status"
                    className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-center space-y-2"
                  >
                    <p className="text-xs text-muted-foreground leading-relaxed">{t('auth.devCodeNote')}</p>
                    <p dir="ltr" aria-label="OTP code" className="font-bold text-3xl tracking-[0.35em] num text-primary select-all">
                      {devCode}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-9"
                      onClick={() => setCode(devCode)}
                    >
                      <Wand2 className="h-4 w-4 me-2" aria-hidden="true" />
                      {t('auth.devCodeFill')}
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="code">{t('auth.otpCode')}</Label>
                  <Input
                    id="code"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="──────"
                    value={code}
                    onChange={(e) => setCode(normalizeDigits(e.target.value).replace(/\D/g, ''))}
                    required
                    autoComplete="one-time-code"
                    className="min-h-12 text-center text-xl tracking-[0.5em] num"
                  />
                </div>
                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full min-h-12 text-base" disabled={busy || code.length < 4}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  <ShieldCheck className="h-4 w-4 me-2" aria-hidden="true" />
                  {t('auth.verifyOtp')}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline disabled:opacity-50"
                    onClick={requestOtp}
                    disabled={busy || resendIn > 0}
                  >
                    {resendIn > 0 ? t('auth.resendIn').replace('{s}', String(resendIn)) : t('auth.resend')}
                  </button>
                  <button type="button" className="text-muted-foreground underline-offset-4 hover:underline" onClick={() => { setStep('phone'); setError(null); }}>
                    {t('auth.editPhone')}
                  </button>
                </div>
              </form>
            )}

            <p className="text-center text-xs text-muted-foreground">{t('auth.autoRegister')}</p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">{t('auth.demoHint')}</span></div>
            </div>
            <Button type="button" variant="outline" className="w-full min-h-11" onClick={demoLogin} disabled={busy}>
              <ShieldCheck className="h-4 w-4 me-2" />
              {t('auth.demo')}
            </Button>
            <Button type="button" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setView('landing')}>
              {t('common.back')}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
