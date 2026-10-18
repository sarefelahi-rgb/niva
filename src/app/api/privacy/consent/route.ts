import { z } from 'zod';
import { db } from '@/lib/db';
import { json, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  healthAnalytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
  familySharingAck: z.boolean().optional(),
});

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, schema);
    const consent = await db.consent.upsert({
      where: { userId: user.id },
      update: { ...body, withdrawnAt: null },
      create: { userId: user.id, ...body },
    });
    await logAudit(user.id, 'CONSENT_UPDATE', 'Consent', consent.id, { fields: Object.keys(body) }, req.headers.get('x-forwarded-for'));
    return json({ ok: true });
  });
}

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const consent = await db.consent.findUnique({ where: { userId: user.id } });
    return json({ consent });
  });
}
