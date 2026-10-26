'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { normalizeDigits } from '@/lib/phone';
import { Stethoscope, UserPlus, Loader2, ShieldCheck, Ban, Phone } from 'lucide-react';

/**
 * Wave 11 — admin doctor-account management.
 * Grant = create (or promote an existing phone-matched user) as role=DOCTOR
 * with a DoctorProfile; the doctor then signs in with mobile OTP only.
 * Approve/suspend controls directory visibility instantly.
 */

interface DoctorAdminRow {
  id: string; name: string; phone: string | null; email: string; specialty: string; subSpecialty: string | null;
  city: string | null; clinicName: string | null; visitTypes: string; status: string; experienceYears: number;
  bookings: number; deactivated: boolean; createdAt: string;
}

export function AdminDoctors() {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [rows, setRows] = useState<DoctorAdminRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // form state
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [subSpecialty, setSubSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [bio, setBio] = useState('');
  const [visitTypes, setVisitTypes] = useState('BOTH');
  const [clinicFee, setClinicFee] = useState('');
  const [onlineFee, setOnlineFee] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [approved, setApproved] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/doctors').then((r) => r.json()).catch(() => null);
    if (res) setRows(res.doctors ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        phone: normalizeDigits(phone),
        name,
        specialty,
        visitTypes,
        experienceYears: Number(normalizeDigits(experienceYears) || 0),
        status: approved ? 'APPROVED' : 'PENDING',
      };
      if (subSpecialty.trim()) body.subSpecialty = subSpecialty.trim();
      if (city.trim()) body.city = city.trim();
      if (clinicName.trim()) body.clinicName = clinicName.trim();
      if (clinicAddress.trim()) body.clinicAddress = clinicAddress.trim();
      if (licenseNo.trim()) body.licenseNo = licenseNo.trim();
      if (bio.trim()) body.bio = bio.trim();
      if (clinicFee.trim()) body.clinicFee = Number(normalizeDigits(clinicFee).replace(/\D/g, ''));
      if (onlineFee.trim()) body.onlineFee = Number(normalizeDigits(onlineFee).replace(/\D/g, ''));

      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
        return;
      }
      toast({ description: t('adm.granted') });
      setPhone(''); setName(''); setSpecialty(''); setSubSpecialty(''); setCity(''); setClinicName('');
      setClinicAddress(''); setLicenseNo(''); setBio(''); setClinicFee(''); setOnlineFee(''); setExperienceYears('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (row: DoctorAdminRow, status: 'APPROVED' | 'SUSPENDED' | 'PENDING') => {
    setBusyId(row.id);
    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, status }),
      });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="niva-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" />{t('adm.grantDoctor')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3" aria-label={t('adm.grantDoctor')}>
            <div className="space-y-1.5">
              <Label htmlFor="ad-phone">{t('adm.doctorPhone')}</Label>
              <Input id="ad-phone" dir="ltr" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912…" className="min-h-11 num" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-name">{t('adm.doctorName')}</Label>
              <Input id="ad-name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-spec">{t('adm.doctorSpecialty')}</Label>
              <Input id="ad-spec" required minLength={2} maxLength={80} value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-sub">{t('adm.doctorSub')}</Label>
              <Input id="ad-sub" maxLength={80} value={subSpecialty} onChange={(e) => setSubSpecialty(e.target.value)} className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-city">{t('adm.doctorCity')}</Label>
              <Input id="ad-city" maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-clinic">{t('adm.doctorClinic')}</Label>
              <Input id="ad-clinic" maxLength={120} value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="min-h-11" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ad-addr">{t('adm.doctorAddress')}</Label>
              <Input id="ad-addr" maxLength={200} value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('adm.doctorVisits')}</Label>
              <Select value={visitTypes} onValueChange={setVisitTypes}>
                <SelectTrigger className="min-h-11" aria-label={t('adm.doctorVisits')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOTH">{t('doc.clinicVisit')} + {t('doc.onlineVideo')}</SelectItem>
                  <SelectItem value="CLINIC">{t('doc.clinicVisit')}</SelectItem>
                  <SelectItem value="ONLINE">{t('doc.onlineVoice')} / {t('doc.onlineVideo')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-exp">{t('adm.doctorExp')}</Label>
              <Input id="ad-exp" dir="ltr" inputMode="numeric" maxLength={2} value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} className="min-h-11 num" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-cfee">{t('adm.doctorFeeClinic')}</Label>
              <Input id="ad-cfee" dir="ltr" inputMode="numeric" value={clinicFee} onChange={(e) => setClinicFee(e.target.value)} className="min-h-11 num" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-ofee">{t('adm.doctorFeeOnline')}</Label>
              <Input id="ad-ofee" dir="ltr" inputMode="numeric" value={onlineFee} onChange={(e) => setOnlineFee(e.target.value)} className="min-h-11 num" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-license">{t('adm.doctorLicense')}</Label>
              <Input id="ad-license" dir="ltr" maxLength={40} value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} className="min-h-11" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ad-bio">{t('adm.doctorBio')}</Label>
              <Textarea id="ad-bio" rows={2} maxLength={1000} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <label className="flex items-center justify-between gap-3 text-sm sm:col-span-2 cursor-pointer">
              <span>{t('adm.status.APPROVED')} — {t('adm.approve')}؟</span>
              <Switch checked={approved} onCheckedChange={(v) => setApproved(v)} aria-label={t('adm.status.APPROVED')} />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" className="min-h-11" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4 me-2" />}
                {t('adm.grant')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section aria-label={t('adm.doctorList')} className="space-y-2">
        <h3 className="font-semibold text-sm">{t('adm.doctorList')}</h3>
        {rows === null ? <Skeleton className="h-32 w-full" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
        ) : (
          <div className="space-y-2">
            {rows.map((d) => (
              <Card key={d.id} className="niva-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{d.name}</p>
                    <Badge variant={d.status === 'APPROVED' ? 'default' : d.status === 'SUSPENDED' ? 'destructive' : 'secondary'}>
                      {t(`adm.status.${d.status}`)}
                    </Badge>
                    <span className="text-xs text-muted-foreground ms-auto">{t('adm.bookings').replace('{n}', String(d.bookings))}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.specialty}{d.subSpecialty ? ` · ${d.subSpecialty}` : ''}{d.city ? ` · ${d.city}` : ''}</p>
                  {d.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 num" dir="ltr"><Phone className="h-3 w-3" />{d.phone}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {d.status !== 'APPROVED' && (
                      <Button size="sm" variant="outline" className="min-h-9" disabled={busyId === d.id} onClick={() => setStatus(d, 'APPROVED')}>
                        <ShieldCheck className="h-4 w-4 me-1.5" />{t('adm.approve')}
                      </Button>
                    )}
                    {d.status !== 'SUSPENDED' && (
                      <Button size="sm" variant="ghost" className="min-h-9 text-destructive hover:text-destructive" disabled={busyId === d.id} onClick={() => setStatus(d, 'SUSPENDED')}>
                        <Ban className="h-4 w-4 me-1.5" />{t('adm.suspend')}
                      </Button>
                    )}
                    <span dir="auto" className="text-xs text-muted-foreground ms-auto self-center">{formatDate(d.createdAt, locale)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
