import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { getEntitlementFeatures } from '@/lib/entitlements';

const PERMS = ['VIEW_TIMELINE', 'VIEW_APPOINTMENTS', 'VIEW_TRACKING', 'VIEW_JOURNAL'] as const;

const inviteSchema = z.object({
  partnerEmail: z.string().email().max(120),
  partnerName: z.string().max(60).optional(),
  permissions: z.array(z.enum(PERMS)).min(1),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const { features } = await getEntitlementFeatures(user.id);
    const grants = await db.partnerAccess.findMany({
      where: { granterId: user.id },
      orderBy: { invitedAt: 'desc' },
    });
    return json({
      grants: grants.map((g) => ({ ...g, permissions: JSON.parse(g.permissions) as string[] })),
      entitled: features.familyAccess,
    });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const { features } = await getEntitlementFeatures(user.id);
    if (!features.familyAccess) {
      return json({ entitled: false }, 402);
    }
    const body = await readJson(req, inviteSchema);
    const email = body.partnerEmail.toLowerCase().trim();
    if (email === user.email) return apiError(400, 'VALIDATION', 'You cannot invite yourself');
    const existing = await db.partnerAccess.findFirst({
      where: { granterId: user.id, partnerEmail: email, status: { in: ['INVITED', 'ACTIVE'] } },
    });
    if (existing) return apiError(409, 'CONFLICT', 'An invitation for this email already exists');
    const partnerUser = await db.user.findUnique({ where: { email } });
    const grant = await db.partnerAccess.create({
      data: {
        granterId: user.id,
        partnerUserId: partnerUser?.id ?? null,
        partnerEmail: email,
        partnerName: body.partnerName,
        permissions: JSON.stringify(body.permissions),
        status: partnerUser ? 'ACTIVE' : 'INVITED',
      },
    });
    if (partnerUser) {
      await db.notification.create({
        data: {
          userId: partnerUser.id,
          title: 'Family access granted',
          body: `${user.name} shared selected pregnancy information with you. They can revoke it at any time.`,
          type: 'SYSTEM',
        },
      });
    }
    return json({ id: grant.id, status: grant.status }, 201);
  });
}

export async function PATCH(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');
    const grant = await db.partnerAccess.findUnique({ where: { id } });
    if (!grant || grant.granterId !== user.id) return apiError(404, 'NOT_FOUND', 'Grant not found');
    await db.partnerAccess.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date() } });
    return json({ ok: true });
  });
}
