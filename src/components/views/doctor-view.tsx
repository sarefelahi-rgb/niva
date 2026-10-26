'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/format';
import { ConsultRoomDialog, type ConsultRoomInfo } from '@/components/consult/consult-room-dialog';
import {
  Stethoscope, CalendarCheck, Clock, UserRound, Phone, Video, Mic, MapPin,
  ShieldCheck, Lock, FileText, Activity, HeartPulse, Loader2, Baby, CheckCircle2, Ban,
} from 'lucide-react';

/**
 * Wave 11 — doctor panel. Bookings addressed to the signed-in DOCTOR account,
 * with confirm / complete / no-show / cancel actions and the consent-gated
 * patient health summary (each section renders only when the patient granted
 * the matching flag — locked sections always say so explicitly).
 */

interface BookingRow {
  id: string; mode: 'CLINIC' | 'ONLINE_VOICE' | 'ONLINE_VIDEO'; scheduledAt: string; status: string;
  reason: string | null; shareTracking: boolean; shareRecords: boolean; shareDaily: boolean;
  patient: { id: string; name: string; phone: string | null };
}
interface Summary {
  patient: { id: string; name: string; phone: string | null };
  consent: { tracking: boolean; records: boolean; daily: boolean };
  pregnancy: { label: string; dueDate: string; lmpDate: string | null; status: string; plurality: string } | null;
  tracking: { id: string; date: string; week: number | null; energy: number; nausea: number; sleep: number; mood: number; weightKg: number | null; symptoms: string }[] | null;
  documents: { id: string; title: string; category: string; uploadedAt: string }[] | null;
  mood: { id: string; date: string; mood: number; energy: number; anxiety: number }[] | null;
  sleep: { id: string; date: string; hours: number; quality: number }[] | null;
  exercise: { id: string; date: string; type: string; minutes: number }[] | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  REQUESTED: 'secondary', CONFIRMED: 'default', CANCELLED: 'outline', COMPLETED: 'outline', NO_SHOW: 'destructive',
};

export function DoctorView() {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [roomInfo, setRoomInfo] = useState<ConsultRoomInfo | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/consultations').then((r) => r.json()).catch(() => null);
    if (res) setRows(res.consultations ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (rows !== null) {
    // Server already scopes to the doctor's own profile.
  }

  const act = async (row: BookingRow, action: 'confirm' | 'cancel' | 'complete' | 'no_show') => {
    setBusyId(row.id);
    try {
      const res = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action }),
      });
      if (res.ok) {
        toast({ description: t('common.done') });
        await load();
      } else {
        const data = await res.json().catch(() => null);
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setBusyId(null);
    }
  };

  const openSummary = async (row: BookingRow) => {
    setSummaryLoading(true);
    setSummary(null);
    const res = await fetch(`/api/consultations/summary?id=${row.id}`).then((r) => r.json()).catch(() => null);
    setSummaryLoading(false);
    if (!res || res.error) {
      toast({ description: res?.error?.message ?? t('common.error'), variant: 'destructive' });
      return;
    }
    setSummary(res);
  };

  const now = Date.now();
  const today = (rows ?? []).filter((r) => new Date(r.scheduledAt).toDateString() === new Date().toDateString() && r.status !== 'CANCELLED');
  const upcoming = (rows ?? []).filter((r) => new Date(r.scheduledAt).getTime() >= now && r.status !== 'CANCELLED' && new Date(r.scheduledAt).toDateString() !== new Date().toDateString());
  const pending = (rows ?? []).filter((r) => r.status === 'REQUESTED');
  const history = (rows ?? []).filter((r) => !upcoming.includes(r) && !today.includes(r));

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="h-6 w-6 text-primary" />{t('dp.title')}</h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: CalendarCheck, n: today.length, label: t('dp.today') },
          { icon: Clock, n: upcoming.length, label: t('dp.upcoming') },
          { icon: UserRound, n: pending.length, label: t('dp.pending') },
        ].map((s) => (
          <Card key={s.label} className="niva-card">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xl font-bold num">{s.n}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rows === null ? <Skeleton className="h-40 w-full" /> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dp.empty')}</p>
      ) : (
        <div className="space-y-3">
          {[...today, ...upcoming].map((b) => (
            <Card key={b.id} className="niva-card">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[b.status] ?? 'secondary'}>{t(`doc.status.${b.status}`)}</Badge>
                  <Badge variant="outline" className="gap-1">
                    {b.mode === 'CLINIC' ? <MapPin className="h-3 w-3" /> : b.mode === 'ONLINE_VOICE' ? <Mic className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                    {t(`doc.mode.${b.mode}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground ms-auto">{formatRelativeTime(b.scheduledAt, locale)}</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <p className="font-medium">{b.patient.name}</p>
                  {b.patient.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 num" dir="ltr"><Phone className="h-3 w-3" />{b.patient.phone}</p>
                  )}
                </div>
                <p dir="auto" className="text-sm">{formatDateTime(b.scheduledAt, locale)}</p>
                {b.reason && <p className="text-xs text-muted-foreground">{b.reason}</p>}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {b.status === 'REQUESTED' && (
                    <Button size="sm" className="min-h-9" disabled={busyId === b.id} onClick={() => act(b, 'confirm')}>
                      <CheckCircle2 className="h-4 w-4 me-1.5" />{t('dp.confirm')}
                    </Button>
                  )}
                  {b.status === 'CONFIRMED' && (
                    <Button size="sm" variant="outline" className="min-h-9" disabled={busyId === b.id} onClick={() => act(b, 'complete')}>
                      {busyId === b.id ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <CheckCircle2 className="h-4 w-4 me-1.5" />}
                      {t('dp.complete')}
                    </Button>
                  )}
                  {b.mode !== 'CLINIC' && b.status === 'CONFIRMED' && (
                    <Button size="sm" variant="outline" className="min-h-9" onClick={() => setRoomInfo({ id: b.id, mode: b.mode, scheduledAt: b.scheduledAt, counterpartName: b.patient.name, viewer: 'doctor' })}>
                      {b.mode === 'ONLINE_VIDEO' ? <Video className="h-4 w-4 me-1.5" /> : <Mic className="h-4 w-4 me-1.5" />}
                      {t('doc.joinRoom')}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="min-h-9" onClick={() => openSummary(b)}>
                    <Activity className="h-4 w-4 me-1.5" />{t('dp.healthSummary')}
                  </Button>
                  {(b.status === 'REQUESTED' || b.status === 'CONFIRMED') && (
                    <>
                      <Button size="sm" variant="ghost" className="min-h-9" disabled={busyId === b.id} onClick={() => act(b, 'no_show')}>{t('dp.noShow')}</Button>
                      <Button size="sm" variant="ghost" className="min-h-9 text-destructive hover:text-destructive" disabled={busyId === b.id} onClick={() => act(b, 'cancel')}>
                        <Ban className="h-4 w-4 me-1.5" />{t('doc.cancelBooking')}
                      </Button>
                    </>
                  )}
                </div>

                {/* consent chips */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    { on: b.shareTracking, label: t('doc.consentTracking') },
                    { on: b.shareRecords, label: t('doc.consentRecords') },
                    { on: b.shareDaily, label: t('doc.consentDaily') },
                  ].map((c) => (
                    <Badge key={c.label} variant={c.on ? 'secondary' : 'outline'} className="text-[10px] gap-1">
                      {c.on ? <ShieldCheck className="h-3 w-3 text-primary" /> : <Lock className="h-3 w-3" />}
                      {c.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {history.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <h2 className="font-semibold text-sm">{t('appt.past')}</h2>
              {history.slice(0, 8).map((b) => (
                <div key={b.id} className="flex items-center gap-2 text-sm border-b pb-1.5 last:border-0">
                  <Badge variant="secondary" className="text-[10px] px-1.5">{t(`doc.mode.${b.mode}`)}</Badge>
                  <span className="truncate flex-1">{b.patient.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">{t(`doc.status.${b.status}`)}</Badge>
                  <span dir="auto" className="text-xs text-muted-foreground shrink-0">{formatDate(b.scheduledAt, locale)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Consent-gated health summary ─────────────────────────────── */}
      <Dialog open={summary !== null || summaryLoading} onOpenChange={(v) => { if (!v) { setSummary(null); setSummaryLoading(false); } }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto" aria-label={t('dp.summaryTitle')}>
          <DialogHeader>
            <DialogTitle className="text-base">{t('dp.summaryTitle')}</DialogTitle>
            <DialogDescription dir="auto">{summary?.patient.name ?? '…'}</DialogDescription>
          </DialogHeader>
          {summaryLoading || !summary ? (
            <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-24 w-full" /></div>
          ) : (
            <div className="space-y-5">
              {/* Pregnancy — gated by shareTracking */}
              <Section title={t('dp.pregnancy')} icon={Baby} granted={summary.consent.tracking}>
                {summary.pregnancy ? (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{summary.pregnancy.label}</p>
                    <p className="text-xs text-muted-foreground">{t('dp.due')}: <span dir="auto">{formatDate(summary.pregnancy.dueDate, locale)}</span></p>
                    <p className="text-xs text-muted-foreground">status: {summary.pregnancy.status}</p>
                  </div>
                ) : <p className="text-xs text-muted-foreground">{t('dp.noData')}</p>}
              </Section>

              {/* Tracking entries — gated by shareTracking */}
              <Section title={t('dp.tracking')} icon={Activity} granted={summary.consent.tracking}>
                {summary.tracking && summary.tracking.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto rounded-lg border" tabIndex={0}>
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 sticky top-0">
                        <tr>
                          <th className="p-2 text-start font-medium">{t('common.week')}</th>
                          <th className="p-2 font-medium">energy</th>
                          <th className="p-2 font-medium">mood</th>
                          <th className="p-2 font-medium">sleep</th>
                          <th className="p-2 font-medium">kg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.tracking.map((r) => (
                          <tr key={r.id} className="border-t">
                            <td className="p-2" dir="auto">{r.week != null ? r.week : '—'}</td>
                            <td className="p-2 text-center num">{r.energy}</td>
                            <td className="p-2 text-center num">{r.mood}</td>
                            <td className="p-2 text-center num">{r.sleep}</td>
                            <td className="p-2 text-center num">{r.weightKg ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-xs text-muted-foreground">{t('dp.noData')}</p>}
              </Section>

              {/* Documents — gated by shareRecords */}
              <Section title={t('dp.documents')} icon={FileText} granted={summary.consent.records}>
                {summary.documents && summary.documents.length > 0 ? (
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {summary.documents.map((d) => (
                      <li key={d.id} className="text-xs flex items-center gap-2 border-b pb-1.5 last:border-0">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="truncate flex-1">{d.title}</span>
                        <span dir="auto" className="text-muted-foreground shrink-0">{formatDate(d.uploadedAt, locale)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-muted-foreground">{t('dp.noData')}</p>}
              </Section>

              {/* Daily wellness — gated by shareDaily */}
              <Section title={t('dp.daily')} icon={HeartPulse} granted={summary.consent.daily}>
                {summary.mood && summary.mood.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {summary.mood.map((m) => (
                      <div key={m.id} className="text-xs flex items-center gap-2">
                        <span dir="auto" className="text-muted-foreground w-24 shrink-0">{formatDate(m.date, locale, 'short')}</span>
                        <span>mood <b className="num">{m.mood}</b>/5</span>
                        <span>energy <b className="num">{m.energy}</b>/5</span>
                        <span>anxiety <b className="num">{m.anxiety}</b>/5</span>
                      </div>
                    ))}
                    {summary.sleep.slice(0, 5).map((s) => (
                      <div key={s.id} className="text-xs flex items-center gap-2">
                        <span dir="auto" className="text-muted-foreground w-24 shrink-0">{formatDate(s.date, locale, 'short')}</span>
                        <span>sleep <b className="num">{s.hours}</b>h (q{s.quality})</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">{t('dp.noData')}</p>}
              </Section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConsultRoomDialog open={roomInfo !== null} onOpenChange={(v) => !v && setRoomInfo(null)} info={roomInfo} />
    </div>
  );
}

function Section({ title, icon: Icon, granted, children }: { title: string; icon: React.ComponentType<{ className?: string }>; granted: boolean; children: React.ReactNode }) {
  const { t } = useApp();
  return (
    <section aria-label={title} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><Icon className="h-4 w-4 text-primary" />{title}</h3>
        <Badge variant={granted ? 'secondary' : 'outline'} className="text-[10px] gap-1">
          {granted ? <ShieldCheck className="h-3 w-3 text-primary" /> : <Lock className="h-3 w-3" />}
          {granted ? t('dp.granted') : t('dp.locked')}
        </Badge>
      </div>
      {granted ? children : (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5"><Lock className="h-3.5 w-3.5" />{t('dp.locked')}</p>
        </div>
      )}
    </section>
  );
}
