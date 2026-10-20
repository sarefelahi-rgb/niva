import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

const decisionSchema = z.object({
  token: z.string().min(10),
  decision: z.enum(['ACCEPT', 'DECLINE']),
});

/** Pending invitations addressed to the signed-in user's email. */
export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const myEmail = user.email.toLowerCase();
    const rows = await db.partnerAccess.findMany({
      where: {
        partnerEmail: myEmail,
        status: 'INVITED',
        inviteExpiresAt: { gt: new Date() },
      },
      include: { granter: { select: { name: true } } },
      orderBy: { invitedAt: 'desc' },
    });
    const invites = rows
      .filter((r) => r.partnerEmail.toLowerCase() === myEmail)
      .map((r) => ({
        id: r.id,
        // Token is included so the invited user can claim their own invite
        // from the Family view (same authority the ?invite= link carries).
        token: r.inviteToken,
        granterName: r.granter.name,
        permissions: JSON.parse(r.permissions) as string[],
        invitedAt: r.invitedAt,
        expiresAt: r.inviteExpiresAt,
      }));
    return json({ invites });
  });
}

/** Claim an invite by token: ACCEPT links the account, DECLINE records the refusal. */
export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, 'family-accept'), 10, 5 * 60_000)) {
      return apiError(429, 'RATE_LIMIT', 'Too many attempts');
    }
    const body = await readJson(req, decisionSchema);
    const grant = await db.partnerAccess.findUnique({ where: { inviteToken: body.token } });
    if (!grant) return apiError(404, 'err.notFound', 'Invitation not found');
    const expired = !grant.inviteExpiresAt || grant.inviteExpiresAt.getTime() <= Date.now();
    if (grant.status !== 'INVITED' || expired) {
      return apiError(400, 'INVITE_EXPIRED', 'This invitation is no longer valid');
    }

    if (body.decision === 'ACCEPT') {
      // Only the invited email may claim the grant.
      if (user.email.toLowerCase() !== grant.partnerEmail.toLowerCase()) {
        return apiError(403, 'EMAIL_MISMATCH', 'Sign in with the invited email to accept this invitation');
      }
      try {
        await db.$transaction(async (tx) => {
          await tx.partnerAccess.update({
            where: { id: grant.id },
            data: { partnerUserId: user.id, status: 'ACTIVE', inviteToken: null },
          });
        });
      } catch (err) {
        if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
          return apiError(409, 'CONFLICT', 'This account is already linked to a family grant');
        }
        throw err;
      }
      // Notify the granter in THEIR locale (after the transaction commits).
      const granter = await db.user.findUnique({ where: { id: grant.granterId } });
      if (granter) {
        const fa = granter.locale === 'fa';
        await db.notification.create({
          data: {
            userId: granter.id,
            title: fa ? 'دعوت شما پذیرفته شد' : 'Your invitation was accepted',
            body: fa
              ? `${user.name} اکنون می‌تواند اطلاعات انتخابی شما را ببیند.`
              : `${user.name} can now view the information you shared.`,
            type: 'SYSTEM',
          },
        });
      }
      await logAudit(user.id, 'FAMILY_INVITE_ACCEPT', 'PartnerAccess', grant.id, { granterId: grant.granterId }, req.headers.get('x-forwarded-for'));
      return json({ ok: true, decision: 'ACCEPT' });
    }

    // DECLINE — no account linking, refusal recorded, granter informed.
    await db.partnerAccess.update({
      where: { id: grant.id },
      data: { status: 'DECLINED', declinedAt: new Date(), inviteToken: null },
    });
    const granter = await db.user.findUnique({ where: { id: grant.granterId } });
    if (granter) {
      const fa = granter.locale === 'fa';
      await db.notification.create({
        data: {
          userId: granter.id,
          title: fa ? 'دعوت شما پذیرفته نشد' : 'Your invitation was declined',
          body: fa
            ? `${user.name} این دعوت را نپذیرفت.`
            : `${user.name} did not accept the invitation.`,
          type: 'SYSTEM',
        },
      });
    }
    await logAudit(user.id, 'FAMILY_INVITE_DECLINE', 'PartnerAccess', grant.id, { granterId: grant.granterId }, req.headers.get('x-forwarded-for'));
    return json({ ok: true, decision: 'DECLINE' });
  });
}
