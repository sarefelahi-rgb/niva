import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

/**
 * Finance overview (Wave 6.1): payments, revenue-by-plan, subscription mix and
 * the refund ledger (every Refund row with its processor). Staff-scoped via
 * withUser(['ADMIN']) — refund execution lives in POST /api/admin/finance/refund
 * and additionally allows the FINANCE role.
 */
export async function GET(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN', 'FINANCE'], async () => {
    const payments = await db.payment.findMany({
      where: { status: 'SUCCEEDED' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { subscription: { include: { user: { select: { email: true } } } } },
    });
    const byPlan: Record<string, number> = {};
    for (const p of payments) {
      byPlan[p.subscription.plan] = (byPlan[p.subscription.plan] ?? 0) + p.amount;
    }
    const subs = await db.subscription.groupBy({ by: ['plan', 'status'], _count: true });
    const refunds = await db.refund.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        payment: { include: { subscription: { include: { user: { select: { email: true } } } } } },
        processedBy: { select: { email: true } },
      },
    });
    const refundedByPlan: Record<string, number> = {};
    for (const r of refunds) {
      refundedByPlan[r.payment.subscription.plan] = (refundedByPlan[r.payment.subscription.plan] ?? 0) + r.amountMinor;
    }
    return json({
      revenueByPlan: byPlan,
      refundedByPlan,
      payments: payments.slice(0, 50).map((p) => ({
        id: p.id,
        plan: p.subscription.plan,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        statusDetail: p.statusDetail,
        user: p.subscription.user.email,
        createdAt: p.createdAt,
      })),
      refunds: refunds.map((r) => ({
        id: r.id,
        paymentId: r.paymentId,
        amountMinor: r.amountMinor,
        currency: r.currency,
        reason: r.reason,
        status: r.status,
        providerRef: r.providerRef,
        processedBy: r.processedBy?.email ?? null,
        user: r.payment.subscription.user.email,
        createdAt: r.createdAt,
      })),
      subscriptions: subs,
    });
  });
}
