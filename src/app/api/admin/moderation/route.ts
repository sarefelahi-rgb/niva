import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser, logAdminAction } from '@/lib/api';

/**
 * Community moderation loop: queue of PENDING posts + moderator decisions.
 * Decisions are transactional (post status + ModerationAction row) and notify
 * the author in their own locale. Guards prevent acting from terminal states.
 *
 * NOTE: author/moderator identity is resolved via scalar FK lookups + manual
 * mapping (same convention as admin/safety) because the current generated
 * Prisma client has no relation fields on ModerationAction/CommunityPost
 * (schema relation attributes are corrupted upstream — see worklog wave4-2a).
 */

const decideSchema = z.object({
  postId: z.string().min(1),
  action: z.enum(['APPROVE', 'REJECT', 'REMOVE']),
  note: z.string().max(500).optional(),
});

const DECISION_ACTIONS = ['APPROVE', 'REJECT', 'REMOVE'] as const;

export async function GET(req: Request) {
  return withUser(req, ['ADMIN'], async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [queue, recent, pending, todayDecisions] = await Promise.all([
      db.communityPost.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
      db.moderationAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.communityPost.count({ where: { status: 'PENDING' } }),
      db.moderationAction.count({
        where: { action: { in: [...DECISION_ACTIONS] }, createdAt: { gte: startOfDay } },
      }),
    ]);
    // Manual identity mapping over scalar FKs (no relation fields in client).
    const queueAuthorIds = [...new Set(queue.map((p) => p.userId))];
    const moderatorIds = [...new Set(recent.map((a) => a.moderatorId).filter((x): x is string => Boolean(x)))];
    const recentPostIds = [...new Set(recent.map((a) => a.postId))];
    const [authors, moderators, recentPosts] = await Promise.all([
      db.user.findMany({ where: { id: { in: queueAuthorIds } }, select: { id: true, email: true, name: true } }),
      db.user.findMany({ where: { id: { in: moderatorIds } }, select: { id: true, email: true } }),
      db.communityPost.findMany({ where: { id: { in: recentPostIds } }, select: { id: true, authorAlias: true } }),
    ]);
    const authorById = new Map(authors.map((u) => [u.id, u]));
    const emailByModeratorId = new Map(moderators.map((u) => [u.id, u.email]));
    const aliasByPostId = new Map(recentPosts.map((p) => [p.id, p.authorAlias]));
    return json({
      queue: queue.map((p) => ({
        id: p.id,
        authorAlias: p.authorAlias,
        topic: p.topic,
        body: p.body,
        language: p.language,
        status: p.status,
        flagCount: p.flagCount,
        moderationNote: p.moderationNote,
        createdAt: p.createdAt,
        author: { email: authorById.get(p.userId)?.email ?? null, name: authorById.get(p.userId)?.name ?? null },
      })),
      recent: recent.map((a) => ({
        id: a.id,
        action: a.action,
        reason: a.reason,
        createdAt: a.createdAt,
        moderator: a.moderatorId ? { email: emailByModeratorId.get(a.moderatorId) ?? null } : null,
        post: { authorAlias: aliasByPostId.get(a.postId) ?? null },
      })),
      counts: { pending, todayDecisions },
    });
  });
}

export async function POST(req: Request) {
  return withUser(req, ['ADMIN'], async ({ user }) => {
    const body = await readJson(req, decideSchema);
    const post = await db.communityPost.findUnique({ where: { id: body.postId } });
    if (!post) return apiError(404, 'err.notFound', 'Post not found');
    // State machine: APPROVE/REJECT only from PENDING; REMOVE also from APPROVED.
    const allowed =
      body.action === 'REMOVE'
        ? post.status === 'PENDING' || post.status === 'APPROVED'
        : post.status === 'PENDING';
    if (!allowed) return apiError(409, 'err.conflict', `Post is ${post.status}; ${body.action} not allowed from this state`);

    const nextStatus = body.action === 'APPROVE' ? 'APPROVED' : body.action === 'REJECT' ? 'REJECTED' : 'REMOVED';
    await db.$transaction([
      db.communityPost.update({
        where: { id: post.id },
        data: {
          status: nextStatus,
          moderatedById: user.id,
          moderationNote: body.note ?? null,
        },
      }),
      db.moderationAction.create({
        data: {
          postId: post.id,
          moderatorId: user.id,
          action: body.action,
          reason: body.note ?? null,
        },
      }),
    ]);

    // Notify the author in their own locale (non-fatal — decision already durable).
    try {
      const author = await db.user.findUnique({ where: { id: post.userId }, select: { id: true, locale: true } });
      if (author) {
        const isFa = author.locale === 'fa';
        const approved = body.action === 'APPROVE';
        const title = approved
          ? isFa ? 'پست شما منتشر شد' : 'Your post was published'
          : isFa ? 'پست شما تأیید نشد' : 'Your post was not approved';
        const noteSuffix = body.note ? (isFa ? ` یادداشت مدیر: ${body.note}` : ` Moderator note: ${body.note}`) : '';
        const notifBody = approved
          ? isFa ? 'پست شما در انجمن نیوا تأیید و منتشر شد.' : 'Your post was approved and published in the NIVA community.'
          : (isFa ? 'پست شما پس از بازبینی تأیید نشد.' : 'Your post was not approved after review.') + noteSuffix;
        await db.notification.create({
          data: { userId: author.id, type: 'SYSTEM', title, body: notifBody },
        });
      }
    } catch {
      // best-effort; the ModerationAction row is the record of truth
    }

    await logAdminAction(user.id, `moderation.${body.action.toLowerCase()}`, 'CommunityPost', post.id, { note: body.note ?? null }, req);
    return json({ ok: true, status: nextStatus });
  });
}
