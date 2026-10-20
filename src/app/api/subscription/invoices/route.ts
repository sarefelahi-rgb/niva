import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

/**
 * Owner-scoped invoice listing (Wave 6.1). Invoices are issued automatically
 * inside the confirm/webhook transaction when a payment SUCCEEDS. Downloadable
 * PDFs are a documented production target (docs/audit/10-psp.md) — this build
 * exposes structured JSON only, so the UI intentionally has no download button.
 */
export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const invoices = await db.invoice.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    });
    return json({
      invoices: invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amountMinor: inv.amountMinor,
        currency: inv.currency,
        taxMinor: inv.taxMinor,
        status: inv.status,
        issuedAt: inv.issuedAt,
        subscriptionId: inv.subscriptionId,
        paymentId: inv.paymentId,
        lineItems: JSON.parse(inv.lineItems) as Array<{ descriptionEn: string; descriptionFa: string; amountMinor: number; periodDays: number }>,
      })),
    });
  });
}
