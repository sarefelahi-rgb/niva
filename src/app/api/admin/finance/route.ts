import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

export async function GET(req: Request) {
  return withUser(req, ['ADMIN'], async () => {
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
    return json({
      revenueByPlan: byPlan,
      payments: payments.slice(0, 50).map((p) => ({
        id: p.id,
        plan: p.subscription.plan,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        user: p.subscription.user.email,
        createdAt: p.createdAt,
      })),
      subscriptions: subs,
    });
  });
}
