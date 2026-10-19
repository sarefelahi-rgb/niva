'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Stethoscope, Loader2, Bell, Check } from 'lucide-react';

interface Appointment { id: string; title: string; type: string; provider: string | null; location: string | null; scheduledAt: string; status: string }
interface Reminder { id: string; title: string; type: string; dueAt: string; repeat: string; done: boolean }
const TYPES = ['CHECKUP', 'ULTRASOUND', 'LAB', 'SPECIALIST', 'VACCINE', 'OTHER'] as const;

export function AppointmentsView() {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [past, setPast] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rTitle, setRTitle] = useState('');
  const [rDue, setRDue] = useState('');
  const [rRepeat, setRRepeat] = useState('NONE');
  const [aTitle, setATitle] = useState('');
  const [aType, setAType] = useState('CHECKUP');
  const [aProvider, setAProvider] = useState('');
  const [aLocation, setALocation] = useState('');
  const [aWhen, setAWhen] = useState('');

  const load = useCallback(async () => {
    const [a, r] = await Promise.all([
      fetch('/api/appointments').then((x) => x.json()).catch(() => null),
      fetch('/api/reminders').then((x) => x.json()).catch(() => null),
    ]);
    if (a) { setUpcoming(a.upcoming ?? []); setPast(a.past ?? []); }
    if (r) setReminders(r.reminders ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: aTitle, type: aType, provider: aProvider || undefined, location: aLocation || undefined, scheduledAt: new Date(aWhen).toISOString() }),
      });
      if (res.ok) {
        setATitle(''); setAProvider(''); setALocation(''); setAWhen('');
        toast({ description: t('common.done') });
        await load();
      } else {
        toast({ description: t('err.validation'), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const setApptStatus = async (id: string, status: string) => {
    await fetch('/api/appointments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    await load();
  };

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: rTitle, dueAt: new Date(rDue).toISOString(), repeat: rRepeat, type: 'CUSTOM' }),
      });
      if (res.ok) {
        setRTitle(''); setRDue('');
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const completeReminder = async (id: string) => {
    await fetch(`/api/reminders?id=${id}`, { method: 'PATCH' });
    await load();
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="h-6 w-6 text-primary" />{t('appt.title')}</h1>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="niva-card">
          <CardHeader className="pb-3"><CardTitle className="text-base">{t('appt.add')}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addAppointment} className="grid sm:grid-cols-2 gap-3" aria-label={t('appt.add')}>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="a-title">{t('records.titleField')}</Label>
                <Input id="a-title" value={aTitle} onChange={(e) => setATitle(e.target.value)} required className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('appt.type')}</Label>
                <Select value={aType} onValueChange={setAType}>
                  <SelectTrigger className="min-h-11" aria-label={t('appt.type')}><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((ty) => <SelectItem key={ty} value={ty}>{ty}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-when">{t('appt.when')}</Label>
                <Input id="a-when" type="datetime-local" dir="ltr" value={aWhen} onChange={(e) => setAWhen(e.target.value)} required className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-provider">{t('appt.provider')}</Label>
                <Input id="a-provider" value={aProvider} onChange={(e) => setAProvider(e.target.value)} className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-loc">{t('appt.location')}</Label>
                <Input id="a-loc" value={aLocation} onChange={(e) => setALocation(e.target.value)} className="min-h-11" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy} className="min-h-11">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t('appt.add')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="niva-card">
          <CardHeader className="pb-3 flex-row items-center gap-2 space-y-0"><Bell className="h-4 w-4 text-primary" /><CardTitle className="text-base">{t('appt.addReminder')}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addReminder} className="grid sm:grid-cols-2 gap-3" aria-label={t('appt.addReminder')}>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="r-title">{t('records.titleField')}</Label>
                <Input id="r-title" value={rTitle} onChange={(e) => setRTitle(e.target.value)} required className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-due">{t('appt.when')}</Label>
                <Input id="r-due" type="datetime-local" dir="ltr" value={rDue} onChange={(e) => setRDue(e.target.value)} required className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('appt.repeat')}</Label>
                <Select value={rRepeat} onValueChange={setRRepeat}>
                  <SelectTrigger className="min-h-11" aria-label={t('appt.repeat')}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{t('appt.repeatNone')}</SelectItem>
                    <SelectItem value="DAILY">{t('appt.repeatDaily')}</SelectItem>
                    <SelectItem value="WEEKLY">{t('appt.repeatWeekly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="outline" disabled={busy} className="min-h-11">{t('appt.addReminder')}</Button>
              </div>
            </form>
            <div className="mt-4 space-y-2 border-t pt-3">
              {reminders.length === 0 && <p className="text-sm text-muted-foreground">{t('common.empty')}</p>}
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{r.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground num">{new Date(r.dueAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => completeReminder(r.id)} aria-label={t('appt.done')}>
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-4">
          <section aria-label={t('appt.next')}>
            <h2 className="font-semibold mb-2">{t('appt.next')}</h2>
            {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : (
              <div className="space-y-2">
                {upcoming.map((a) => (
                  <Card key={a.id} className="niva-card"><CardContent className="p-4 flex flex-wrap items-center gap-3">
                    <Badge>{a.type}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground num">{new Date(a.scheduledAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}{a.provider ? ` · ${a.provider}` : ''}</p>
                    </div>
                    <Button variant="outline" size="sm" className="min-h-9" onClick={() => setApptStatus(a.id, 'COMPLETED')}>{t('appt.done')}</Button>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </section>
          {past.length > 0 && (
            <section aria-label={t('appt.past')}>
              <h2 className="font-semibold mb-2">{t('appt.past')}</h2>
              <div className="space-y-2">
                {past.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm border-b pb-2 last:border-0">
                    <Badge variant="secondary">{a.status}</Badge>
                    <span className="truncate flex-1">{a.title}</span>
                    <span className="text-xs text-muted-foreground num">{new Date(a.scheduledAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
