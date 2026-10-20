import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { getEntitlementFeatures } from '@/lib/entitlements';
import { logAudit } from '@/lib/audit';
import { ensureFeature } from '@/lib/feature-flags';

const PERMS = ['VIEW_TIMELINE', 'VIEW_APPOINTMENTS', 'VIEW_TRACKING', 'VIEW_JOURNAL'] as const;

const inviteSchema = z.object({
  partnerEmail: z.string().email().max(120),
  partnerName: z.string().max(60).optional(),
  permissions: z.array(z.enum(PERMS)).min(1),
});

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    // Wave 6.2 feature flag gate: family off → 403 FEATURE_DISABLED.
    const gated = await ensureFeature('family', user.id);
    if (gated) return gated;
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
    // Wave 6.2 feature flag gate: family off → 403 FEATURE_DISABLED.
    const gated = await ensureFeature('family', user.id);
    if (gated) return gated;
    const { features } = await getEntitlementFeatures(user.id);
    if (!features.familyAccess) {
      return json({ entitled: false }, 402);
    }
    const body = await readJson(req, inviteSchema);
    const email = body.partnerEmail.toLowerCase().trim();
    if (email === user.email.toLowerCase()) return apiError(400, 'VALIDATION', 'You cannot invite yourself');

    // Case-insensitive duplicate detection across this granter's grants.
    const mine = await db.partnerAccess.findMany({ where: { granterId: user.id } });
    const existing = mine.find((g) => g.partnerEmail.toLowerCase() === email);
    if (existing && existing.status === 'ACTIVE') {
      return apiError(409, 'CONFLICT', 'An active grant for this email already exists — revoke it first');
    }

    const partnerUser = await db.user.findUnique({ where: { email } });
    const inviteToken = randomBytes(24).toString('base64url');
    const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const payload = {
      partnerUserId: null,
      partnerName: body.partnerName ?? existing?.partnerName ?? null,
      permissions: JSON.stringify(body.permissions),
      status: 'INVITED' as const,
      invitedAt: new Date(),
      inviteToken,
      inviteExpiresAt,
      revokedAt: null,
      declinedAt: null,
    };

    // Dormant grant (INVITED | DECLINED | REVOKED) for the same email is refreshed
    // instead of conflicting — the invite is re-issued with a fresh token.
    const grant = existing
      ? await db.partnerAccess.update({ where: { id: existing.id }, data: payload })
      : await db.partnerAccess.create({
          data: { granterId: user.id, partnerEmail: email, ...payload },
        });

    // If the partner already has an account, notify them in THEIR locale.
    if (partnerUser) {
      const fa = partnerUser.locale === 'fa';
      await db.notification.create({
        data: {
          userId: partnerUser.id,
          title: fa ? 'دعوت دسترسی خانواده جدید' : 'New family invitation',
          body: fa
            ? `${user.name} شما را برای مشاهده بخشی از اطلاعات بارداری خود دعوت کرده است. از نمای «خانواده» بپذیرید.`
            : `${user.name} invited you to view part of their pregnancy information. Accept it from the Family view.`,
          type: 'SYSTEM',
        },
      });
    }

    await logAudit(user.id, 'FAMILY_INVITE_SEND', 'PartnerAccess', grant.id, { status: grant.status }, req.headers.get('x-forwarded-for'));
    return json({ id: grant.id, status: grant.status, inviteToken, inviteExpiresAt }, 201);
  });
}

export async function PATCH(req: Request) {
  return withUser(req, [], async ({ user }) => {
    // Wave 6.2 feature flag gate: family off → 403 FEATURE_DISABLED.
    const gated = await ensureFeature('family', user.id);
    if (gated) return gated;
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');
    const grant = await db.partnerAccess.findUnique({ where: { id } });
    if (!grant || grant.granterId !== user.id) return apiError(404, 'NOT_FOUND', 'Grant not found');
    if (grant.status !== 'REVOKED') {
      await db.partnerAccess.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date() } });
      if (grant.partnerUserId) {
        const partner = await db.user.findUnique({ where: { id: grant.partnerUserId } });
        if (partner) {
          const fa = partner.locale === 'fa';
          await db.notification.create({
            data: {
              userId: partner.id,
              title: fa ? 'دسترسی خانواده لغو شد' : 'Family access revoked',
              body: fa
                ? `${user.name} دسترسی به اطلاعات خود را لغو کرد.`
                : `${user.name} revoked access to their information.`,
              type: 'SYSTEM',
            },
          });
        }
      }
      await logAudit(user.id, 'FAMILY_REVOKE', 'PartnerAccess', grant.id, { status: 'REVOKED' }, req.headers.get('x-forwarded-for'));
    }
    return json({ ok: true });
  });
}
