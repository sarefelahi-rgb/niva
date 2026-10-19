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
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, UserX } from 'lucide-react';

interface Grant {
  id: string; partnerEmail: string; partnerName: string | null; permissions: string[];
  status: string; invitedAt: string;
}
const PERMS: Array<[string, string]> = [
  ['VIEW_TIMELINE', 'family.permTimeline'],
  ['VIEW_APPOINTMENTS', 'family.permAppointments'],
  ['VIEW_TRACKING', 'family.permTracking'],
  ['VIEW_JOURNAL', 'family.permJournal'],
];

export function FamilyView() {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [entitled, setEntitled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [perms, setPerms] = useState<string[]>(['VIEW_TIMELINE']);

  const load = useCallback(async () => {
    const res = await fetch('/api/family').then((r) => r.json()).catch(() => null);
    if (res) { setGrants(res.grants ?? []); setEntitled(Boolean(res.entitled)); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
        toast({ description: data?.error?.message ?? t('err.validation'), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    await fetch(`/api/family?id=${id}`, { method: 'PATCH' });
    await load();
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t('family.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('family.sub')}</p>
      </header>

      {!entitled && (
        <Card className="niva-card border-warning/40">
          <CardContent className="p-5 text-sm leading-relaxed">{t('family.premiumNote')}</CardContent>
        </Card>
      )}

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
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{g.partnerName || g.partnerEmail}</p>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{g.partnerEmail}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {g.permissions.map((p) => <Badge key={p} variant="secondary" className="text-[10px]">{t(PERMS.find(([k]) => k === p)?.[1] ?? p)}</Badge>)}
                  </div>
                </div>
                <Badge variant={g.status === 'ACTIVE' ? 'default' : g.status === 'INVITED' ? 'secondary' : 'outline'}>
                  {g.status === 'ACTIVE' ? t('family.active') : g.status === 'INVITED' ? t('family.invited') : t('family.revoked')}
                </Badge>
                {g.status !== 'REVOKED' && (
                  <Button variant="ghost" size="sm" onClick={() => revoke(g.id)} className="text-destructive min-h-9">
                    <UserX className="h-4 w-4 me-1" />{t('family.revoke')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
