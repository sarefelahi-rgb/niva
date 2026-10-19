'use client';

import { useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck } from 'lucide-react';
import { setToken } from '@/lib/auth-token';

type Mode = 'login' | 'register';

export function AuthView() {
  const { t, refresh, setView, locale } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email, password } : { name, email, password, acceptedTerms: accepted, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? t('common.error'));
        return;
      }
      // Persist the session token so auth also works in embedding contexts
      // where cookies are unavailable (e.g. preview-panel iframes).
      if (data.token) setToken(data.token);
      await refresh();
      // Login lands on the dashboard; newly registered users go to onboarding.
      setView(mode === 'login' ? 'dashboard' : 'onboarding');
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
            <CardTitle className="text-2xl">
              {mode === 'login' ? t('auth.welcomeBack') : t('auth.createTitle')}
            </CardTitle>
            <CardDescription>{t('app.tagline')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submit} className="space-y-4" aria-label={mode === 'login' ? t('auth.signIn') : t('auth.signUp')}>
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name">{t('auth.name')}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" className="min-h-11" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="min-h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input id="password" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="min-h-11" />
                {mode === 'register' && <p className="text-xs text-muted-foreground">{t('auth.passwordHint')}</p>}
              </div>
              {mode === 'register' && (
                <label className="flex items-start gap-2.5 text-xs leading-relaxed cursor-pointer">
                  <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} required className="mt-0.5" />
                  <span>{t('auth.terms')}</span>
                </label>
              )}
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full min-h-12 text-base" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
              </Button>
            </form>

            <div className="text-center text-sm">
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
              >
                {mode === 'login' ? t('auth.needAccount') : t('auth.haveAccount')}
              </button>
            </div>

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
