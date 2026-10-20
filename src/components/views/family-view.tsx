'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Loader2,
  UserX,
  Copy,
  RefreshCw,
  Baby,
  CalendarDays,
  HeartPulse,
  BookOpen,
  Inbox,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Grant {
  id: string;
  partnerEmail: string;
  partnerName: string | null;
  permissions: string[];
  status: string;
  invitedAt: string;
  inviteToken: string | null;
  inviteExpiresAt: string | null;
  declinedAt: string | null;
}

interface Invite {
  id: string;
  token: string;
  granterName: string;
  permissions: string[];
  invitedAt: string;
  expiresAt: string | null;
}

interface Share {
  id: string;
  granterId: string;
  granterName: string;
  permissions: string[];
  invitedAt: string;
}

interface SharedPayload {
  granterName: string;
  permissions: string[];
  data: {
    timeline?: {
      label: string;
      dueDate: string;
      plurality: string;
      datingMethod: string;
      week: { weeks: number; days: number };
      trimester: number;
    };
    appointments?: Array<{ title: string; type: string; scheduledAt: string; provider: string | null }>;
    tracking?: Array<{ date: string; energy: number | null; mood: number | null; sleep: number | null; nausea: number | null }>;
    journal?: Array<{ title: string | null; mood: string | null; body: string; createdAt: string }>;
  };
}

const PERMS: Array<[string, string]> = [
  ['VIEW_TIMELINE', 'family.permTimeline'],
  ['VIEW_APPOINTMENTS', 'family.permAppointments'],
  ['VIEW_TRACKING', 'family.permTracking'],
  ['VIEW_JOURNAL', 'family.permJournal'],
];

function inviteLink(token: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/?invite=${token}`;
}

export function FamilyView() {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState('grants');

  const [grants, setGrants] = useState<Grant[]>([]);
  const [entitled, setEntitled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [perms, setPerms] = useState<string[]>(['VIEW_TIMELINE']);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [loadingShared, setLoadingShared] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ loading: boolean; data: SharedPayload | null }>({ loading: false, data: null });

  const load = useCallback(async () => {
    const res = await fetch('/api/family').then((r) => r.json()).catch(() => null);
    if (res) {
      setGrants(res.grants ?? []);
      setEntitled(Boolean(res.entitled));
    }
    setLoading(false);
  }, []);

  const loadShared = useCallback(async () => {
    const [inv, sh] = await Promise.all([
      fetch('/api/family/accept').then((r) => r.json()).catch(() => null),
      fetch('/api/family/shared').then((r) => r.json()).catch(() => null),
    ]);
    setInvites(inv?.invites ?? []);
    setShares(sh?.grants ?? []);
    setLoadingShared(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadShared(); }, [loadShared]);

  // Deep link: /?invite=<token> → land on the "Shared with me" tab.
  useEffect(() => {
    const inv = new URLSearchParams(window.location.search).get('invite');
    if (inv) {
      setTab('shared');
      toast({ description: t('family.pendingInvites') });
    }
  }, [t, toast]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerEmail: email, partnerName: name || undefined, permissions: perms }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmail(''); setName('');
        toast({ description: t('common.done') });
        await load();
      } else if (res.status === 402) {
        setEntitled(false);
        toast({ description: t('family.premiumNote'), variant: 'destructive' });
      } else {
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const inviteAgain = async (g: Grant) => {
    setBusy(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerEmail: g.partnerEmail,
          partnerName: g.partnerName ?? undefined,
          permissions: g.permissions,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ description: t('common.done') });
      } else if (res.status === 402) {
        setEntitled(false);
        toast({ description: t('family.premiumNote'), variant: 'destructive' });
      } else {
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    await fetch(`/api/family?id=${id}`, { method: 'PATCH' });
    await load();
  };

  const copyLink = async (token: string) => {
    const link = inviteLink(token);
    try {
      await navigator.clipboard.writeText(link);
      toast({ description: t('family.linkCopied') });
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast({ description: t('family.linkCopied') });
    }
  };

  const decide = async (inv: Invite, decision: 'ACCEPT' | 'DECLINE') => {
    setBusyId(inv.id);
    try {
      const res = await fetch('/api/family/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inv.token, decision }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast({ description: t(decision === 'ACCEPT' ? 'family.accepted' : 'family.declinedOk') });
      } else if (res.status === 403 && data?.error?.code === 'EMAIL_MISMATCH') {
        toast({ description: t('family.emailMismatch'), variant: 'destructive' });
      } else if (res.status === 400 && data?.error?.code === 'INVITE_EXPIRED') {
        toast({ description: t('family.expired'), variant: 'destructive' });
      } else {
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
      await loadShared();
    } finally {
      setBusyId(null);
    }
  };

  const toggleViewer = async (s: Share) => {
    if (openId === s.id) {
      setOpenId(null);
      setViewer({ loading: false, data: null });
      return;
    }
    setOpenId(s.id);
    setViewer({ loading: true, data: null });
    const res = await fetch(`/api/family/shared?granterId=${s.granterId}`).catch(() => null);
    const data = res && res.ok ? await res.json().catch(() => null) : null;
    setViewer({ loading: false, data });
  };

  const fmtDate = useCallback(
    (d: string | Date, withTime = false) =>
      new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
        dateStyle: 'medium',
        ...(withTime ? { timeStyle: 'short' } : {}),
      }).format(new Date(d)),
    [locale]
  );

  const statusBadge = (s: string) => {
    if (s === 'ACTIVE') return <Badge>{t('family.active')}</Badge>;
    if (s === 'INVITED') return <Badge variant="secondary">{t('family.invited')}</Badge>;
    if (s === 'DECLINED') return <Badge variant="outline" className="text-muted-foreground">{t('family.declined')}</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">{t('family.revoked')}</Badge>;
  };

  const permChips = (list: string[]) => (
    <div className="flex flex-wrap gap-1" aria-label={t('family.permissions')}>
      {list.map((p) => (
        <Badge key={p} variant="secondary" className="text-[10px]">
          {t(PERMS.find(([k]) => k === p)?.[1] ?? p)}
        </Badge>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t('family.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('family.sub')}</p>
      </header>

      {!entitled && (
        <Card className="niva-card border-warning/40">
          <CardContent className="p-4 text-sm leading-relaxed">{t('family.premiumNote')}</CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger value="grants" className="min-h-9">{t('family.tabGrants')}</TabsTrigger>
          <TabsTrigger value="shared" className="min-h-9">
            {t('family.tabShared')}
            {invites.length > 0 && (
              <Badge className="ms-2 h-5 px-1.5 text-[10px]" aria-label={t('family.pendingInvites')}>{invites.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: my outgoing grants ─────────────────────────────────── */}
        <TabsContent value="grants" className="space-y-4">
          <Card className="niva-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">{t('family.invite')}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={invite} className="grid sm:grid-cols-2 gap-3" aria-label={t('family.invite')}>
                <div className="space-y-1.5">
                  <Label htmlFor="f-email">{t('family.email')}</Label>
                  <Input id="f-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required className="min-h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-name">{t('family.name')}</Label>
                  <Input id="f-name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('family.permissions')}</Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {PERMS.map(([perm, key]) => (
                      <Label key={perm} className="flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 min-h-11">
                        <Checkbox
                          checked={perms.includes(perm)}
                          onCheckedChange={(v) => setPerms((p) => (v ? [...p, perm] : p.filter((x) => x !== perm)))}
                        />
                        <span className="text-sm">{t(key)}</span>
                      </Label>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={busy || !entitled || perms.length === 0} className="min-h-11">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('family.invite')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {loading ? <Skeleton className="h-32 w-full" /> : grants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
          ) : (
            <div className="space-y-2">
              {grants.map((g) => (
                <Card key={g.id} className="niva-card">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{g.partnerName || g.partnerEmail}</p>
                        <p className="text-xs text-muted-foreground truncate" dir="ltr">{g.partnerEmail}</p>
                      </div>
                      {statusBadge(g.status)}
                      {g.status === 'ACTIVE' && (
                        <Button variant="ghost" size="sm" onClick={() => revoke(g.id)} className="text-destructive min-h-9">
                          <UserX className="h-4 w-4 me-1" />{t('family.revoke')}
                        </Button>
                      )}
                      {g.status === 'INVITED' && (
                        <Button variant="ghost" size="sm" onClick={() => revoke(g.id)} className="text-destructive min-h-9">
                          <UserX className="h-4 w-4 me-1" />{t('family.revoke')}
                        </Button>
                      )}
                    </div>

                    {permChips(g.permissions)}

                    {g.status === 'ACTIVE' && (
                      <p className="text-xs text-muted-foreground">{t('family.grantActiveNote')}</p>
                    )}

                    {g.status === 'INVITED' && g.inviteToken && (
                      <div className="space-y-1.5">
                        <Label htmlFor={`f-link-${g.id}`} className="text-xs">{t('family.inviteLink')}</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`f-link-${g.id}`}
                            readOnly
                            dir="ltr"
                            value={inviteLink(g.inviteToken)}
                            onFocus={(e) => e.currentTarget.select()}
                            className="min-h-11 text-xs"
                          />
                          <Button variant="outline" size="sm" onClick={() => copyLink(g.inviteToken as string)} className="min-h-11 shrink-0">
                            <Copy className="h-4 w-4 me-1" />{t('family.copyLink')}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('family.linkNote')}</p>
                      </div>
                    )}

                    {g.status !== 'ACTIVE' && (
                      <div>
                        <Button variant="outline" size="sm" onClick={() => inviteAgain(g)} disabled={busy || !entitled} className="min-h-11">
                          <RefreshCw className="h-4 w-4 me-1" />{t('family.inviteAgain')}
                        </Button>
                        {g.status === 'INVITED' && g.inviteExpiresAt && (
                          <span className="ms-3 text-xs text-muted-foreground">{fmtDate(g.inviteExpiresAt)}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab 2: shared with me ─────────────────────────────────────── */}
        <TabsContent value="shared" className="space-y-4">
          {loadingShared ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              {invites.length > 0 && (
                <section aria-label={t('family.pendingInvites')} className="space-y-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-primary" />{t('family.pendingInvites')}
                  </h2>
                  {invites.map((inv) => (
                    <Card key={inv.id} className="niva-card">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm min-w-0 truncate">{inv.granterName}</p>
                          <span className="text-xs text-muted-foreground">{fmtDate(inv.invitedAt)}</span>
                        </div>
                        {permChips(inv.permissions)}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => decide(inv, 'ACCEPT')} disabled={busyId !== null} className="min-h-11">
                            {busyId === inv.id && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('family.accept')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => decide(inv, 'DECLINE')} disabled={busyId !== null} className="min-h-11">
                            {t('family.decline')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </section>
              )}

              <section aria-label={t('family.sharedBy')} className="space-y-2">
                <h2 className="text-sm font-semibold">{t('family.sharedBy')}</h2>
                {shares.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('family.noShared')}</p>
                ) : (
                  shares.map((s) => {
                    const expanded = openId === s.id;
                    const d = viewer.data;
                    const panels = expanded && d
                      ? [
                          { key: 'VIEW_TIMELINE', show: Boolean(d.data.timeline) },
                          { key: 'VIEW_APPOINTMENTS', show: Boolean(d.data.appointments && d.data.appointments.length > 0) },
                          { key: 'VIEW_TRACKING', show: Boolean(d.data.tracking && d.data.tracking.length > 0) },
                          { key: 'VIEW_JOURNAL', show: Boolean(d.data.journal && d.data.journal.length > 0) },
                        ]
                      : [];
                    const grantedPanels = panels.filter((p) => s.permissions.includes(p.key) && p.show);
                    return (
                      <Card key={s.id} className="niva-card">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-sm min-w-0 truncate">
                              <span className="text-muted-foreground">{t('family.sharedBy')}: </span>{s.granterName}
                            </p>
                            <span className="text-xs text-muted-foreground ms-auto">{fmtDate(s.invitedAt)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">{t('family.viewWhat')}:</span>
                            {s.permissions.map((p) => (
                              <Badge key={p} variant="secondary" className="text-[10px]">
                                {t(PERMS.find(([k]) => k === p)?.[1] ?? p)}
                              </Badge>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => toggleViewer(s)} className="min-h-11" aria-expanded={expanded}>
                            {expanded ? <ChevronUp className="h-4 w-4 me-1" /> : <ChevronDown className="h-4 w-4 me-1" />}
                            {t('family.openViewer')}
                          </Button>

                          {expanded && (
                            <div className="rounded-lg border bg-muted/20 p-3 space-y-4 max-h-96 overflow-y-auto">
                              {viewer.loading && <Skeleton className="h-24 w-full" />}
                              {!viewer.loading && (!viewer.data || grantedPanels.length === 0) && (
                                <p className="text-sm text-muted-foreground">{t('family.noData')}</p>
                              )}

                              {!viewer.loading && d && s.permissions.includes('VIEW_TIMELINE') && d.data.timeline && (
                                <div className="space-y-1.5" aria-label={t('family.viewerTimeline')}>
                                  <p className="text-xs font-semibold flex items-center gap-1.5">
                                    <Baby className="h-3.5 w-3.5 text-primary" />{t('family.viewerTimeline')}
                                  </p>
                                  <p className="text-sm font-medium">{d.data.timeline.label}</p>
                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <Badge variant="secondary">
                                      {t('common.week')} {d.data.timeline.week.weeks}+{d.data.timeline.week.days}
                                    </Badge>
                                    <Badge variant="secondary">{t('dash.trimester')} {d.data.timeline.trimester}</Badge>
                                    <span dir="auto">{fmtDate(d.data.timeline.dueDate)}</span>
                                  </div>
                                </div>
                              )}

                              {!viewer.loading && d && s.permissions.includes('VIEW_APPOINTMENTS') && d.data.appointments && d.data.appointments.length > 0 && (
                                <div className="space-y-1.5" aria-label={t('family.viewerAppointments')}>
                                  <p className="text-xs font-semibold flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5 text-primary" />{t('family.viewerAppointments')}
                                  </p>
                                  <ul className="space-y-1.5">
                                    {d.data.appointments.map((a, i) => (
                                      <li key={i} className="text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="font-medium">{a.title}</span>
                                        <span dir="auto">{fmtDate(a.scheduledAt, true)}</span>
                                        {a.provider && <span className="text-muted-foreground">{a.provider}</span>}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {!viewer.loading && d && s.permissions.includes('VIEW_TRACKING') && d.data.tracking && d.data.tracking.length > 0 && (
                                <div className="space-y-1.5" aria-label={t('family.viewerTracking')}>
                                  <p className="text-xs font-semibold flex items-center gap-1.5">
                                    <HeartPulse className="h-3.5 w-3.5 text-primary" />{t('family.viewerTracking')}
                                  </p>
                                  <div className="grid grid-cols-4 gap-1 text-[11px]" role="table" aria-label={t('family.viewerTracking')}>
                                    <span className="font-semibold text-muted-foreground">{t('track.date')}</span>
                                    <span className="font-semibold text-muted-foreground">{t('track.energy')}</span>
                                    <span className="font-semibold text-muted-foreground">{t('track.mood')}</span>
                                    <span className="font-semibold text-muted-foreground">{t('track.sleepQ')}</span>
                                    {d.data.tracking.map((r, i) => (
                                      <div key={i} className="col-span-4 grid grid-cols-4 gap-1">
                                        <span dir="auto">{fmtDate(r.date)}</span>
                                        <span>{r.energy ?? '—'}</span>
                                        <span>{r.mood ?? '—'}</span>
                                        <span>{r.sleep ?? '—'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {!viewer.loading && d && s.permissions.includes('VIEW_JOURNAL') && d.data.journal && d.data.journal.length > 0 && (
                                <div className="space-y-2" aria-label={t('family.viewerJournal')}>
                                  <p className="text-xs font-semibold flex items-center gap-1.5">
                                    <BookOpen className="h-3.5 w-3.5 text-primary" />{t('family.viewerJournal')}
                                  </p>
                                  <ul className="space-y-2">
                                    {d.data.journal.map((j, i) => (
                                      <li key={i} className="text-xs space-y-1 border-b pb-2 last:border-b-0 last:pb-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-medium">{j.title || t('family.viewerJournal')}</span>
                                          {j.mood && <Badge variant="outline" className="text-[10px]">{j.mood}</Badge>}
                                          <span className="text-muted-foreground" dir="auto">{fmtDate(j.createdAt)}</span>
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-4">{j.body}</p>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </section>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
