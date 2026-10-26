'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatDateTime, formatMoney, formatRelativeTime } from '@/lib/format';
import { ConsultRoomDialog, type ConsultRoomInfo } from '@/components/consult/consult-room-dialog';
import {
  Hospital, Search, CalendarPlus, Video, Mic, MapPin, Star, ShieldCheck, Loader2,
  Lock, BadgeCheck,
} from 'lucide-react';

/**
 * Wave 11 — patient-facing doctors & visits view.
 *  - Directory of APPROVED doctors (search by name/specialty).
 *  - Booking dialog: visit type → day → free slot → reason → per-doctor
 *    consent switches (tracking / records / daily log).
 *  - "My visits" list with cancel + consent editing + consultation-room entry
 *    for confirmed online (voice/video) consultations.
 */

interface DoctorRow {
  id: string; name: string; specialty: string; subSpecialty: string | null; bio: string | null;
  city: string | null; clinicName: string | null; clinicAddress: string | null;
  visitTypes: 'CLINIC' | 'ONLINE' | 'BOTH'; clinicFee: number | null; onlineFee: number | null;
  experienceYears: number; ratingAvg: number; openWeek: boolean; activeBookings: number;
}
interface BookingRow {
  id: string; mode: 'CLINIC' | 'ONLINE_VOICE' | 'ONLINE_VIDEO'; scheduledAt: string; status: string;
  reason: string | null; shareTracking: boolean; shareRecords: boolean; shareDaily: boolean;
  doctor: { id: string; specialty: string; clinicName: string | null; clinicAddress: string | null; user: { name: string } };
}
interface DaySlots { date: string; weekday: number; slots: { startsAt: string; durationMin: number }[] }

/** Time-only label for slot buttons (locale-aware, always renders the instant's local time). */
const timeFmtCache = new Map<string, Intl.DateTimeFormat>();
function formatTime(iso: string, locale: string): string {
  const key = locale;
  let fmt = timeFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    timeFmtCache.set(key, fmt);
  }
  return fmt.format(new Date(iso));
}

export function DoctorsView() {
  const { t, locale } = useApp();
  const { toast } = useToast();

  const [doctors, setDoctors] = useState<DoctorRow[] | null>(null);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const [d, b] = await Promise.all([
      fetch('/api/doctors').then((r) => r.json()).catch(() => null),
      fetch('/api/consultations').then((r) => r.json()).catch(() => null),
    ]);
    if (d) setDoctors(d.doctors ?? []);
    if (b) setBookings(b.consultations ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!doctors) return null;
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) => `${d.name} ${d.specialty} ${d.subSpecialty ?? ''} ${d.city ?? ''}`.toLowerCase().includes(q));
  }, [doctors, query]);

  const upcoming = (bookings ?? [])
    .filter((b) => (b.status === 'REQUESTED' || b.status === 'CONFIRMED') && new Date(b.scheduledAt).getTime() > Date.now() - 3_600_000)
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
  const past = (bookings ?? []).filter((b) => !upcoming.includes(b));

  // ── booking dialog state ──
  const [bookDoctor, setBookDoctor] = useState<DoctorRow | null>(null);
  const [detail, setDetail] = useState<{ doctor: DoctorRow; days: DaySlots[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mode, setMode] = useState<'CLINIC' | 'ONLINE_VOICE' | 'ONLINE_VIDEO'>('CLINIC');
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [shareTracking, setShareTracking] = useState(false);
  const [shareRecords, setShareRecords] = useState(false);
  const [shareDaily, setShareDaily] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── consent editor + room ──
  const [consentRow, setConsentRow] = useState<BookingRow | null>(null);
  const [cancelRow, setCancelRow] = useState<BookingRow | null>(null);
  const [roomInfo, setRoomInfo] = useState<ConsultRoomInfo | null>(null);

  const openBooking = async (d: DoctorRow) => {
    setBookDoctor(d);
    setDetail(null);
    setDayIdx(0);
    setSlot(null);
    setReason('');
    setShareTracking(false);
    setShareRecords(false);
    setShareDaily(false);
    setMode(d.visitTypes === 'ONLINE' ? 'ONLINE_VIDEO' : 'CLINIC');
    setDetailLoading(true);
    const res = await fetch(`/api/doctors/${d.id}`).then((r) => r.json()).catch(() => null);
    setDetail(res?.doctor ? res : null);
    setDetailLoading(false);
  };

  const allowedModes = useMemo<{ value: 'CLINIC' | 'ONLINE_VOICE' | 'ONLINE_VIDEO'; label: string }[]>(() => {
    const vt = bookDoctor?.visitTypes ?? 'BOTH';
    const out: { value: 'CLINIC' | 'ONLINE_VOICE' | 'ONLINE_VIDEO'; label: string }[] = [];
    if (vt === 'CLINIC' || vt === 'BOTH') out.push({ value: 'CLINIC', label: t('doc.clinicVisit') });
    if (vt === 'ONLINE' || vt === 'BOTH') {
      out.push({ value: 'ONLINE_VOICE', label: t('doc.onlineVoice') });
      out.push({ value: 'ONLINE_VIDEO', label: t('doc.onlineVideo') });
    }
    return out;
  }, [bookDoctor, t]);

  const submitBooking = async () => {
    if (!detail || !slot) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: detail.doctor.id,
          mode,
          scheduledAt: slot,
          reason: reason.trim() || undefined,
          shareTracking,
          shareRecords,
          shareDaily,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
        return;
      }
      setBookDoctor(null);
      toast({ description: t('doc.booked') });
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const saveConsent = async (row: BookingRow, flags: { shareTracking: boolean; shareRecords: boolean; shareDaily: boolean }) => {
    const res = await fetch('/api/consultations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, action: 'confirm', ...flags }),
    });
    if (res.ok) {
      setConsentRow(null);
      toast({ description: t('common.done') });
      await load();
    }
  };

  const doCancel = async (row: BookingRow) => {
    const res = await fetch('/api/consultations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, action: 'cancel' }),
    });
    setCancelRow(null);
    if (res.ok) {
      toast({ description: t('doc.status.CANCELLED') });
      await load();
    }
  };

  const openRoom = (row: BookingRow) =>
    setRoomInfo({ id: row.id, mode: row.mode, scheduledAt: row.scheduledAt, counterpartName: row.doctor.user.name, viewer: 'patient' });

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Hospital className="h-6 w-6 text-primary" />{t('doc.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('doc.subtitle')}</p>
      </header>

      {/* ── My visits ─────────────────────────────────────────────────── */}
      <section aria-label={t('doc.myBookings')}>
        <h2 className="font-semibold mb-2">{t('doc.myBookings')}</h2>
        {bookings === null ? <Skeleton className="h-24 w-full" /> : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('doc.empty')}</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((b) => (
              <Card key={b.id} className="niva-card">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      {b.mode === 'CLINIC' ? <MapPin className="h-3 w-3" /> : b.mode === 'ONLINE_VOICE' ? <Mic className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                      {t(`doc.mode.${b.mode}`)}
                    </Badge>
                    <Badge variant={b.status === 'CONFIRMED' ? 'default' : 'secondary'}>{t(`doc.status.${b.status}`)}</Badge>
                    <span className="text-xs text-muted-foreground ms-auto">{formatRelativeTime(b.scheduledAt, locale)}</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-medium">{b.doctor.user.name}</p>
                    <p className="text-xs text-muted-foreground">{b.doctor.specialty}</p>
                  </div>
                  <p dir="auto" className="text-sm">{formatDateTime(b.scheduledAt, locale)}</p>
                  {b.mode === 'CLINIC' && b.doctor.clinicAddress && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{b.doctor.clinicAddress}</p>
                  )}
                  {b.reason && <p className="text-xs text-muted-foreground">{b.reason}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {b.mode !== 'CLINIC' && (
                      <Button size="sm" variant="outline" className="min-h-9" onClick={() => openRoom(b)}>
                        {b.mode === 'ONLINE_VIDEO' ? <Video className="h-4 w-4 me-1.5" /> : <Mic className="h-4 w-4 me-1.5" />}
                        {t('doc.joinRoom')}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="min-h-9" onClick={() => setConsentRow(b)}>
                      <ShieldCheck className="h-4 w-4 me-1.5" />
                      {t('doc.consentTitle')}
                    </Button>
                    <Button size="sm" variant="ghost" className="min-h-9 text-destructive hover:text-destructive" onClick={() => setCancelRow(b)}>
                      {t('doc.cancelBooking')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {past.slice(0, 6).map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-sm border-b pb-1.5 last:border-0">
                <Badge variant="secondary" className="text-[10px] px-1.5">{t(`doc.mode.${b.mode}`)}</Badge>
                <span className="truncate flex-1">{b.doctor.user.name}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">{t(`doc.status.${b.status}`)}</Badge>
                <span dir="auto" className="text-xs text-muted-foreground shrink-0">{formatDate(b.scheduledAt, locale)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Directory ─────────────────────────────────────────────────── */}
      <section aria-label={t('doc.find')}>
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <h2 className="font-semibold">{t('doc.find')}</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('doc.search')} className="ps-9 min-h-10" aria-label={t('doc.search')} />
          </div>
        </div>
        {filtered === null ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <Skeleton className="h-44 w-full" /><Skeleton className="h-44 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map((d) => (
              <Card key={d.id} className="niva-card flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-1.5">
                        {d.name}
                        <BadgeCheck className="h-4 w-4 text-primary" aria-label={t('adm.status.APPROVED')} />
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.specialty}{d.subSpecialty ? ` · ${d.subSpecialty}` : ''}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                      <Star className="h-3 w-3 text-amber-500" aria-hidden="true" />
                      {d.ratingAvg.toFixed(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto space-y-2.5">
                  {d.bio && <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{d.bio}</p>}
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {(d.visitTypes === 'CLINIC' || d.visitTypes === 'BOTH') && (
                      <Badge variant="secondary" className="gap-1"><MapPin className="h-3 w-3" />{t('doc.clinicVisit')}{d.clinicFee != null ? ` · ${formatMoney(d.clinicFee, 'IRR', locale)}` : ''}</Badge>
                    )}
                    {(d.visitTypes === 'ONLINE' || d.visitTypes === 'BOTH') && (
                      <Badge variant="secondary" className="gap-1"><Video className="h-3 w-3" />{t('doc.onlineVideo')}{d.onlineFee != null ? ` · ${formatMoney(d.onlineFee, 'IRR', locale)}` : ''}</Badge>
                    )}
                    {d.city && <Badge variant="outline" className="gap-1">{d.city}</Badge>}
                    {d.experienceYears > 0 && <Badge variant="outline">{t('doc.experience').replace('{y}', String(d.experienceYears))}</Badge>}
                  </div>
                  <Button size="sm" className="w-full min-h-10" onClick={() => openBooking(d)}>
                    <CalendarPlus className="h-4 w-4 me-1.5" />
                    {t('doc.book')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Booking dialog ────────────────────────────────────────────── */}
      <Dialog open={bookDoctor !== null} onOpenChange={(v) => !v && setBookDoctor(null)}>
        <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto" aria-label={t('doc.book')}>
          <DialogHeader>
            <DialogTitle>{t('doc.book')} — {bookDoctor?.name}</DialogTitle>
            <DialogDescription dir="auto">{bookDoctor?.specialty}{bookDoctor?.clinicName ? ` · ${bookDoctor.clinicName}` : ''}</DialogDescription>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="space-y-3 py-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /></div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>{t('doc.mode')}</Label>
                <div className="flex flex-wrap gap-2" role="group" aria-label={t('doc.mode')}>
                  {allowedModes.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => { setMode(m.value); setSlot(null); }}
                      aria-pressed={mode === m.value}
                      className={`rounded-lg border px-3.5 py-2 text-sm min-h-10 transition-colors ${mode === m.value ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                    >
                      {m.value !== 'CLINIC' && (m.value === 'ONLINE_VIDEO' ? <Video className="inline h-3.5 w-3.5 me-1.5" /> : <Mic className="inline h-3.5 w-3.5 me-1.5" />)}
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mode === 'CLINIC'
                    ? `${t('doc.feeClinic')}: ${detail.doctor.clinicFee != null ? formatMoney(detail.doctor.clinicFee, 'IRR', locale) : '—'}`
                    : `${t('doc.feeOnline')}: ${detail.doctor.onlineFee != null ? formatMoney(detail.doctor.onlineFee, 'IRR', locale) : '—'}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t('doc.pickDay')}</Label>
                {detail.days.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('doc.noSlots')}</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label={t('doc.pickDay')}>
                    {detail.days.map((day, i) => (
                      <button
                        key={day.date}
                        type="button"
                        role="option"
                        aria-selected={dayIdx === i}
                        onClick={() => { setDayIdx(i); setSlot(null); }}
                        className={`shrink-0 rounded-lg border px-3 py-2 text-xs min-h-11 transition-colors ${dayIdx === i ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                      >
                        <span className="block" dir="auto">{formatDate(day.date, locale, 'short')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {detail.days[dayIdx] && (
                <div className="space-y-2">
                  <Label>{t('doc.pickSlot')}</Label>
                  <div className="flex flex-wrap gap-2" role="listbox" aria-label={t('doc.pickSlot')}>
                    {detail.days[dayIdx].slots.map((s) => (
                      <button
                        key={s.startsAt}
                        type="button"
                        role="option"
                        aria-selected={slot === s.startsAt}
                        onClick={() => setSlot(s.startsAt)}
                        className={`rounded-lg border px-3 py-1.5 text-sm num min-h-9 transition-colors ${slot === s.startsAt ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                      >
                        {formatTime(s.startsAt, locale)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="doc-reason">{t('doc.reason')}</Label>
                <Textarea id="doc-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('doc.reasonPh')} rows={2} />
              </div>

              <div className="rounded-xl border bg-muted/40 p-3.5 space-y-3">
                <p className="text-sm font-medium flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" />{t('doc.consentTitle')}</p>
                <div className="space-y-2.5">
                  {[
                    { checked: shareTracking, set: setShareTracking, label: t('doc.consentTracking') },
                    { checked: shareRecords, set: setShareRecords, label: t('doc.consentRecords') },
                    { checked: shareDaily, set: setShareDaily, label: t('doc.consentDaily') },
                  ].map((c) => (
                    <label key={c.label} className="flex items-start justify-between gap-3 text-xs leading-relaxed cursor-pointer">
                      <span>{c.label}</span>
                      <Switch checked={c.checked} onCheckedChange={(v) => c.set(v)} className="mt-0.5 shrink-0" />
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{t('doc.consentNote')}</p>
              </div>

              <Button className="w-full min-h-12 text-base" disabled={!slot || submitting} onClick={submitBooking}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('doc.confirmBooking')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Consent editor ───────────────────────────────────────────── */}
      <Dialog open={consentRow !== null} onOpenChange={(v) => !v && setConsentRow(null)}>
        <DialogContent className="max-w-md" aria-label={t('doc.consentTitle')}>
          <DialogHeader>
            <DialogTitle className="text-base">{t('doc.consentTitle')}</DialogTitle>
            {consentRow && (
            <DialogDescription dir="auto">{consentRow.doctor.user.name} · {formatDateTime(consentRow.scheduledAt, locale)}</DialogDescription>
          )}
          </DialogHeader>
          {consentRow && (
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { key: 'shareTracking' as const, checked: consentRow.shareTracking, set: (v: boolean) => setConsentRow({ ...consentRow, shareTracking: v }), label: t('doc.consentTracking') },
                  { key: 'shareRecords' as const, checked: consentRow.shareRecords, set: (v: boolean) => setConsentRow({ ...consentRow, shareRecords: v }), label: t('doc.consentRecords') },
                  { key: 'shareDaily' as const, checked: consentRow.shareDaily, set: (v: boolean) => setConsentRow({ ...consentRow, shareDaily: v }), label: t('doc.consentDaily') },
                ].map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3 text-sm leading-relaxed">
                    <span>{c.label}</span>
                    <Switch checked={c.checked} onCheckedChange={c.set} className="mt-0.5 shrink-0" aria-label={c.label} />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <Lock className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
                {t('doc.consentNote')}
              </p>
              <Button
                className="w-full min-h-11"
                onClick={() => saveConsent(consentRow, { shareTracking: consentRow.shareTracking, shareRecords: consentRow.shareRecords, shareDaily: consentRow.shareDaily })}
              >
                {t('common.save')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cancel confirm ───────────────────────────────────────────── */}
      <AlertDialog open={cancelRow !== null} onOpenChange={(v) => !v && setCancelRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('doc.cancelConfirm')}</AlertDialogTitle>
            <AlertDialogDescription dir="auto">
              {cancelRow && `${cancelRow.doctor.user.name} · ${formatDateTime(cancelRow.scheduledAt, locale)}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => cancelRow && doCancel(cancelRow)}>
              {t('doc.cancelBooking')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Consultation room ────────────────────────────────────────── */}
      <ConsultRoomDialog open={roomInfo !== null} onOpenChange={(v) => !v && setRoomInfo(null)} info={roomInfo} />
    </div>
  );
}
