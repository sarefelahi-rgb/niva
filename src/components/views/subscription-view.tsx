'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp, formatToman } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock, Check, Crown, Loader2, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react';

interface CatalogItem { plan: string; amountMinor: number; currency: string; periodDays: number; labelEn: string; labelFa: string }
interface Sub {
  id: string; plan: string; status: string; currentPeriodEnd: string | null;
  trialEndsAt: string | null; cancelAtPeriodEnd: boolean; provider: string; cancelledAt: string | null;
}
interface Payment { id: string; amount: number; currency: string; status: string; createdAt: string; subscriptionId: string }
interface Invoice {
  id: string; number: string; amountMinor: number; currency: string; taxMinor: number; status: string;
  issuedAt: string; lineItems: Array<{ descriptionEn: string; descriptionFa: string; amountMinor: number; periodDays: number }>;
}

/** Localized money: IRR displays as Tomans (minor unit = rial → ÷10), USD via Intl currency. */
function formatMoney(amountMinor: number, currency: string, locale: string): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', { style: 'currency', currency: 'USD' }).format(amountMinor / 100);
  }
  return formatToman(amountMinor, locale === 'fa' ? 'fa' : 'en');
}

export function SubscriptionView() {
  const { t, locale, refresh, setView } = useApp();
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [plan, setPlan] = useState('FREE');
  const [subs, setSubs] = useState<Sub[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [trialEligible, setTrialEligible] = useState(false);
  const [pspReason, setPspReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ paymentId: string; plan: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Sub | null>(null);
  const [cancelWhen, setCancelWhen] = useState<'period_end' | 'immediate'>('period_end');

  const fa = locale === 'fa';
  const fmtDate = useCallback(
    (d: string | null) => (d ? new Date(d).toLocaleDateString(fa ? 'fa-IR' : 'en-US') : '—'),
    [fa]
  );
  const fill = useCallback((template: string, vars: Record<string, string>) => {
    let out = template;
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v);
    return out;
  }, []);

  const load = useCallback(async () => {
    const [subRes, invRes] = await Promise.all([
      fetch('/api/subscription').then((r) => r.json()).catch(() => null),
      fetch('/api/subscription/invoices').then((r) => r.json()).catch(() => null),
    ]);
    if (subRes) {
      setCatalog(subRes.catalog ?? []);
      setPlan(subRes.plan);
      setSubs(subRes.subscriptions ?? []);
      setPayments((subRes.subscriptions ?? []).flatMap((s: Sub & { payments: Payment[] }) => s.payments ?? []));
      setTrialEligible(Boolean(subRes.trialEligible));
      setPspReason(String(subRes.psp?.reason ?? ''));
    }
    if (invRes) setInvoices(invRes.invoices ?? []);
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
      // entitlements + invoice atomically (see /api/subscription/confirm).
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

  const startTrial = async () => {
    setBusy('trial');
    try {
      const res = await fetch('/api/subscription/trial', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast({ description: t('billing.trial.started') });
        await load();
        await refresh();
      } else {
        toast({
          description: data?.error?.code === 'TRIAL_INELIGIBLE' ? t('billing.trial.ineligible') : (data?.error?.message ?? t('common.error')),
          variant: 'destructive',
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    setBusy('cancel');
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: cancelTarget.id, when: cancelWhen }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast({
          description:
            cancelWhen === 'period_end'
              ? fill(t('billing.cancel.scheduledToast'), { date: fmtDate(data?.endsAt ?? cancelTarget.currentPeriodEnd) })
              : t('billing.cancel.doneToast'),
        });
        setCancelTarget(null);
        await load();
        await refresh();
      } else {
        toast({ description: data?.error?.message ?? t('common.error'), variant: 'destructive' });
      }
    } finally {
      setBusy(null);
    }
  };

  const activeSubs = useMemo(() => subs.filter((s) => s.plan !== 'FREE'), [subs]);

  const daysLeft = (s: Sub): number | null => {
    const end = s.status === 'TRIALING' ? s.trialEndsAt : s.currentPeriodEnd;
    if (!end) return null;
    const ms = new Date(end).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
  };

  const statusChip = (s: Sub) => {
    if (s.cancelAtPeriodEnd && s.status === 'ACTIVE') {
      return (
        <Badge variant="outline" className="gap-1 text-warning-foreground border-warning/40">
          <CalendarClock className="h-3 w-3" />
          {fill(t('billing.cancel.pendingBadge'), { date: fmtDate(s.currentPeriodEnd) })}
        </Badge>
      );
    }
    const label = t(`billing.state.${s.status}`);
    if (s.status === 'TRIALING') {
      const d = daysLeft(s);
      return (
        <Badge className="gap-1 bg-secondary text-secondary-foreground">
          <Sparkles className="h-3 w-3" />
          {label}
          {d !== null ? ` · ${fill(t('billing.trial.daysLeft'), { days: fa ? d.toLocaleString('fa-IR') : String(d) })}` : ''}
        </Badge>
      );
    }
    return <Badge variant="outline">{label}</Badge>;
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
          <Badge variant="secondary" className="ms-auto"><ShieldCheck className="h-3 w-3 me-1" />{fa ? 'مجوز سمت سرور' : 'Server-side entitlements'}</Badge>
        </CardContent>
      </Card>

      {/* Free trial — only rendered when the server says the account is eligible */}
      {!loading && trialEligible && (
        <Card className="niva-card border-secondary ring-1 ring-secondary/40">
          <CardContent className="p-5 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-56">
              <p className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-secondary" />{t('billing.trial.badge')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('billing.trial.hint')}</p>
            </div>
            <Button onClick={startTrial} disabled={busy === 'trial'} className="min-h-11">
              {busy === 'trial' && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('billing.trial.cta')}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? <Skeleton className="h-48 w-full" /> : (
        <div className="grid sm:grid-cols-3 gap-3">
          {catalog.map((c) => (
            <Card key={`${c.plan}-${c.currency}`} className={`niva-card ${plan === c.plan ? 'border-primary ring-1 ring-primary/40' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{fa ? c.labelFa : c.labelEn}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xl font-bold num">{formatMoney(c.amountMinor, c.currency, locale)}</p>
                <p className="text-xs text-muted-foreground num">
                  {fa ? `${c.periodDays.toLocaleString('fa-IR')} روزه` : `${c.periodDays}-day period`}
                </p>
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

      {/* Subscriptions with real state chips (trial countdown, scheduled cancellation) */}
      {!loading && activeSubs.length > 0 && (
        <section aria-label={t('sub.cancel')}>
          <h2 className="font-semibold mb-2">{t('sub.current')}</h2>
          <div className="space-y-2">
            {activeSubs.map((s) => (
              <Card key={s.id} className="niva-card"><CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
                <Badge>{s.plan === 'PREMIUM_MONTHLY' && s.status === 'TRIALING' ? t('billing.trial.badge') : s.plan}</Badge>
                {statusChip(s)}
                <span className="text-xs text-muted-foreground num">{s.provider}</span>
                {s.currentPeriodEnd && (
                  <span className="text-xs text-muted-foreground num ms-auto">
                    {s.status === 'TRIALING'
                      ? fill(t('billing.trial.endsOn'), { date: fmtDate(s.trialEndsAt) })
                      : `${fa ? 'پایان دوره: ' : 'Period end: '}${fmtDate(s.currentPeriodEnd)}`}
                  </span>
                )}
                {(s.status === 'ACTIVE' || s.status === 'TRIALING') && !s.cancelAtPeriodEnd && (
                  <Button variant="ghost" size="sm" className="text-destructive min-h-9" onClick={() => { setCancelTarget(s); setCancelWhen(s.status === 'ACTIVE' ? 'period_end' : 'immediate'); }}>
                    {t('sub.cancel')}
                  </Button>
                )}
              </CardContent></Card>
            ))}
          </div>
        </section>
      )}

      {/* Invoices — real records issued on every SUCCEEDED payment */}
      {!loading && (
        <section aria-label={t('billing.invoices.title')}>
          <h2 className="font-semibold mb-2 flex items-center gap-2"><ReceiptText className="h-4 w-4 text-primary" />{t('billing.invoices.title')}</h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('billing.invoices.empty')}</p>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/70 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2.5 text-start">{t('billing.invoices.number')}</th>
                    <th className="p-2.5 text-start">{t('billing.invoices.item')}</th>
                    <th className="p-2.5 text-start">{t('sub.amount')}</th>
                    <th className="p-2.5 text-start">{t('sub.status')}</th>
                    <th className="p-2.5 text-start">{t('billing.invoices.issued')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-t">
                      <td className="p-2.5 num">{inv.number}</td>
                      <td className="p-2.5 text-xs">
                        {(fa ? inv.lineItems.map((li) => li.descriptionFa) : inv.lineItems.map((li) => li.descriptionEn)).join(' · ')}
                      </td>
                      <td className="p-2.5 num">{formatMoney(inv.amountMinor, inv.currency, locale)}</td>
                      <td className="p-2.5"><Badge variant={inv.status === 'ISSUED' ? 'default' : 'outline'} className="text-[10px]">{inv.status === 'ISSUED' ? (fa ? 'صادر شده' : 'Issued') : inv.status}</Badge></td>
                      <td className="p-2.5 num">{fmtDate(inv.issuedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">{t('billing.invoices.pdfNote')}</p>
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

      {/* Cancellation dialog — period end (keeps access) vs immediate */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('billing.cancel.title')}</DialogTitle>
            <DialogDescription>{cancelTarget ? fill(t('billing.cancel.periodEndHint'), { date: fmtDate(cancelTarget.currentPeriodEnd) }) : ''}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={cancelWhen} onValueChange={(v) => setCancelWhen(v as 'period_end' | 'immediate')} className="gap-3">
            <div className="flex items-start gap-3 rounded-xl border p-3">
              <RadioGroupItem id="cancel-period" value="period_end" className="mt-1" />
              <div className="space-y-0.5">
                <Label htmlFor="cancel-period" className="font-medium cursor-pointer">{t('billing.cancel.periodEnd')}</Label>
                <p className="text-xs text-muted-foreground">
                  {cancelTarget ? fill(t('billing.cancel.periodEndHint'), { date: fmtDate(cancelTarget.currentPeriodEnd) }) : ''}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border p-3">
              <RadioGroupItem id="cancel-now" value="immediate" className="mt-1" />
              <div className="space-y-0.5">
                <Label htmlFor="cancel-now" className="font-medium cursor-pointer">{t('billing.cancel.now')}</Label>
                <p className="text-xs text-muted-foreground">{t('billing.cancel.nowHint')}</p>
              </div>
            </div>
          </RadioGroup>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)} className="min-h-11">{t('common.close')}</Button>
            <Button variant="destructive" onClick={submitCancel} disabled={busy === 'cancel'} className="min-h-11">
              {busy === 'cancel' && <Loader2 className="h-4 w-4 animate-spin" />}
              {cancelWhen === 'period_end' ? t('billing.cancel.confirmPeriod') : t('billing.cancel.confirmNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground leading-relaxed">{t('billing.refund.policy')}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{t('billing.pricing.local')}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {fa
          ? 'درگاه‌های واقعی (زرین‌پال برای ایران، ارائه‌دهندگان بین‌المللی برای بازار جهانی) در معماری آداپتری مستند شده‌اند و نیازمند اعتبارنامه و قرارداد تجاری هستند. هیچ پرداخت واقعی در این نسخه انجام نمی‌شود.'
          : 'Live gateways (Zarinpal for Iran, international providers for global markets) are specified in the adapter architecture and require credentials and commercial agreements. No real payment occurs in this build.'}
        {pspReason ? ` [PSP: ${pspReason}]` : ''}
      </p>
      <Button variant="ghost" size="sm" onClick={() => setView('settings')}>{t('common.settings')}</Button>
    </div>
  );
}
