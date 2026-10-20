'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShieldCheck, CheckCircle2, Users, Activity, Coins, ToggleLeft, Sparkles, Gavel, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

/** Must match AUTO_REPORT_NOTE written by /api/community (localized via mod.autoFlagNote). */
const AUTO_REPORT_NOTE = 'Auto-queued after repeated reports';

interface Overview {
  users: number; pregnancies: number; contentPending: number; postsPending: number; safetyOpen: number;
  aiMessages: number; aiEmergencyEscalations: number;
  safetyRecent: Array<{ id: string; type: string; severity: string; detail: string; createdAt: string }>;
  assets: Array<{ assetId: string; stage: number; reviewStatus: string; publicationStatus: string }>;
  safetySmoke: Array<{ phrase: string; expectEmergency: boolean; actual: string }>;
}
interface UserRow { id: string; email: string; name: string; role: string; locale: string; plan: string; createdAt: string }
interface AuditRow { id: string; action: string; entity: string; entityId: string | null; actor: { name: string; email: string } | null; createdAt: string }
interface FinanceRow { id: string; plan: string; amount: number; currency: string; status: string; user: string; createdAt: string }
interface Flags { community: boolean; family: boolean; studio: boolean; ar: boolean }
interface ModPost {
  id: string; authorAlias: string; topic: string; body: string; language: string; status: string;
  flagCount: number; moderationNote: string | null; createdAt: string;
  author: { email: string; name: string | null };
}
interface ModActionRow { id: string; action: string; reason: string | null; createdAt: string; moderator: { email: string } | null; post: { authorAlias: string } | null }
interface ModData { queue: ModPost[]; recent: ModActionRow[]; counts: { pending: number; todayDecisions: number } }
interface TickResult { materialized: number; remindersCreated: number; apptRemindersCreated: number; pendingScheduled: number; emailTransportConfigured: boolean; at: string }

export function AdminView() {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [finance, setFinance] = useState<{ revenueByPlan: Record<string, number>; payments: FinanceRow[] } | null>(null);
  const [flags, setFlags] = useState<Flags>({ community: true, family: true, studio: true, ar: true });
  const [mod, setMod] = useState<ModData | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState<TickResult | null>(null);
  const [tickBusy, setTickBusy] = useState(false);

  const load = useCallback(async () => {
    const [o, u, a, f, fl, m] = await Promise.all([
      fetch('/api/admin/overview').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/users').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/audit').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/finance').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/flags').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/moderation').then((r) => r.json()).catch(() => null),
    ]);
    if (o) setOverview(o);
    if (u) setUsers(u.users ?? []);
    if (a) setAudit(a.events ?? []);
    if (f) setFinance(f);
    if (fl?.flags) setFlags(fl.flags);
    if (m?.queue) setMod(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => { void load(); });
    return () => cancelAnimationFrame(id);
  }, [load]);

  const toggleFlag = async (key: keyof Flags, value: boolean) => {
    setFlags((p) => ({ ...p, [key]: value }));
    await fetch('/api/admin/flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ flags: { [key]: value } }) });
  };

  const resolveSafety = async (id: string) => {
    await fetch('/api/admin/safety', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    await load();
  };

  const runSchedulerTick = async () => {
    setTickBusy(true);
    try {
      const r = await fetch('/api/scheduler/tick', { method: 'POST' });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.ok) {
        setTick({ ...d, at: new Date().toISOString() });
        toast({ description: t('admin.schedulerRan').replace('{n}', String(d.materialized ?? 0)) });
      } else {
        toast({ description: d?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setTickBusy(false);
    }
  };

  const decide = async (postId: string, action: 'APPROVE' | 'REJECT' | 'REMOVE') => {
    setBusyId(postId);
    try {
      const note = reasons[postId]?.trim();
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action, ...(note ? { note } : {}) }),
      });
      if (res.ok) {
        toast({ description: t('mod.decided') });
        setReasons((prev) => { const next = { ...prev }; delete next[postId]; return next; });
        await load();
      } else {
        const data = await res.json().catch(() => null);
        toast({ description: data?.error?.message ?? t('err.validation'), variant: 'destructive' });
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />{t('admin.title')}</h1>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 min-h-11">
          <TabsTrigger value="overview">{t('admin.overview')}</TabsTrigger>
          <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
          <TabsTrigger value="safety">{t('admin.safety')}</TabsTrigger>
          <TabsTrigger value="moderation">{t('mod.tab')}</TabsTrigger>
          <TabsTrigger value="audit">{t('admin.audit')}</TabsTrigger>
          <TabsTrigger value="finance">{t('admin.finance')}</TabsTrigger>
          <TabsTrigger value="flags">{t('admin.flags')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={Users} label={t('admin.users')} value={overview?.users ?? 0} />
            <Stat icon={Activity} label={locale === 'fa' ? 'بارداری فعال' : 'Active pregnancies'} value={overview?.pregnancies ?? 0} />
            <Stat icon={CheckCircle2} label={locale === 'fa' ? 'در انتظار بازبینی' : 'Pending review'} value={overview?.contentPending ?? 0} />
            <Stat icon={Sparkles} label={t('admin.aiQuality')} value={overview?.aiMessages ?? 0} />
          </div>
          <Card className="niva-card">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{t('admin.scheduler')}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary" className="num">{tick ? tick.pendingScheduled : '—'}</Badge>
                <span className="text-muted-foreground">{t('admin.schedulerPending')}</span>
              </div>
              {tick && (
                <p className="text-xs text-muted-foreground">
                  {locale === 'fa' ? 'آخرین تیک' : 'Last tick'}: <span className="num">{new Date(tick.at).toLocaleTimeString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
                  {' · '}{locale === 'fa' ? 'رسانده‌شده' : 'materialized'}: <span className="num">{tick.materialized}</span>
                  {' · '}{locale === 'fa' ? 'یادآور' : 'reminders'}: <span className="num">{tick.remindersCreated}</span>
                  {' · '}{locale === 'fa' ? 'نوبت' : 'appointments'}: <span className="num">{tick.apptRemindersCreated}</span>
                </p>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Button size="sm" className="min-h-11" onClick={() => void runSchedulerTick()} disabled={tickBusy}>
                  {tickBusy && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
                  {t('admin.schedulerRun')}
                </Button>
                <p className="text-xs text-muted-foreground">{t('admin.schedulerNote')}</p>
              </div>
              {tick && !tick.emailTransportConfigured && (
                <p className="text-xs text-muted-foreground">{t('notifs.emailPending')}</p>
              )}
            </CardContent>
          </Card>
          <Card className="niva-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">{t('admin.aiQuality')}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{locale === 'fa' ? 'دستیار پاسخ داده' : 'Assistant replies'}: <span className="num font-semibold">{overview?.aiMessages ?? 0}</span> · {locale === 'fa' ? 'ارجاع اورژانسی' : 'Emergency escalations'}: <span className="num font-semibold text-destructive">{overview?.aiEmergencyEscalations ?? 0}</span></p>
              <div className="rounded-xl border p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">{locale === 'fa' ? 'تست دودی لایه ایمنی (قاعده‌محور)' : 'Safety-layer smoke tests (deterministic)'}</p>
                {overview?.safetySmoke.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span dir="auto" className="truncate">{s.phrase}</span>
                    <Badge variant={s.actual === 'EMERGENCY' ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                      {s.actual}{s.expectEmergency !== (s.actual === 'EMERGENCY') ? ' ⚠ MISMATCH' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="niva-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">{t('admin.assets')}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {overview?.assets.map((a) => (
                <div key={a.assetId} className="rounded-lg border p-2.5">
                  <p className="font-semibold num">{a.assetId}</p>
                  <p className="text-muted-foreground mt-1">{a.reviewStatus} · {a.publicationStatus}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="niva-card">
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/95 text-xs text-muted-foreground">
                    <tr><th className="p-2.5 text-start">{t('auth.email')}</th><th className="p-2.5 text-start">{t('admin.role')}</th><th className="p-2.5 text-start">{t('admin.plan')}</th><th className="p-2.5 text-start">{t('admin.created')}</th></tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="p-2.5" dir="ltr">{u.email}</td>
                        <td className="p-2.5"><Badge variant="outline" className="text-[10px]">{u.role}</Badge></td>
                        <td className="p-2.5 text-xs">{u.plan}</td>
                        <td className="p-2.5 text-xs num">{new Date(u.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety" className="space-y-3">
          {(overview?.safetyRecent ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t('common.empty')}</p>}
          {overview?.safetyRecent.map((e) => (
            <Card key={e.id} className="niva-card"><CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
              <Badge variant={e.severity === 'HIGH' || e.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>{e.type}</Badge>
              <span className="flex-1 text-xs truncate" dir="auto">{e.detail}</span>
              <Button variant="outline" size="sm" className="min-h-9" onClick={() => resolveSafety(e.id)}>{t('admin.resolve')}</Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="moderation" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold flex items-center gap-2"><Gavel className="h-4 w-4 text-primary" />{t('mod.queue')}</h2>
            <Badge variant="secondary" className="num">{mod?.counts.pending ?? 0}</Badge>
            <span className="text-xs text-muted-foreground">{t('mod.queueCount')}</span>
          </div>
          {mod === null ? <Skeleton className="h-40 w-full" /> : mod.queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('mod.empty')}</p>
          ) : (
            <div className="space-y-3">
              {mod.queue.map((p) => (
                <Card key={p.id} className="niva-card">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{p.authorAlias}</span>
                      <Badge variant="secondary" className="text-[10px]">{p.topic}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase">{p.language}</Badge>
                      {p.flagCount > 0 && <Badge variant="destructive" className="text-[10px]">{t('mod.flaggedBadge')}</Badge>}
                      <span className="ms-auto text-[10px] text-muted-foreground num">{new Date(p.createdAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
                    </div>
                    <p className="text-sm leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap" dir="auto">{p.body}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{t('mod.author')}: {p.author.email}</p>
                    {p.moderationNote && (
                      <p className="text-xs text-amber-700 dark:text-amber-400" dir="auto">{p.moderationNote === AUTO_REPORT_NOTE ? t('mod.autoFlagNote') : p.moderationNote}</p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <Input
                        value={reasons[p.id] ?? ''}
                        onChange={(e) => setReasons((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder={t('mod.reason')}
                        maxLength={500}
                        className="min-h-11 sm:flex-1"
                        aria-label={t('mod.reason')}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="min-h-11 flex-1 sm:flex-none" disabled={busyId === p.id} onClick={() => decide(p.id, 'APPROVE')}>{t('mod.approve')}</Button>
                        <Button size="sm" variant="outline" className="min-h-11 flex-1 sm:flex-none" disabled={busyId === p.id} onClick={() => decide(p.id, 'REJECT')}>{t('mod.reject')}</Button>
                        <Button size="sm" variant="destructive" className="min-h-11 flex-1 sm:flex-none" disabled={busyId === p.id} onClick={() => decide(p.id, 'REMOVE')}>{t('mod.remove')}</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Card className="niva-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">{t('mod.decisions')} <Badge variant="outline" className="num">{mod?.counts.todayDecisions ?? 0}</Badge></CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {(mod?.recent ?? []).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">{t('common.empty')}</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {mod?.recent.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                        <Badge variant={a.action === 'APPROVE' ? 'default' : a.action === 'REMOVE' || a.action === 'REJECT' ? 'destructive' : 'outline'} className="text-[10px]">{a.action}</Badge>
                        <span className="text-xs font-medium" dir="auto">{a.post?.authorAlias ?? '—'}</span>
                        <span className="text-xs text-muted-foreground truncate flex-1 min-w-24" dir="auto">{a.reason ?? ''}</span>
                        <span className="text-[10px] text-muted-foreground num">{new Date(a.createdAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
                        <span className="text-xs text-muted-foreground" dir="ltr">{a.moderator?.email ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="niva-card">
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/95 text-xs text-muted-foreground">
                    <tr><th className="p-2.5 text-start">{t('common.expand')}</th><th className="p-2.5 text-start">{t('track.date')}</th><th className="p-2.5 text-start">{t('admin.role')}</th></tr>
                  </thead>
                  <tbody>
                    {audit.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="p-2.5 text-xs"><span className="font-semibold">{e.action}</span> <span className="text-muted-foreground">· {e.entity}</span></td>
                        <td className="p-2.5 text-xs num">{new Date(e.createdAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</td>
                        <td className="p-2.5 text-xs" dir="ltr">{e.actor?.email ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {finance && Object.entries(finance.revenueByPlan).map(([plan, amount]) => (
              <Card key={plan} className="niva-card"><CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3" />{plan}</p>
                <p className="text-lg font-bold num">{(amount / 10).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</p>
              </CardContent></Card>
            ))}
          </div>
          <Card className="niva-card">
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/95 text-xs text-muted-foreground">
                    <tr><th className="p-2.5 text-start">{t('admin.plan')}</th><th className="p-2.5 text-start">{t('sub.amount')}</th><th className="p-2.5 text-start">{t('auth.email')}</th></tr>
                  </thead>
                  <tbody>
                    {finance?.payments.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="p-2.5 text-xs">{p.plan}</td>
                        <td className="p-2.5 text-xs num">{(p.amount / 10).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</td>
                        <td className="p-2.5 text-xs" dir="ltr">{p.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags">
          <Card className="niva-card">
            <CardContent className="p-5 space-y-4">
              {([
                ['community', 'admin.flagCommunity'],
                ['family', 'admin.flagFamily'],
                ['studio', 'admin.flagStudio'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <Label className="flex items-center gap-2 text-sm"><ToggleLeft className="h-4 w-4 text-primary" />{t(label)}</Label>
                  <Switch checked={flags[key]} onCheckedChange={(v) => toggleFlag(key, v)} aria-label={t(label)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card className="niva-card"><CardContent className="p-4 flex items-center gap-3">
      <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-2xl font-bold num leading-none">{value}</p>
        <p className="text-xs text-muted-foreground truncate mt-1">{label}</p>
      </div>
    </CardContent></Card>
  );
}
