import { z } from 'zod';
import { db } from '@/lib/db';
import { json, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/**
 * Consent management. Withdrawal semantics (GDPR, risk R-06):
 * - `withdraw: true` stamps `withdrawnAt` with the current time.
 * - Regular preference updates NEVER reset an existing withdrawal.
 */
const schema = z.object({
  healthAnalytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
  familySharingAck: z.boolean().optional(),
  withdraw: z.boolean().optional(),
});

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, schema);
    const { withdraw, ...flags } = body;

    const data: Record<string, unknown> = { ...flags };
    if (withdraw === true) {
      data.withdrawnAt = new Date();
    }
    // Note: `withdrawnAt` is never reset here. Re-consent after withdrawal is
    // an explicit flow (Phase 3) and must be audited separately.

    const consent = await db.consent.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...flags, withdrawnAt: withdraw === true ? new Date() : null },
    });
    await logAudit(
      user.id,
      withdraw === true ? 'CONSENT_WITHDRAWN' : 'CONSENT_UPDATE',
      'Consent',
      consent.id,
      { fields: Object.keys(body) },
      req.headers.get('x-forwarded-for')
    );
    return json({ ok: true, withdrawnAt: consent.withdrawnAt });
  });
}

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const consent = await db.consent.findUnique({ where: { userId: user.id } });
    return json({ consent });
  });
}
