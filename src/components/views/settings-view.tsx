'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { Settings, Download, Trash2, Languages, Sun, Moon, Monitor, RotateCcw, LogOut, KeyRound, MonitorSmartphone, Loader2 } from 'lucide-react';

interface SessionRow { id: string; createdAt: string; expiresAt: string; current: boolean }

export function SettingsView() {
  const { t, locale, setLocale, user, logout, openTour } = useApp();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [familyAck, setFamilyAck] = useState(true);
  const [busy, setBusy] = useState(false);

  // Password change state
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Sessions state
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/privacy/consent').then(async (r) => {
      const d = await r.json();
      if (d.consent) {
        setAnalytics(Boolean(d.consent.healthAnalytics));
        setMarketing(Boolean(d.consent.marketing));
        setFamilyAck(Boolean(d.consent.familySharingAck));
      }
    }).catch(() => undefined);
  }, []);

  const saveConsent = useCallback(async (patch: Record<string, boolean>) => {
    await fetch('/api/privacy/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  }, []);

  const exportData = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/privacy/export');
      if (res.status === 402) {
        toast({ description: t('sub.features.export'), variant: 'destructive' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'niva-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast({ description: t('common.done') });
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await fetch('/api/privacy/delete', { method: 'POST' });
      toast({ description: t('common.done') });
      await logout();
    } finally {
      setBusy(false);
    }
  };

  const signOutAll = async () => {
    await fetch('/api/auth/logout-all', { method: 'POST' });
    await logout();
  };

  const loadSessions = async () => {
    setSessions(null);
    try {
      const r = await fetch('/api/auth/sessions');
      const d = await r.json();
      setSessions(Array.isArray(d.sessions) ? d.sessions : []);
    } catch {
      setSessions([]);
    }
  };

  const revokeSession = async (id: string) => {
    setRevokeId(id);
    try {
      const r = await fetch(`/api/auth/sessions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (r.ok) {
        setSessions((s) => (s ?? []).filter((x) => x.id !== id));
        toast({ description: t('common.done') });
      } else {
        toast({ description: t('common.error'), variant: 'destructive' });
      }
    } finally {
      setRevokeId(null);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwBusy(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPwError(data?.error?.message ?? t('common.error'));
        return;
      }
      setPwOpen(false);
      setCurrentPw('');
      setNewPw('');
      toast({ description: t('settings.passwordChanged') });
    } catch {
      setPwError(t('common.error'));
    } finally {
      setPwBusy(false);
    }
  };

  const themeOptions = [
    ['light', Sun], ['dark', Moon], ['system', Monitor],
  ] as const;

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-primary" />{t('settings.title')}</h1>
      </header>

      <Card className="niva-card">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Languages className="h-4 w-4" />{t('settings.language')}</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Button variant={locale === 'fa' ? 'default' : 'outline'} onClick={() => { setLocale('fa'); saveConsent({}); }} className="min-h-11">فارسی (RTL)</Button>
          <Button variant={locale === 'en' ? 'default' : 'outline'} onClick={() => { setLocale('en'); saveConsent({}); }} className="min-h-11">English (LTR)</Button>
        </CardContent>
      </Card>

      <Card className="niva-card">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sun className="h-4 w-4" />{t('settings.theme')}</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          {themeOptions.map(([v, Icon]) => (
            <Button
              key={v}
              variant={(theme ?? 'system') === v ? 'default' : 'outline'}
              onClick={() => setTheme(v)}
              className="min-h-11 flex-1"
              aria-pressed={(theme ?? 'system') === v}
            >
              <Icon className="h-4 w-4 me-1.5" />{t(`settings.${v}`)}
            </Button>
          ))}
          {resolvedTheme && <span className="sr-only">{resolvedTheme}</span>}
        </CardContent>
      </Card>

      <Card className="niva-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">{t('settings.consent')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="c-analytics" className="text-sm leading-relaxed">{t('settings.consentAnalytics')}</Label>
            <Switch id="c-analytics" checked={analytics} onCheckedChange={(v) => { setAnalytics(v); saveConsent({ healthAnalytics: v }); }} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="c-marketing" className="text-sm leading-relaxed">{t('settings.consentMarketing')}</Label>
            <Switch id="c-marketing" checked={marketing} onCheckedChange={(v) => { setMarketing(v); saveConsent({ marketing: v }); }} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="c-family" className="text-sm leading-relaxed">{t('settings.consentFamily')}</Label>
            <Switch id="c-family" checked={familyAck} onCheckedChange={(v) => { setFamilyAck(v); saveConsent({ familySharingAck: v }); }} />
          </div>
        </CardContent>
      </Card>

      <Card className="niva-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">{t('settings.security')}</CardTitle></CardHeader>
        <CardContent className="space-y-2.5">
          {/* Password change with re-authentication */}
          <Dialog open={pwOpen} onOpenChange={(o) => { setPwOpen(o); if (o) { setPwError(null); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="min-h-11 w-full justify-start"><KeyRound className="h-4 w-4 me-2" />{t('settings.password')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('settings.password')}</DialogTitle>
                <DialogDescription>{t('settings.passwordHint')}</DialogDescription>
              </DialogHeader>
              <form onSubmit={changePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cur-pw">{t('settings.passwordCurrent')}</Label>
                  <Input id="cur-pw" type="password" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required className="min-h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pw">{t('settings.passwordNew')}</Label>
                  <Input id="new-pw" type="password" autoComplete="new-password" minLength={8} value={newPw} onChange={(e) => setNewPw(e.target.value)} required className="min-h-11" />
                  <p className="text-xs text-muted-foreground">{t('settings.passwordRule')}</p>
                </div>
                {pwError && <p className="text-sm text-destructive" role="alert">{pwError}</p>}
                <Button type="submit" disabled={pwBusy} className="w-full min-h-11">
                  {pwBusy && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
                  {t('settings.passwordChange')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Active sessions list + per-session revoke */}
          <Dialog open={sessionsOpen} onOpenChange={(o) => { setSessionsOpen(o); if (o) loadSessions(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="min-h-11 w-full justify-start"><MonitorSmartphone className="h-4 w-4 me-2" />{t('settings.activeSessions')}</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('settings.activeSessions')}</DialogTitle>
                <DialogDescription>{t('settings.sessionsHint')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2.5">
                {sessions === null ? (
                  <><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
                ) : sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                    <div className="min-w-0 text-sm">
                      <p className="num">{new Date(s.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</p>
                      <p className="text-xs text-muted-foreground num">{t('settings.sessionExpires')}: {new Date(s.expiresAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</p>
                    </div>
                    {s.current ? (
                      <Badge variant="secondary">{t('settings.currentSession')}</Badge>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => revokeSession(s.id)} disabled={revokeId === s.id} className="min-h-11">
                        {revokeId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.revoke')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => openTour()} className="min-h-11 w-full justify-start">
            <RotateCcw className="h-4 w-4 me-2" />{t('settings.tour')}
          </Button>
          <Button variant="outline" onClick={exportData} disabled={busy} className="min-h-11 w-full justify-start">
            <Download className="h-4 w-4 me-2" />{t('settings.export')}
          </Button>
          <Button variant="outline" onClick={signOutAll} className="min-h-11 w-full justify-start">
            <LogOut className="h-4 w-4 me-2" />{t('settings.sessions')}
          </Button>
          {user?.role === 'USER' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="min-h-11 w-full justify-start">
                  <Trash2 className="h-4 w-4 me-2" />{t('settings.deleteAccount')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('settings.deleteAccount')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('settings.deleteWarn')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-white">{t('common.confirm')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
