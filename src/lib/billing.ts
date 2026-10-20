/**
 * NIVA billing domain logic — Wave 6.1.
 *
 * Three invariants this module owns (see docs/audit/10-psp.md):
 *  1. Every SUCCEEDED payment gets exactly one Invoice (paymentId unique),
 *     numbered NIVA-<year>-<6 digits> via a Setting counter inside the same
 *     transaction as the payment transition.
 *  2. Reconciliation is idempotent: ACTIVE/TRIALING subscriptions whose period
 *     ended are moved to EXPIRED (or CANCELLED when cancelAtPeriodEnd was set)
 *     exactly once, with entitlements degraded to FREE atomically.
 *  3. Refunds are full-or-partial against the *remaining* refundable amount;
 *     a payment is marked REFUNDED only when fully refunded, and a subscription
 *     is only cancelled by a refund when no other SUCCEEDED payment supports it.
 */

import { db } from '@/lib/db';
import { PLAN_CATALOG, setEntitlement, type Plan } from '@/lib/entitlements';
import { getPSP, PspError } from '@/lib/psp';
import { logAudit } from '@/lib/audit';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

// ─── Invoices ────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  descriptionEn: string;
  descriptionFa: string;
  amountMinor: number;
  periodDays: number;
}

/**
 * Issues the invoice for a SUCCEEDED payment inside the caller's transaction.
 * - Sequential number NIVA-<year>-<6 digits>: the counter lives in Setting
 *   (`invoiceSeq:<year>`). SQLite interactive transactions are serialized, so
 *   read-increment-write inside the tx cannot interleave; the Postgres
 *   production note (UPDATE ... RETURNING) is in docs/audit/10-psp.md.
 * - Idempotent by construction: Invoice.paymentId is UNIQUE — a replayed
 *   confirmation returns the existing invoice instead of throwing.
 */
export async function issueInvoice(
  tx: Tx,
  input: { payment: { id: string; amount: number; currency: string }; subscription: { id: string; userId: string; plan: string }; price: { labelEn: string; labelFa: string; periodDays: number } }
): Promise<{ id: string; number: string }> {
  const existing = await tx.invoice.findUnique({ where: { paymentId: input.payment.id } });
  if (existing) return { id: existing.id, number: existing.number };

  const year = new Date().getFullYear();
  const seqKey = `invoiceSeq:${year}`;
  const counter = await tx.setting.findUnique({ where: { key: seqKey } });
  const nextSeq = counter ? Number(counter.value) + 1 : 1;
  await tx.setting.upsert({
    where: { key: seqKey },
    create: { key: seqKey, value: String(nextSeq) },
    update: { value: String(nextSeq) },
  });
  const number = `NIVA-${year}-${String(nextSeq).padStart(6, '0')}`;

  const lineItems: InvoiceLineItem[] = [
    {
      descriptionEn: `${input.price.labelEn} — ${input.price.periodDays} days`,
      descriptionFa: `${input.price.labelFa} — ${input.price.periodDays} روزه`,
      amountMinor: input.payment.amount,
      periodDays: input.price.periodDays,
    },
  ];

  const invoice = await tx.invoice.create({
    data: {
      number,
      userId: input.subscription.userId,
      subscriptionId: input.subscription.id,
      paymentId: input.payment.id,
      amountMinor: input.payment.amount,
      currency: input.payment.currency,
      taxMinor: 0, // VAT handling is a jurisdiction-specific production step (docs/audit/10-psp.md)
      status: 'ISSUED',
      lineItems: JSON.stringify(lineItems),
    },
  });
  return { id: invoice.id, number: invoice.number };
}

/**
 * Maps the immutable (amountMinor, currency) pair of a payment back to the
 * catalog plan — the single derivation used by confirm + webhook paths.
 */
export function planForAmount(amountMinor: number, currency: string): { plan: Plan; periodDays: number; labelEn: string; labelFa: string } | null {
  const price = PLAN_CATALOG.find((p) => p.amountMinor === amountMinor && p.currency === currency);
  return price ? { plan: price.plan as Plan, periodDays: price.periodDays, labelEn: price.labelEn, labelFa: price.labelFa } : null;
}

// ─── Reconciliation ──────────────────────────────────────────────────────────

export interface ReconcileResult {
  changed: number;
  expired: number;
  trialExpired: number;
  cancelledAtPeriodEnd: number;
  ranAt: string;
}

function localized(userId: string, fa: { title: string; body: string }, en: { title: string; body: string }) {
  return db.user.findUnique({ where: { id: userId }, select: { locale: true } }).then((u) => (u?.locale === 'en' ? en : fa));
}

/**
 * Idempotent period-end reconciliation. Safe to call on every subscription
 * GET and from the scheduler tick (exported for the orchestrator to wire):
 *  - TRIALING past trialEndsAt            → EXPIRED + FREE + notification
 *  - ACTIVE past currentPeriodEnd          → CANCELLED (if cancelAtPeriodEnd)
 *                                            else EXPIRED — both + FREE + notification
 * Returns the number of subscriptions changed. Rows already transitioned are
 * naturally skipped (status predicates), so re-running is a no-op.
 */
export async function reconcileExpiredSubscriptions(now: Date = new Date()): Promise<ReconcileResult> {
  const result: ReconcileResult = { changed: 0, expired: 0, trialExpired: 0, cancelledAtPeriodEnd: 0, ranAt: now.toISOString() };

  const staleTrials = await db.subscription.findMany({
    where: { status: 'TRIALING', trialEndsAt: { lt: now } },
    select: { id: true, userId: true },
  });
  for (const sub of staleTrials) {
    const msg = await localized(
      sub.userId,
      {
        title: 'دوره آزمایشی شما پایان یافت',
        body: 'هفت روز پریمیوم به پایان رسید و طرح شما به رایگان تغییر کرد. هر زمان خواستید می‌توانید اشتراک را فعال کنید.',
      },
      {
        title: 'Your free trial has ended',
        body: 'Your 7 days of Premium are over and your plan is now Free. You can subscribe whenever you are ready.',
      }
    );
    await db.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED', cancelAtPeriodEnd: false, trialEndsAt: null },
      });
      await setEntitlement(sub.userId, 'FREE', undefined, tx, { skipNotification: true });
      await tx.notification.create({ data: { userId: sub.userId, title: msg.title, body: msg.body, type: 'PAYMENT' } });
    });
    result.changed++;
    result.trialExpired++;
  }

  const staleActive = await db.subscription.findMany({
    where: { status: 'ACTIVE', currentPeriodEnd: { lt: now } },
    select: { id: true, userId: true, cancelAtPeriodEnd: true },
  });
  for (const sub of staleActive) {
    const msg = await localized(
      sub.userId,
      sub.cancelAtPeriodEnd
        ? {
            title: 'اشتراک شما طبق برنامه پایان یافت',
            body: 'دسترسی پریمیوم شما تا پایان دورهٔ پرداخت‌شده ادامه داشت و اکنون به رایگان تغییر کرده است. سپاس از همراهی‌تان با نیوا.',
          }
        : {
            title: 'اشتراک شما منقضی شد',
            body: 'دورهٔ اشتراک شما به پایان رسید و طرح به رایگان تغییر کرد. برای ادامهٔ دسترسی پریمیوم، اشتراک را دوباره فعال کنید.',
          },
      sub.cancelAtPeriodEnd
        ? {
            title: 'Your subscription ended as scheduled',
            body: 'Your Premium access ran through the paid period and is now Free. Thank you for being with NIVA.',
          }
        : {
            title: 'Your subscription has expired',
            body: 'Your subscription period ended and your plan switched to Free. Reactivate anytime to restore Premium access.',
          }
    );
    await db.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: sub.cancelAtPeriodEnd
          ? { status: 'CANCELLED', cancelAtPeriodEnd: false, cancelledAt: now }
          : { status: 'EXPIRED', cancelAtPeriodEnd: false },
      });
      await setEntitlement(sub.userId, 'FREE', undefined, tx, { skipNotification: true });
      await tx.notification.create({ data: { userId: sub.userId, title: msg.title, body: msg.body, type: 'PAYMENT' } });
    });
    result.changed++;
    if (sub.cancelAtPeriodEnd) result.cancelledAtPeriodEnd++;
    else result.expired++;
  }

  return result;
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

export interface RefundOutcome {
  ok: boolean;
  code?: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'PSP_ERROR';
  message?: string;
  refund?: { id: string; amountMinor: number; currency: string; status: string; providerRef?: string | null };
  fullyRefunded?: boolean;
  subscriptionCancelled?: boolean;
  paymentStatus?: string;
}

/**
 * Full-or-partial refund against the remaining refundable amount.
 *
 * - `amountMinor` omitted → full refund of the remaining amount.
 * - Sandbox adapter: ledger-only, settles instantly (Refund row SUCCEEDED).
 * - Real PSPs: adapter.refund() is called BEFORE the transaction (no network
 *   inside tx); a PENDING result (e.g. Zarinpal manual settlement) records the
 *   intent without touching payment status.
 * - Payment becomes REFUNDED only when the refunded total reaches its amount;
 *   partial refunds keep SUCCEEDED and note the split in statusDetail.
 * - A fully-refunded payment cancels its subscription ONLY when no other
 *   SUCCEEDED payment on that subscription remains (entitlement → FREE).
 */
export async function refundPayment(
  actorId: string,
  paymentId: string,
  amountMinor: number | undefined,
  reason: string,
  ip: string | null
): Promise<RefundOutcome> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { subscription: true, refunds: true },
  });
  if (!payment) return { ok: false, code: 'NOT_FOUND', message: 'Payment not found' };
  if (payment.status !== 'SUCCEEDED' && payment.status !== 'REFUNDED') {
    return { ok: false, code: 'CONFLICT', message: `Only SUCCEEDED payments can be refunded (status: ${payment.status})` };
  }
  const refundedSoFar = payment.refunds.filter((r) => r.status === 'SUCCEEDED').reduce((sum, r) => sum + r.amountMinor, 0);
  const remaining = payment.amount - refundedSoFar;
  if (remaining <= 0) {
    return { ok: false, code: 'CONFLICT', message: 'This payment is already fully refunded' };
  }
  const amount = amountMinor ?? remaining;
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, code: 'VALIDATION', message: 'amountMinor must be a positive integer' };
  }
  if (amount > remaining) {
    return { ok: false, code: 'VALIDATION', message: `Refund amount exceeds the refundable remainder (${remaining} ${payment.currency})` };
  }

  const adapter = getPSP();
  let psp;
  try {
    psp = await adapter.refund({
      paymentId: payment.id,
      amountMinor: amount,
      currency: payment.currency === 'USD' ? 'USD' : 'IRR',
      reason,
      providerRef: payment.providerRef ?? undefined,
      providerDetail: payment.statusDetail ?? undefined,
    });
  } catch (err) {
    const detail = err instanceof PspError ? `${err.code}: ${err.message}` : err instanceof Error ? err.message : 'PSP refund failed';
    await logAudit(actorId, 'REFUND_FAILED', 'Payment', payment.id, { reason: 'psp-error', detail }, ip);
    return { ok: false, code: 'PSP_ERROR', message: detail };
  }

  const outcome = await db.$transaction(async (tx): Promise<RefundOutcome> => {
    const refund = await tx.refund.create({
      data: {
        paymentId: payment.id,
        amountMinor: amount,
        currency: payment.currency,
        reason,
        status: psp.status,
        providerRef: psp.providerRef ?? null,
        processedById: actorId,
      },
    });

    if (psp.status !== 'SUCCEEDED') {
      // PENDING intent (manual settlement) or FAILED — ledger only.
      await tx.payment.update({
        where: { id: payment.id },
        data: { statusDetail: `${payment.statusDetail ? payment.statusDetail + ' | ' : ''}refund ${refund.id} ${psp.status}: ${reason}`.slice(0, 500) },
      });
      return {
        ok: true,
        refund: { id: refund.id, amountMinor: amount, currency: payment.currency, status: psp.status, providerRef: refund.providerRef },
        fullyRefunded: false,
        subscriptionCancelled: false,
        paymentStatus: payment.status,
      };
    }

    const newTotal = refundedSoFar + amount;
    const fullyRefunded = newTotal >= payment.amount;
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: fullyRefunded ? 'REFUNDED' : 'SUCCEEDED',
        statusDetail: fullyRefunded
          ? `${payment.statusDetail ? payment.statusDetail + ' | ' : ''}fully refunded (${newTotal}/${payment.amount})`
          : `${payment.statusDetail ? payment.statusDetail + ' | ' : ''}partially refunded (${newTotal}/${payment.amount})`,
      },
    });

    let subscriptionCancelled = false;
    if (fullyRefunded) {
      const others = await tx.payment.count({
        where: { subscriptionId: payment.subscriptionId, id: { not: payment.id }, status: 'SUCCEEDED' },
      });
      if (others === 0 && payment.subscription.status !== 'CANCELLED') {
        await tx.subscription.update({
          where: { id: payment.subscriptionId },
          data: { status: 'CANCELLED', cancelAtPeriodEnd: false, cancelledAt: new Date() },
        });
        await setEntitlement(payment.subscription.userId, 'FREE', undefined, tx, { skipNotification: true });
        const msg = await localized(
          payment.subscription.userId,
          {
            title: 'اشتراک شما بابت بازپرداخت لغو شد',
            body: 'پرداخت شما به‌طور کامل بازپرداخت شد و طرح به رایگان تغییر کرد. اگر این بازپرداخت را انتظار نداشتید، با پشتیبانی تماس بگیرید.',
          },
          {
            title: 'Your subscription was cancelled by a refund',
            body: 'Your payment was fully refunded and your plan switched to Free. If you did not expect this refund, please contact support.',
          }
        );
        await tx.notification.create({ data: { userId: payment.subscription.userId, title: msg.title, body: msg.body, type: 'PAYMENT' } });
        subscriptionCancelled = true;
      }
    }

    return {
      ok: true,
      refund: { id: refund.id, amountMinor: amount, currency: payment.currency, status: psp.status, providerRef: refund.providerRef },
      fullyRefunded,
      subscriptionCancelled,
      paymentStatus: fullyRefunded ? 'REFUNDED' : 'SUCCEEDED',
    };
  });

  if (outcome.ok) {
    await logAudit(
      actorId,
      'REFUND_ISSUED',
      'Payment',
      payment.id,
      {
        refundId: outcome.refund?.id,
        amountMinor: amount,
        currency: payment.currency,
        fullyRefunded: outcome.fullyRefunded,
        subscriptionCancelled: outcome.subscriptionCancelled,
        pspStatus: psp.status,
      },
      ip
    );
  }
  return outcome;
}
