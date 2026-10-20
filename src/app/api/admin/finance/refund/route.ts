import { z } from 'zod';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { refundPayment } from '@/lib/billing';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAdminAction } from '@/lib/api';

/**
 * Refund execution (Wave 6.1). Roles: ADMIN, SUPER_ADMIN, FINANCE (matches the
 * withUser role list semantics exactly — user.role must be one of these).
 * Body: {paymentId, amountMinor?, reason (min 4 chars)} — amountMinor omitted
 * = full refund of the remaining amount; partial refunds keep the payment
 * SUCCEEDED until the refunded total reaches its amount (see refundPayment).
 * The sandbox adapter settles ledger-only; a real PSP refund call is the
 * production swap-in inside src/lib/psp adapters.
 */
export async function POST(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN', 'FINANCE'], async ({ user }) => {
    if (!rateLimit(clientKey(req, 'refund'), 10, 60_000)) {
      return apiError(429, 'RATE_LIMIT', 'Too many attempts');
    }
    const body = await readJson(
      req,
      z.object({
        paymentId: z.string().min(1),
        amountMinor: z.number().int().positive().optional(),
        reason: z.string().min(4).max(500),
      })
    );
    const outcome = await refundPayment(user.id, body.paymentId, body.amountMinor, body.reason, req.headers.get('x-forwarded-for'));
    if (!outcome.ok) {
      const status = outcome.code === 'NOT_FOUND' ? 404 : outcome.code === 'CONFLICT' ? 409 : outcome.code === 'PSP_ERROR' ? 502 : 400;
      return apiError(status, outcome.code ?? 'REFUND_ERROR', outcome.message ?? 'Refund failed');
    }
    await logAdminAction(user.id, 'REFUND_EXECUTED', 'Payment', body.paymentId, { refundId: outcome.refund?.id, fullyRefunded: outcome.fullyRefunded }, req);
    return json(outcome, 201);
  });
}
