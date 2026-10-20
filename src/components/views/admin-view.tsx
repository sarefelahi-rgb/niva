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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ShieldCheck, CheckCircle2, Users, Activity, Coins, ToggleLeft, Sparkles, Gavel, Clock, Loader2,
  Search, Siren, LifeBuoy, Ban, RotateCcw, Send, Plus, UserCog,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/** Must match AUTO_REPORT_NOTE written by /api/community (localized via mod.autoFlagNote). */
const AUTO_REPORT_NOTE = 'Auto-queued after repeated reports';

/** Wave 6.2 role spectrum (mirrors src/lib/roles.ts — kept client-local). */
const ROLES = ['USER', 'CLINICAL_REVIEWER', 'MODERATOR', 'SUPPORT', 'FINANCE', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'] as const;
const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const;
const TICKET_CATEGORIES = ['BILLING', 'CLINICAL', 'TECHNICAL', 'PRIVACY', 'OTHER'] as const;
const INCIDENT_FLOW = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'] as const;
const FLAGS = ['community', 'family', 'studio', 'ar'] as const;

interface Overview {
  users: number; pregnancies: number; contentPending: number; postsPending: number; safetyOpen: number;
  aiMessages: number; aiEmergencyEscalations: number;
  safetyRecent: Array<{ id: string; type: string; severity: string; detail: string; createdAt: string }>;
  assets: Array<{ assetId: string; stage: number; reviewStatus: string; publicationStatus: string }>;
  safetySmoke: Array<{ phrase: string; expectEmergency: boolean; actual: string }>;
}
interface UserRow {
  id: string; email: string; name: string; role: string; locale: string; plan: string;
  deactivatedAt: string | null; createdAt: string; posts: number; ticketsOpen: number;
}
interface AuditRow { id: string; action: string; entity: string; entityId: string | null; actor: { name: string; email: string } | null; createdAt: string }
interface FinanceRow { id: string; plan: string; amount: number; currency: string; status: string; user: string; createdAt: string }
interface FlagState { enabled: boolean; rolloutPercent: number | null }
interface ModPost {
  id: string; authorAlias: string; topic: string; body: string; language: string; status: string;
  flagCount: number; moderationNote: string | null; createdAt: string;
  author: { email: string; name: string | null };
}
interface ModActionRow { id: string; action: string; reason: string | null; createdAt: string; moderator: { email: string } | null; post: { authorAlias: string } | null }
interface ModData { queue: ModPost[]; recent: ModActionRow[]; counts: { pending: number; todayDecisions: number } }
interface TickResult { materialized: number; remindersCreated: number; apptRemindersCreated: number; pendingScheduled: number; emailTransportConfigured: boolean; at: string }
interface AIMetrics {
  windowHours: number; totalRequests: number; cacheHitRate: number; avgLatencyMs: number; p95LatencyMs: number;
  errorRate: number; usedRetrievalRate: number;
  providerBreakdown: Record<string, number>; safetyBreakdown: Record<string, number>; errorBreakdown: Record<string, number>;
}
interface TicketRow {
  id: string; subject: string; category: string; status: string; priority: string;
  createdAt: string; updatedAt: string; requester: { email: string; name: string | null };
  assignedTo: string | null; messagesCount: number;
}
interface TicketMessageRow { id: string; body: string; isStaff: boolean; createdAt: string; authorId: string; authorName: string | null }
interface TicketDetail {
  id: string; subject: string; category: string; status: string; priority: string; createdAt: string; updatedAt: string;
  requester: { id: string; email: string; name: string | null };
  assignedTo: { id: string; email: string; name: string | null } | null;
  messages: TicketMessageRow[];
  canRespond: boolean;
}
interface IncidentRow {
  id: string; title: string; description: string; severity: string; status: string;
  openedBy: string | null; resolvedAt: string | null; createdAt: string; updatedAt: string;
}

const fmtDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US');
const fmtDateTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US');

export function AdminView() {
  const { t, locale, user } = useApp();
  const { toast } = useToast();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [finance, setFinance] = useState<{ revenueByPlan: Record<string, number>; payments: FinanceRow[] } | null>(null);
  const [flagState, setFlagState] = useState<Record<(typeof FLAGS)[number], FlagState>>({
    community: { enabled: true, rolloutPercent: null },
    family: { enabled: true, rolloutPercent: null },
    studio: { enabled: true, rolloutPercent: null },
    ar: { enabled: true, rolloutPercent: null },
  });
  const [flagEffective, setFlagEffective] = useState<Record<string, boolean> | null>(null);
  const [flagsSaving, setFlagsSaving] = useState(false);
  const [mod, setMod] = useState<ModData | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState<TickResult | null>(null);
  const [tickBusy, setTickBusy] = useState(false);
  const [aiMetrics, setAiMetrics] = useState<AIMetrics | null>(null);

  // Wave 6.2 — user management state
  const [searchDraft, setSearchDraft] = useState('');
  const [userQ, setUserQ] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);
  const [userBusy, setUserBusy] = useState(false);

  // Wave 6.2 — support tickets state
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ticketCounts, setTicketCounts] = useState({ open: 0, inProgress: 0 });
  const [tStatus, setTStatus] = useState('ALL');
  const [tPriority, setTPriority] = useState('ALL');
  const [tCategory, setTCategory] = useState('ALL');
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [ticketBusy, setTicketBusy] = useState(false);

  // Wave 6.2 — incidents state
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [incidentFormOpen, setIncidentFormOpen] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState('MEDIUM');
  const [incidentBusy, setIncidentBusy] = useState(false);

  const loadUsers = useCallback(async (page: number, q: string, append: boolean) => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) params.set('q', q);
    const d = await fetch(`/api/admin/users?${params}`).then((r) => r.json()).catch(() => null);
    if (d?.users) {
      setUsers((prev) => (append ? [...prev, ...(d.users as UserRow[])] : (d.users as UserRow[])));
      setUserTotal(typeof d.total === 'number' ? d.total : 0);
      setUserPage(page);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    const d = await fetch('/api/admin/incidents').then((r) => r.json()).catch(() => null);
    if (d?.incidents) setIncidents(d.incidents as IncidentRow[]);
  }, []);

  const loadTickets = useCallback(async () => {
    const params = new URLSearchParams();
    if (tStatus !== 'ALL') params.set('status', tStatus);
    if (tPriority !== 'ALL') params.set('priority', tPriority);
    if (tCategory !== 'ALL') params.set('category', tCategory);
    const d = await fetch(`/api/admin/tickets?${params}`).then((r) => r.json()).catch(() => null);
    if (d?.tickets) {
      setTickets(d.tickets as TicketRow[]);
      if (d.counts) setTicketCounts(d.counts);
    }
  }, [tStatus, tPriority, tCategory]);

  const load = useCallback(async () => {
    const [o, a, f, fl, m, ai] = await Promise.all([
      fetch('/api/admin/overview').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/audit').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/finance').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/flags').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/moderation').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/ai-metrics').then((r) => r.json()).catch(() => null),
    ]);
    if (o) setOverview(o);
    if (a) setAudit(a.events ?? []);
    if (f) setFinance(f);
    if (fl?.flags) {
      setFlagState((prev) => {
        const next = { ...prev };
        for (const key of FLAGS) {
          const v = (fl.flags as Record<string, unknown>)[key];
          if (typeof v === 'boolean') next[key] = { enabled: v, rolloutPercent: null };
          else if (v && typeof v === 'object') {
            const obj = v as { enabled?: boolean; rolloutPercent?: number | null };
            next[key] = { enabled: obj.enabled ?? true, rolloutPercent: obj.rolloutPercent ?? null };
          }
        }
        return next;
      });
    }
    if (m?.queue) setMod(m);
    if (ai && typeof ai.totalRequests === 'number') setAiMetrics(ai);
    await Promise.all([loadUsers(1, '', false), loadIncidents(), loadTickets()]);
    setLoading(false);
  }, [loadUsers, loadIncidents, loadTickets]);

  useEffect(() => {
    const id = requestAnimationFrame(() => { void load(); });
    return () => cancelAnimationFrame(id);
  }, [load]);

  // Re-fetch the queue when a filter changes (after initial load).
  useEffect(() => {
    if (!loading) void loadTickets();
  }, [tStatus, tPriority, tCategory, loading, loadTickets]);

  const saveFlags = async () => {
    setFlagsSaving(true);
    try {
      const res = await fetch('/api/admin/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flags: {
            community: { enabled: flagState.community.enabled, rolloutPercent: flagState.community.rolloutPercent },
            family: flagState.family.enabled,
            studio: flagState.studio.enabled,
            ar: flagState.ar.enabled,
          },
        }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok) {
        if (d?.effective) setFlagEffective(d.effective);
        toast({ description: t('admin2.flagSaved') });
      } else {
        toast({ description: d?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setFlagsSaving(false);
    }
  };

  const changeRole = async (u: UserRow, role: string) => {
    setBusyId(u.id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, role }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.changed) {
        toast({ description: t('admin2.roleChanged') });
        await loadUsers(userPage, userQ, false);
      } else {
        toast({ description: d?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const target = deactivateTarget;
    setDeactivateTarget(null);
    setUserBusy(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: target.id, deactivated: target.deactivatedAt == null }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok) {
        toast({ description: t(target.deactivatedAt == null ? 'admin2.userDeactivated' : 'admin2.userReactivated') });
        await loadUsers(userPage, userQ, false);
      } else {
        toast({ description: d?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setUserBusy(false);
    }
  };

  const openTicket = async (id: string) => {
    setTicketBusy(true);
    try {
      const d = await fetch(`/api/tickets/${id}`).then((r) => r.json()).catch(() => null);
      if (d?.ticket) {
        setTicketDetail(d.ticket as TicketDetail);
        setReplyDraft('');
      }
    } finally {
      setTicketBusy(false);
    }
  };

  const sendReply = async () => {
    if (!ticketDetail || !replyDraft.trim()) return;
    setTicketBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticketDetail.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyDraft.trim() }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok) {
        toast({ description: t('admin2.ticketReplySent') });
        setReplyDraft('');
        await openTicket(ticketDetail.id);
        await loadTickets();
      } else {
        toast({ description: d?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setTicketBusy(false);
    }
  };

  const patchTicket = async (payload: { status?: string; priority?: string; assignedToId?: string }) => {
    if (!ticketDetail) return;
    setTicketBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticketDetail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => null);
      if (res.ok) {
        toast({ description: t('admin2.ticketUpdated') });
        await openTicket(ticketDetail.id);
        await loadTickets();
      } else {
        toast({ description: d?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setTicketBusy(false);
    }
  };

  const advanceIncident = async (inc: IncidentRow) => {
    const idx = INCIDENT_FLOW.indexOf(inc.status as (typeof INCIDENT_FLOW)[number]);
    const next = INCIDENT_FLOW[Math.min(idx + 1, INCIDENT_FLOW.length - 1)];
    if (next === inc.status) return;
    setIncidentBusy(true);
    try {
      const res = await fetch(`/api/admin/incidents/${inc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) await loadIncidents();
      else {
        const d = await res.json().catch(() => null);
        toast({ description: d?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setIncidentBusy(false);
    }
  };

  const createIncident = async () => {
    if (incidentTitle.trim().length < 4 || incidentDesc.trim().length < 4) return;
    setIncidentBusy(true);
    try {
      const res = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: incidentTitle.trim(), description: incidentDesc.trim(), severity: incidentSeverity }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok) {
        toast({ description: t('admin2.incidentCreated') });
        setIncidentTitle(''); setIncidentDesc(''); setIncidentSeverity('MEDIUM'); setIncidentFormOpen(false);
        await loadIncidents();
      } else {
        toast({ description: d?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setIncidentBusy(false);
    }
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

  const openIncidents = incidents.filter((i) => i.status !== 'RESOLVED');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />{t('admin.title')}</h1>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 min-h-11">
          <TabsTrigger value="overview">{t('admin.overview')}</TabsTrigger>
          <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
          <TabsTrigger value="tickets">{t('admin2.tabTickets')}</TabsTrigger>
          <TabsTrigger value="safety">{t('admin.safety')}</TabsTrigger>
          <TabsTrigger value="moderation">{t('mod.tab')}</TabsTrigger>
          <TabsTrigger value="audit">{t('admin.audit')}</TabsTrigger>
          <TabsTrigger value="finance">{t('admin.finance')}</TabsTrigger>
          <TabsTrigger value="flags">{t('admin.flags')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Wave 6.2 — incident strip (open first, severity chips, status stepper) */}
          <Card className="niva-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Siren className="h-4 w-4 text-primary" />{t('admin2.incidentsTitle')}
                <Badge variant={openIncidents.length > 0 ? 'destructive' : 'secondary'} className="num">{openIncidents.length}</Badge>
                <Button
                  size="sm" variant="outline" className="min-h-9 ms-auto"
                  onClick={() => setIncidentFormOpen((v) => !v)}
                  aria-expanded={incidentFormOpen}
                >
                  <Plus className="h-3.5 w-3.5 me-1" />{t('admin2.incidentNew')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {incidentFormOpen && (
                <div className="rounded-xl border p-3 space-y-2.5" role="group" aria-label={t('admin2.incidentNew')}>
                  <Input
                    value={incidentTitle} onChange={(e) => setIncidentTitle(e.target.value)}
                    placeholder={t('admin2.incidentTitleLabel')} maxLength={140} className="min-h-11" aria-label={t('admin2.incidentTitleLabel')}
                  />
                  <Textarea
                    value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)}
                    placeholder={t('admin2.incidentDescLabel')} maxLength={4000} rows={2} aria-label={t('admin2.incidentDescLabel')}
                  />
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Select value={incidentSeverity} onValueChange={setIncidentSeverity}>
                      <SelectTrigger className="min-h-11 sm:w-40" aria-label={t('admin2.incidentSeverityLabel')}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((s) => (
                          <SelectItem key={s} value={s}>{t(`admin2.incidentSeverity.${s}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button className="min-h-11" disabled={incidentBusy || incidentTitle.trim().length < 4 || incidentDesc.trim().length < 4} onClick={() => void createIncident()}>
                      {incidentBusy && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}{t('admin2.incidentCreate')}
                    </Button>
                  </div>
                </div>
              )}
              {incidents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('admin2.incidentEmpty')}</p>
              ) : (
                <ul className="space-y-2.5">
                  {incidents.slice(0, 6).map((inc) => {
                    const idx = INCIDENT_FLOW.indexOf(inc.status as (typeof INCIDENT_FLOW)[number]);
                    return (
                      <li key={inc.id} className="rounded-xl border p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? 'destructive' : inc.severity === 'MEDIUM' ? 'secondary' : 'outline'} className="text-[10px]">
                            {t(`admin2.incidentSeverity.${inc.severity}`)}
                          </Badge>
                          <span className="font-semibold text-sm" dir="auto">{inc.title}</span>
                          <span className="ms-auto text-[10px] text-muted-foreground num">{fmtDateTime(inc.createdAt, locale)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2" dir="auto">{inc.description}</p>
                        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('admin2.incidentStepperLabel')}>
                          {INCIDENT_FLOW.map((s, si) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={si === idx ? 'default' : 'outline'}
                              className="min-h-8 h-8 px-2.5 text-[11px]"
                              disabled={incidentBusy || si === idx || si < idx}
                              onClick={() => void advanceIncident(inc)}
                              aria-label={`${t('admin2.incidentStatus.' + s)} — ${t('admin2.incidentAdvance')}`}
                            >
                              {t(`admin2.incidentStatus.${s}`)}
                            </Button>
                          ))}
                        </div>
                        {inc.resolvedAt && (
                          <p className="text-[10px] text-muted-foreground num">
                            {t('admin2.incidentResolvedAt').replace('{date}', fmtDateTime(inc.resolvedAt, locale))}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">{t('admin2.statusPageNote')}</p>
            </CardContent>
          </Card>

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
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{locale === 'fa' ? 'مشاهده‌پذیری هوش مصنوعی' : 'AI observability'}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!aiMetrics ? (
                <p className="text-xs text-muted-foreground">{locale === 'fa' ? 'داده‌ای ثبت نشده است.' : 'No data recorded yet.'}</p>
              ) : aiMetrics.totalRequests === 0 ? (
                <p className="text-xs text-muted-foreground">{locale === 'fa' ? `در ${aiMetrics.windowHours} ساعت گذشته درخواستی ثبت نشده — همه‌ی شاخص‌ها صفر هستند.` : `No requests recorded in the last ${aiMetrics.windowHours}h — all metrics are zero.`}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <MetricCell label={locale === 'fa' ? 'درخواست‌ها (۲۴ ساعت)' : 'Requests (24h)'} value={String(aiMetrics.totalRequests)} />
                    <MetricCell label={locale === 'fa' ? 'نرخ حافظه نهان' : 'Cache hit rate'} value={`${Math.round(aiMetrics.cacheHitRate * 100)}%`} />
                    <MetricCell label={locale === 'fa' ? 'میانگین تأخیر' : 'Avg latency'} value={`${aiMetrics.avgLatencyMs} ms`} />
                    <MetricCell label={locale === 'fa' ? 'صدک ۹۵ تأخیر' : 'p95 latency'} value={`${aiMetrics.p95LatencyMs} ms`} />
                    <MetricCell label={locale === 'fa' ? 'نرخ خطا' : 'Error rate'} value={`${Math.round(aiMetrics.errorRate * 100)}%`} />
                    <MetricCell label={locale === 'fa' ? 'نرخ پاسخ مبتنی بر منبع' : 'Retrieval-grounded rate'} value={`${Math.round(aiMetrics.usedRetrievalRate * 100)}%`} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(aiMetrics.providerBreakdown).map(([p, n]) => (
                      <Badge key={p} variant="outline" className="text-[10px]">{p}: <span className="num ms-1">{n}</span></Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(aiMetrics.safetyBreakdown).map(([s, n]) => (
                      <Badge key={s} variant={s === 'EMERGENCY' ? 'destructive' : 'secondary'} className="text-[10px]">{s}: <span className="num ms-1">{n}</span></Badge>
                    ))}
                  </div>
                  {Object.keys(aiMetrics.errorBreakdown).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(aiMetrics.errorBreakdown).map(([c, n]) => (
                        <Badge key={c} variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400">{c}: <span className="num ms-1">{n}</span></Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{locale === 'fa' ? 'بدون داده شخصی یا محتوای پیام — شناسه کاربر هش شده و فقط شمارش نویسه‌ها ذخیره می‌شود.' : 'No personal data or message content — user ids are hashed and only character counts are stored.'}</p>
                </>
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

        <TabsContent value="users" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = searchDraft.trim();
                  setUserQ(q);
                  void loadUsers(1, q, false);
                }
              }}
              placeholder={t('admin2.searchPlaceholder')}
              className="min-h-11 flex-1"
              aria-label={t('common.search')}
              maxLength={120}
            />
            <Button
              variant="outline" className="min-h-11"
              onClick={() => { const q = searchDraft.trim(); setUserQ(q); void loadUsers(1, q, false); }}
            >
              <Search className="h-4 w-4 me-1.5" />{t('common.search')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('admin2.showing').replace('{n}', String(users.length)).replace('{total}', String(userTotal))}
            {' — '}{t('admin2.roleManageHint')}
          </p>
          <Card className="niva-card">
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/95 text-xs text-muted-foreground">
                    <tr>
                      <th className="p-2.5 text-start">{t('auth.email')}</th>
                      <th className="p-2.5 text-start">{t('admin2.roleLabel')}</th>
                      <th className="p-2.5 text-start">{t('admin.plan')}</th>
                      <th className="p-2.5 text-start">{t('admin2.status')}</th>
                      <th className="p-2.5 text-start hidden md:table-cell">{t('admin2.posts')}</th>
                      <th className="p-2.5 text-start hidden md:table-cell">{t('admin2.ticketsOpen')}</th>
                      <th className="p-2.5 text-start">{t('admin2.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={`border-t ${u.deactivatedAt ? 'opacity-60' : ''}`}>
                        <td className="p-2.5" dir="ltr">
                          <span className="block truncate max-w-44" title={u.email}>{u.email}</span>
                          <span className="text-[10px] text-muted-foreground block truncate max-w-44">{u.name}</span>
                        </td>
                        <td className="p-2.5">
                          {isSuper ? (
                            <Select
                              value={u.role}
                              onValueChange={(v) => void changeRole(u, v)}
                              disabled={busyId === u.id}
                            >
                              <SelectTrigger className="h-8 w-36 text-xs" aria-label={`${t('admin2.roleLabel')} ${u.email}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r} value={r} className="text-xs">{t(`admin2.role.${r}`)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-[10px]" title={t('admin2.roleManageHint')}>
                              <UserCog className="h-3 w-3 me-1" aria-hidden />{t(`admin2.role.${u.role}`)}
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-xs">{u.plan}</td>
                        <td className="p-2.5">
                          {u.deactivatedAt ? (
                            <Badge variant="destructive" className="text-[10px]">{t('admin2.deactivated')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">{t('admin2.active')}</Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-xs num hidden md:table-cell">{u.posts}</td>
                        <td className="p-2.5 text-xs num hidden md:table-cell">{u.ticketsOpen}</td>
                        <td className="p-2.5">
                          {u.deactivatedAt ? (
                            <Button
                              size="sm" variant="outline" className="min-h-9"
                              disabled={userBusy || busyId === u.id}
                              onClick={() => setDeactivateTarget(u)}
                            >
                              <RotateCcw className="h-3.5 w-3.5 me-1" aria-hidden />{t('admin2.reactivate')}
                            </Button>
                          ) : (
                            <Button
                              size="sm" variant="ghost" className="min-h-9 text-destructive hover:text-destructive"
                              disabled={userBusy || busyId === u.id || u.id === user?.id}
                              onClick={() => setDeactivateTarget(u)}
                            >
                              <Ban className="h-3.5 w-3.5 me-1" aria-hidden />{t('admin2.deactivate')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {users.length < userTotal && (
            <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => void loadUsers(userPage + 1, userQ, true)}>
              {t('admin2.loadMore')}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-primary" />{t('admin2.ticketQueue')}</h2>
            <Badge variant="secondary" className="num">{ticketCounts.open}</Badge>
            <span className="text-xs text-muted-foreground">{t('admin2.queueOpen')}</span>
            <Badge variant="outline" className="num">{ticketCounts.inProgress}</Badge>
            <span className="text-xs text-muted-foreground">{t('admin2.queueInProgress')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={tStatus} onValueChange={setTStatus}>
              <SelectTrigger className="min-h-11" aria-label={t('admin2.filterStatus')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all')} — {t('admin2.filterStatus')}</SelectItem>
                {TICKET_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`admin2.ticketStatus.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tPriority} onValueChange={setTPriority}>
              <SelectTrigger className="min-h-11" aria-label={t('admin2.filterPriority')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all')} — {t('admin2.filterPriority')}</SelectItem>
                {TICKET_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{t(`admin2.ticketPriority.${p}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tCategory} onValueChange={setTCategory}>
              <SelectTrigger className="min-h-11" aria-label={t('admin2.filterCategory')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all')} — {t('admin2.filterCategory')}</SelectItem>
                {TICKET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`admin2.ticketCategory.${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin2.ticketEmpty')}</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pe-0.5">
              {tickets.map((tk) => (
                <button
                  key={tk.id}
                  className="w-full text-start rounded-xl border p-3 hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void openTicket(tk.id)}
                  aria-label={`${t('admin2.ticketDetail')}: ${tk.subject}`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold" dir="auto">{tk.subject}</span>
                    <Badge variant={tk.priority === 'HIGH' ? 'destructive' : 'secondary'} className="text-[10px]">{t(`admin2.ticketPriority.${tk.priority}`)}</Badge>
                    <Badge variant="outline" className="text-[10px]">{t(`admin2.ticketCategory.${tk.category}`)}</Badge>
                    <Badge
                      variant={tk.status === 'OPEN' ? 'default' : tk.status === 'CLOSED' || tk.status === 'RESOLVED' ? 'secondary' : 'outline'}
                      className="text-[10px]"
                    >
                      {t(`admin2.ticketStatus.${tk.status}`)}
                    </Badge>
                    <span className="ms-auto text-[10px] text-muted-foreground num">{fmtDateTime(tk.updatedAt, locale)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5" dir="ltr">
                    {t('admin2.ticketRequester')}: {tk.requester.name ?? tk.requester.email} · {t('admin2.ticketMessages')}: <span className="num">{tk.messagesCount}</span>
                    {tk.assignedTo ? <> · {t('admin2.ticketAssigned')}: {tk.assignedTo}</> : null}
                  </p>
                </button>
              ))}
            </div>
          )}
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
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ToggleLeft className="h-4 w-4 text-primary" />{t('admin2.flagsTitle')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">{t('admin2.flagsHint')}</p>
              {FLAGS.map((key) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label className="flex items-center gap-2 text-sm" htmlFor={`flag-${key}`}>
                      {t(key === 'community' ? 'admin.flagCommunity' : key === 'family' ? 'admin.flagFamily' : key === 'studio' ? 'admin.flagStudio' : 'admin2.flagAr')}
                      <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{key}</span>
                    </Label>
                    <Switch
                      id={`flag-${key}`}
                      checked={flagState[key].enabled}
                      onCheckedChange={(v) => setFlagState((p) => ({ ...p, [key]: { ...p[key], enabled: v } }))}
                      aria-label={t(key === 'community' ? 'admin.flagCommunity' : key === 'family' ? 'admin.flagFamily' : key === 'studio' ? 'admin.flagStudio' : 'admin2.flagAr')}
                    />
                  </div>
                  {key === 'community' && (
                    <div className="rounded-xl border p-3 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <Label htmlFor="flag-rollout-community" className="text-xs shrink-0">{t('admin2.rolloutLabel')}</Label>
                        <Input
                          id="flag-rollout-community"
                          type="number" min={0} max={100} step={5}
                          value={flagState.community.rolloutPercent ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const pct = raw === '' ? null : Math.min(100, Math.max(0, Number(raw)));
                            setFlagState((p) => ({ ...p, community: { ...p.community, rolloutPercent: Number.isNaN(pct as number) ? null : pct } }));
                          }}
                          disabled={!flagState.community.enabled}
                          className="min-h-9 w-24 num"
                          dir="ltr"
                          aria-label={t('admin2.rolloutLabel')}
                        />
                        <span className="text-xs text-muted-foreground num">٪</span>
                        <Badge variant="outline" className="text-[10px] ms-auto">
                          {flagState.community.rolloutPercent == null ? '100%' : `${flagState.community.rolloutPercent}%`}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{t('admin2.rolloutHint')}</p>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                <Button className="min-h-11" onClick={() => void saveFlags()} disabled={flagsSaving}>
                  {flagsSaving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}{t('common.save')}
                </Button>
                {flagEffective && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t('admin2.effectiveDemo')}:</span>
                    {FLAGS.map((key) => (
                      <Badge key={key} variant={flagEffective[key] ? 'default' : 'outline'} className="text-[10px]">
                        {key}: {flagEffective[key] ? t('admin2.flagOn') : t('admin2.flagOff')}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Wave 6.2 — ticket detail drawer */}
      <Sheet open={!!ticketDetail} onOpenChange={(o) => { if (!o) setTicketDetail(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          {ticketDetail && (
            <>
              <SheetHeader className="p-4 pb-2 border-b">
                <SheetTitle className="text-base text-start" dir="auto">{ticketDetail.subject}</SheetTitle>
                <SheetDescription className="text-xs text-start" dir="ltr">
                  {ticketDetail.requester.name ?? ticketDetail.requester.email} · {t(`admin2.ticketCategory.${ticketDetail.category}`)}
                </SheetDescription>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant={ticketDetail.priority === 'HIGH' ? 'destructive' : 'secondary'} className="text-[10px]">{t(`admin2.ticketPriority.${ticketDetail.priority}`)}</Badge>
                  <Badge variant={ticketDetail.status === 'OPEN' ? 'default' : 'outline'} className="text-[10px]">{t(`admin2.ticketStatus.${ticketDetail.status}`)}</Badge>
                  <span className="text-[10px] text-muted-foreground num ms-auto">{fmtDateTime(ticketDetail.createdAt, locale)}</span>
                </div>
              </SheetHeader>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                <ol className="space-y-3">
                  {ticketDetail.messages.map((m) => (
                    <li key={m.id} className={m.isStaff ? 'flex justify-end' : 'flex justify-start'}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.isStaff ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}`}>
                        <p className="whitespace-pre-wrap" dir="auto">{m.body}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {m.isStaff ? t('admin2.role.SUPPORT') : (m.authorName ?? '')}
                          {' · '}
                          <span className="num">{fmtDateTime(m.createdAt, locale)}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {ticketDetail.canRespond && (
                <div className="border-t p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={ticketDetail.status} onValueChange={(v) => void patchTicket({ status: v })} disabled={ticketBusy}>
                      <SelectTrigger className="min-h-11" aria-label={t('admin2.filterStatus')}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TICKET_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`admin2.ticketStatus.${s}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={ticketDetail.priority} onValueChange={(v) => void patchTicket({ priority: v })} disabled={ticketBusy}>
                      <SelectTrigger className="min-h-11" aria-label={t('admin2.filterPriority')}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TICKET_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{t(`admin2.ticketPriority.${p}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground" dir="ltr">
                      {t('admin2.ticketAssigned')}: {ticketDetail.assignedTo ? ticketDetail.assignedTo.name ?? ticketDetail.assignedTo.email : t('admin2.ticketUnassigned')}
                    </span>
                    {ticketDetail.assignedTo?.id !== user?.id && (
                      <Button size="sm" variant="outline" className="min-h-9" disabled={ticketBusy} onClick={() => void patchTicket({ assignedToId: user!.id })}>
                        {t('admin2.ticketAssignSelf')}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder={t('admin2.ticketReplyPlaceholder')}
                    rows={3}
                    maxLength={4000}
                    disabled={ticketBusy || ticketDetail.status === 'CLOSED'}
                    aria-label={t('admin2.ticketSendReply')}
                  />
                  <Button className="min-h-11 w-full" disabled={ticketBusy || !replyDraft.trim() || ticketDetail.status === 'CLOSED'} onClick={() => void sendReply()}>
                    {ticketBusy ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Send className="h-4 w-4 me-1.5" aria-hidden />}
                    {t('admin2.ticketSendReply')}
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Wave 6.2 — deactivate confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(o) => { if (!o) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin2.deactivateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget?.email}
              <br />
              {t('admin2.deactivateBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeactivate()}>{t('common.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-sm font-semibold num">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
