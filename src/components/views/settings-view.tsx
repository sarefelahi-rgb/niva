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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatMessage } from '@/lib/icu';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { Settings, Download, Trash2, Languages, Sun, Moon, Monitor, RotateCcw, LogOut, KeyRound, MonitorSmartphone, Loader2, Bell, ShieldCheck, LifeBuoy, Send, ChevronLeft, ChevronRight } from 'lucide-react';

interface SessionRow { id: string; createdAt: string; expiresAt: string; current: boolean }

// Wave 7 — user-facing support tickets (mirrors GET/POST /api/tickets shapes).
interface TicketRow {
  id: string; subject: string; category: string; status: string;
  priority: string; createdAt: string; updatedAt: string; messagesCount: number;
}
interface TicketMessage { id: string; body: string; isStaff: boolean; createdAt: string; authorName?: string }
interface TicketDetail extends Omit<TicketRow, 'messagesCount'> {
  messages: TicketMessage[];
}

const TICKET_CATEGORIES = ['BILLING', 'CLINICAL', 'TECHNICAL', 'PRIVACY', 'OTHER'] as const;
const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'outline'> = {
  OPEN: 'default',
  IN_PROGRESS: 'secondary',
  RESOLVED: 'outline',
  CLOSED: 'outline',
};

export function SettingsView() {
  const { t, locale, setLocale, user, logout, openTour } = useApp();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [familyAck, setFamilyAck] = useState(true);
  const [busy, setBusy] = useState(false);

  // Wave 6.4: age-verification chip + notice versions from the consent row.
  // birthYear itself is deliberately NOT surfaced in the UI (data minimization).
  const [ageConfirmedAt, setAgeConfirmedAt] = useState<string | null>(null);
  const [noticeVersions, setNoticeVersions] = useState<{ terms: string; privacy: string } | null>(null);

  // Notification channel preferences (email is consent-gated; in-app is always on)
  const [notifEmail, setNotifEmail] = useState(false);
  const [emailTransport, setEmailTransport] = useState(false);
  const [notifLoaded, setNotifLoaded] = useState(false);

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

  // Wave 7 — support tickets state
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newBody, setNewBody] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  useEffect(() => {
    fetch('/api/privacy/consent').then(async (r) => {
      const d = await r.json();
      if (d.consent) {
        setAnalytics(Boolean(d.consent.healthAnalytics));
        setMarketing(Boolean(d.consent.marketing));
        setFamilyAck(Boolean(d.consent.familySharingAck));
        setAgeConfirmedAt(d.consent.ageConfirmedAt ?? null);
        setNoticeVersions({ terms: String(d.consent.termsVersion ?? '1.0'), privacy: String(d.consent.privacyVersion ?? '1.0') });
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch('/api/notifications/preferences').then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        setNotifEmail(Boolean(d.emailReminders));
        setEmailTransport(Boolean(d.emailTransportConfigured));
      }
    }).catch(() => undefined).finally(() => setNotifLoaded(true));
  }, []);

  const saveConsent = useCallback(async (patch: Record<string, boolean>) => {
    await fetch('/api/privacy/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  }, []);

  const saveNotifPrefs = async (v: boolean) => {
    setNotifEmail(v);
    try {
      const r = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailReminders: v }),
      });
      if (!r.ok) throw new Error('request failed');
      const d = await r.json();
      setNotifEmail(Boolean(d.emailReminders));
      setEmailTransport(Boolean(d.emailTransportConfigured));
      toast({ description: t('common.done') });
    } catch {
      setNotifEmail(!v);
      toast({ description: t('common.error'), variant: 'destructive' });
    }
  };

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

  // ---- Wave 7 — support tickets --------------------------------------

  const loadTickets = useCallback(async () => {
    setTickets(null);
    setDetail(null);
    try {
      const r = await fetch('/api/tickets', { cache: 'no-store' });
      const d = await r.json();
      setTickets(Array.isArray(d.tickets) ? d.tickets : []);
    } catch {
      setTickets([]);
    }
  }, []);

  const openTicket = async (id: string) => {
    setDetail(null);
    try {
      const r = await fetch(`/api/tickets/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('failed');
      const d = await r.json();
      setDetail(d.ticket ?? null);
    } catch {
      toast({ description: t('common.error'), variant: 'destructive' });
    }
  };

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateBusy(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject.trim(), body: newBody.trim(), category: newCategory }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setCreateError(data?.error?.message ?? t('common.error'));
        return;
      }
      setCreateOpen(false);
      setNewSubject('');
      setNewCategory('');
      setNewBody('');
      toast({ description: t('support.sent') });
      if (ticketsOpen) await loadTickets();
    } catch {
      setCreateError(t('common.error'));
    } finally {
      setCreateBusy(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setReplyBusy(true);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(detail.id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
        return;
      }
      setDetail((d) =>
        d
          ? {
              ...d,
              messages: [
                ...d.messages,
                { ...data.message, authorName: t('support.you') },
              ],
            }
          : d,
      );
      setReply('');
      toast({ description: t('support.replySent') });
    } catch {
      toast({ description: t('common.error'), variant: 'destructive' });
    } finally {
      setReplyBusy(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US');

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
          <Separator />
          {/* Wave 6.4 age-verification chip + notice versions (inline bilingual — i18n.ts not owned this wave) */}
          <div className="flex flex-wrap items-center gap-2">
            {ageConfirmedAt ? (
              <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {locale === 'fa' ? 'سن تأیید شده: ۱۳+' : 'Age verified: 13+'}
                <span className="num text-muted-foreground">· {new Date(ageConfirmedAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {locale === 'fa' ? 'سن تأیید نشده' : 'Age not verified'}
              </Badge>
            )}
            {noticeVersions && (
              <Badge variant="secondary" className="num">
                {locale === 'fa'
                  ? `قوانین ${noticeVersions.terms} · حریم خصوصی ${noticeVersions.privacy}`
                  : `Terms ${noticeVersions.terms} · Privacy ${noticeVersions.privacy}`}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="niva-card">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />{t('settings.notifPrefs')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{t('settings.notifInApp')}</p>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="c-notif-email" className="text-sm leading-relaxed">{t('settings.notifEmail')}</Label>
            <Switch id="c-notif-email" checked={notifEmail} disabled={!notifLoaded} onCheckedChange={(v) => void saveNotifPrefs(v)} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.notifEmailHint')}</p>
          {notifEmail && !emailTransport && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{t('notifs.emailPending')}</p>
          )}
        </CardContent>
      </Card>

      {/* Wave 7 — user-facing support tickets (real /api/tickets flow) */}
      <Card className="niva-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><LifeBuoy className="h-4 w-4" />{t('support.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{t('support.subtitle')}</p>

          {/* New ticket dialog */}
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (o) setCreateError(null); }}>
            <DialogTrigger asChild>
              <Button className="min-h-11 w-full justify-start" onClick={() => { setNewSubject(''); setNewCategory(''); setNewBody(''); }}>
                <Send className="h-4 w-4 me-2" />{t('support.contact')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('support.contact')}</DialogTitle>
                <DialogDescription>{t('support.subtitle')}</DialogDescription>
              </DialogHeader>
              <form onSubmit={submitTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tk-subject">{t('support.subject')}</Label>
                  <Input
                    id="tk-subject"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder={t('support.subjectPh')}
                    minLength={4}
                    maxLength={140}
                    required
                    className="min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tk-category">{t('support.category')}</Label>
                  <Select value={newCategory} onValueChange={setNewCategory} required>
                    <SelectTrigger id="tk-category" className="min-h-11 w-full">
                      <SelectValue placeholder={t('support.category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{t(`support.cat.${c}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tk-body">{t('support.message')}</Label>
                  <Textarea
                    id="tk-body"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder={t('support.messagePh')}
                    minLength={10}
                    maxLength={4000}
                    rows={5}
                    required
                    className="min-h-24"
                  />
                </div>
                {createError && <p className="text-sm text-destructive" role="alert">{createError}</p>}
                <Button type="submit" disabled={createBusy || !newCategory} className="w-full min-h-11">
                  {createBusy ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Send className="h-4 w-4 me-1.5" />}
                  {t('support.send')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* My tickets: list ↔ conversation */}
          <Dialog open={ticketsOpen} onOpenChange={(o) => { setTicketsOpen(o); if (o) loadTickets(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="min-h-11 w-full justify-start">
                <LifeBuoy className="h-4 w-4 me-2" />{t('support.myTickets')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detail && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label={t('support.backToList')}
                      onClick={() => setDetail(null)}
                    >
                      {locale === 'fa' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                  )}
                  <span className="truncate">{detail ? detail.subject : t('support.myTickets')}</span>
                </DialogTitle>
                {!detail ? (
                  <DialogDescription>{t('support.subtitle')}</DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">{t('support.subtitle')}</DialogDescription>
                )}
              </DialogHeader>

              {!detail ? (
                <div className="space-y-2.5">
                  {tickets === null ? (
                    <><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></>
                  ) : tickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('support.empty')}</p>
                  ) : (
                    tickets.map((tk) => (
                      <button
                        key={tk.id}
                        type="button"
                        onClick={() => openTicket(tk.id)}
                        className="w-full text-start rounded-xl border p-3 hover:bg-accent/50 transition-colors focus-visible:outline-2 focus-visible:outline-primary min-h-11"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{tk.subject}</p>
                          <Badge variant={STATUS_BADGE[tk.status] ?? 'outline'}>
                            {t(`support.status.${tk.status}`)}
                          </Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground num">
                          <span>{t(`support.cat.${tk.category}`)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatMessage(locale, t('support.msgOther'), { n: tk.messagesCount })}</span>
                          <span aria-hidden="true">·</span>
                          <span>{fmtDate(tk.updatedAt)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_BADGE[detail.status] ?? 'outline'}>
                      {t(`support.status.${detail.status}`)}
                    </Badge>
                    <Badge variant="secondary">{t(`support.cat.${detail.category}`)}</Badge>
                    <span className="text-xs text-muted-foreground num ms-auto">{fmtDate(detail.createdAt)}</span>
                  </div>

                  {/* Conversation thread — bounded height with scroll */}
                  <div className="max-h-96 overflow-y-auto space-y-2.5 rounded-xl border bg-muted/30 p-3">
                    {detail.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-lg border p-2.5 ${m.isStaff ? 'bg-primary/5 border-primary/25' : 'bg-background'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-xs font-medium ${m.isStaff ? 'text-primary' : ''}`}>
                            {m.isStaff ? t('support.staff') : t('support.you')}
                          </span>
                          <span className="text-[10px] text-muted-foreground num">
                            {new Date(m.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                      </div>
                    ))}
                  </div>

                  {detail.status === 'CLOSED' ? (
                    <p className="text-sm text-muted-foreground">{t('support.closedNote')}</p>
                  ) : (
                    <form onSubmit={sendReply} className="space-y-2">
                      <Label htmlFor="tk-reply">{t('support.replyLabel')}</Label>
                      <Textarea
                        id="tk-reply"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder={t('support.replyPh')}
                        maxLength={4000}
                        rows={3}
                        required
                        className="min-h-20"
                      />
                      <Button type="submit" disabled={replyBusy || reply.trim().length === 0} className="min-h-11">
                        {replyBusy ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Send className="h-4 w-4 me-1.5" />}
                        {t('support.replySend')}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
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
