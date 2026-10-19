import { z } from 'zod';
import { createHmac } from 'crypto';
import { db } from '@/lib/db';
import { json, withUser, readJson } from '@/lib/api';
import { setEntitlement } from '@/lib/entitlements';
import { logAudit } from '@/lib/audit';

/** Sandbox signature helper for the client-side confirmation view (demo only). */
export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const paymentId = new URL(req.url).searchParams.get('paymentId');
    const result = new URL(req.url).searchParams.get('result') ?? 'SUCCEEDED';
    if (!paymentId) return json({ error: 'paymentId required' }, 400);
    const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { subscription: true } });
    if (!payment || payment.subscription.userId !== user.id) {
      return json({ error: 'not found' }, 404);
    }
    const secret = process.env.NIVA_SANDBOX_PAYMENT_SECRET ?? 'niva-sandbox-secret-do-not-use-in-production';
    const signature = createHmac('sha256', secret).update(`${paymentId}:${result}`).digest('hex');
    return json({ signature, result });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, z.object({ subscriptionId: z.string() }));
    const sub = await db.subscription.findUnique({ where: { id: body.subscriptionId } });
    if (!sub || sub.userId !== user.id) return json({ error: 'not found' }, 404);
    if (sub.status === 'CANCELLED') return json({ ok: true });
    await db.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    await setEntitlement(user.id, 'FREE');
    await logAudit(user.id, 'SUBSCRIPTION_CANCELLED', 'Subscription', sub.id, null, req.headers.get('x-forwarded-for'));
    return json({ ok: true });
  });
}
