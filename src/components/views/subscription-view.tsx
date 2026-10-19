'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp, formatToman } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Loader2, ShieldCheck } from 'lucide-react';

interface CatalogItem { plan: string; amountMinor: number; currency: string; labelEn: string; labelFa: string }
interface Sub { id: string; plan: string; status: string; currentPeriodEnd: string | null; provider: string }
interface Payment { id: string; amount: number; currency: string; status: string; createdAt: string; subscriptionId: string }

export function SubscriptionView() {
  const { t, locale, refresh, setView } = useApp();
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [plan, setPlan] = useState('FREE');
  const [subs, setSubs] = useState<Sub[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ paymentId: string; plan: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/subscription').then((r) => r.json()).catch(() => null);
    if (res) {
      setCatalog(res.catalog ?? []);
      setPlan(res.plan);
      setSubs(res.subscriptions ?? []);
      setPayments((res.subscriptions ?? []).flatMap((s: Sub & { payments: Payment[] }) => s.payments ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCheckout = async (target: string) => {
    setBusy(target);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: target }),
      });
      const data = await res.json();
      if (res.ok) setCheckout({ paymentId: data.paymentId, plan: target });
      else toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const confirmSandbox = async (result: 'SUCCEEDED' | 'FAILED') => {
    if (!checkout) return;
    setBusy('webhook');
    try {
      // Server-orchestrated sandbox confirmation: the client never signs
      // anything; the server verifies ownership, PENDING state and applies
      // entitlements atomically (see /api/subscription/confirm).
      const res = await fetch('/api/subscription/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: checkout.paymentId, result }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'SUCCEEDED') {
        toast({ description: t('common.done') });
      } else if (res.ok) {
        toast({ description: t('common.error'), variant: 'destructive' });
      } else {
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
      setCheckout(null);
      await load();
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (subscriptionId: string) => {
    setBusy('cancel');
    try {
      await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      await load();
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const featureKeys = ['sub.features.ai', 'sub.features.layers', 'sub.features.guided', 'sub.features.family', 'sub.features.export'];

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="h-6 w-6 text-primary" />{t('sub.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('sub.sub')}</p>
      </header>

      <Card className="niva-card niva-grad">
        <CardContent className="p-5 flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('sub.current')}</p>
            <p className="text-2xl font-bold">{plan === 'FREE' ? t('sub.free') : plan.replace('_', ' ').toLowerCase()}</p>
          </div>
          <Badge variant="secondary" className="ms-auto"><ShieldCheck className="h-3 w-3 me-1" />{locale === 'fa' ? 'مجوز سمت سرور' : 'Server-side entitlements'}</Badge>
        </CardContent>
      </Card>

      {loading ? <Skeleton className="h-48 w-full" /> : (
        <div className="grid sm:grid-cols-3 gap-3">
          {catalog.map((c) => (
            <Card key={c.plan} className={`niva-card ${plan === c.plan ? 'border-primary ring-1 ring-primary/40' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{locale === 'fa' ? c.labelFa : c.labelEn}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xl font-bold num">{formatToman(c.amountMinor, locale)}</p>
                <ul className="space-y-1.5 text-xs">
                  {featureKeys.map((k) => (
                    <li key={k} className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />{t(k)}</li>
                  ))}
                </ul>
                <Button
                  className="w-full min-h-11"
                  variant={plan === c.plan ? 'secondary' : 'default'}
                  disabled={plan === c.plan || busy === c.plan}
                  onClick={() => startCheckout(c.plan)}
                >
                  {busy === c.plan && <Loader2 className="h-4 w-4 animate-spin" />}
                  {plan === c.plan ? t('sub.current') : t('sub.upgrade')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sandbox subscriptions + payments */}
      {!loading && subs.filter((s) => s.plan !== 'FREE').length > 0 && (
        <section aria-label={t('sub.cancel')}>
          <h2 className="font-semibold mb-2">{t('sub.current')}</h2>
          <div className="space-y-2">
            {subs.filter((s) => s.plan !== 'FREE').map((s) => (
              <Card key={s.id} className="niva-card"><CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
                <Badge>{s.plan}</Badge>
                <Badge variant="outline">{s.status}</Badge>
                <span className="text-xs text-muted-foreground num">{s.provider}</span>
                {s.currentPeriodEnd && <span className="text-xs text-muted-foreground num ms-auto">{new Date(s.currentPeriodEnd).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>}
                {s.status === 'ACTIVE' && (
                  <Button variant="ghost" size="sm" className="text-destructive min-h-9" onClick={() => cancel(s.id)} disabled={busy === 'cancel'}>
                    {t('sub.cancel')}
                  </Button>
                )}
              </CardContent></Card>
            ))}
          </div>
        </section>
      )}

      {payments.length > 0 && (
        <section aria-label={t('sub.invoices')}>
          <h2 className="font-semibold mb-2">{t('sub.invoices')}</h2>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/70 text-xs text-muted-foreground">
                <tr>
                  <th className="p-2.5 text-start num">#</th>
                  <th className="p-2.5 text-start">{t('sub.amount')}</th>
                  <th className="p-2.5 text-start">{t('sub.status')}</th>
                  <th className="p-2.5 text-start">{t('track.date')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2.5 num">{i + 1}</td>
                    <td className="p-2.5 num">{formatToman(p.amount, locale)}</td>
                    <td className="p-2.5"><Badge variant={p.status === 'SUCCEEDED' ? 'default' : 'outline'} className="text-[10px]">{p.status}</Badge></td>
                    <td className="p-2.5 num">{new Date(p.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Sandbox checkout dialog */}
      <Dialog open={Boolean(checkout)} onOpenChange={(o) => { if (!o) setCheckout(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('sub.confirmTitle')}</DialogTitle>
            <DialogDescription>{t('sub.confirmBody')}</DialogDescription>
          </DialogHeader>
          <Badge className="w-fit bg-warning/15 text-warning-foreground">{t('sub.sandbox')}</Badge>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => confirmSandbox('FAILED')} disabled={busy === 'webhook'} className="min-h-11">
              {t('common.cancel')}
            </Button>
            <Button onClick={() => confirmSandbox('SUCCEEDED')} disabled={busy === 'webhook'} className="min-h-11">
              {busy === 'webhook' && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('sub.pay')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {locale === 'fa'
          ? 'درگاه‌های واقعی (زرین‌پال برای ایران، ارائه‌دهندگان بین‌المللی برای بازار جهانی) در معماری آداپتری مستند شده‌اند و نیازمند اعتبارنامه و قرارداد تجاری هستند. هیچ پرداخت واقعی در این نسخه انجام نمی‌شود.'
          : 'Live gateways (Zarinpal for Iran, international providers for global markets) are specified in the adapter architecture and require credentials and commercial agreements. No real payment occurs in this build.'}
      </p>
      <Button variant="ghost" size="sm" onClick={() => setView('settings')}>{t('common.settings')}</Button>
    </div>
  );
}
