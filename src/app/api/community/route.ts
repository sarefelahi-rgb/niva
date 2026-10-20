import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logSafetyEvent } from '@/lib/audit';
import { ensureFeature } from '@/lib/feature-flags';
import { assessSafety } from '@/lib/safety';

/**
 * Community with moderation-by-default: every post enters PENDING and is only
 * visible after approval. Keyword heuristics flag likely medical misinformation
 * or commercial spam for the moderation queue (deterministic pre-filter).
 */
const MISINFO = /(cure|guaranteed|miracle|detox|anti.?vax|induce labor instantly|درمان قطعی|تضمینی|معجزه|دی.?توکس|سقط فوری)/i;

/** Anti-harassment auto-queue threshold: reported posts return to moderation. */
const AUTO_REPORT_THRESHOLD = 3;
/** Must match the note checked by the admin Moderation tab (localizes via mod.autoFlagNote). */
const AUTO_REPORT_NOTE = 'Auto-queued after repeated reports';

const postSchema = z.object({
  body: z.string().min(5).max(1500),
  alias: z.string().min(2).max(30),
  topic: z.enum(['GENERAL', 'NUTRITION', 'SUPPORT', 'BIRTH', 'POSTPARTUM', 'PRODUCTS']).default('GENERAL'),
  lang: z.enum(['fa', 'en']).default('fa'),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    // Wave 6.2 feature flag gate: community off → 403 FEATURE_DISABLED.
    const gated = await ensureFeature('community', user.id);
    if (gated) return gated;
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic');
    const mine = url.searchParams.get('mine') === '1';
    const posts = await db.communityPost.findMany({
      where: {
        ...(topic && topic !== 'ALL' ? { topic } : {}),
        ...(mine ? { userId: user.id } : { status: 'APPROVED' }),
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    return json({
      posts: posts.map((p) => ({
        id: p.id,
        authorAlias: p.userId === user.id ? p.authorAlias : p.authorAlias,
        topic: p.topic,
        body: p.body,
        status: p.userId === user.id ? p.status : undefined,
        moderationNote: p.userId === user.id ? p.moderationNote : undefined,
        createdAt: p.createdAt,
        mine: p.userId === user.id,
      })),
    });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const gated = await ensureFeature('community', user.id);
    if (gated) return gated;
    if (!rateLimit(clientKey(req, 'community'), 5, 300_000)) {
      return apiError(429, 'RATE_LIMIT', 'Posting too quickly — try again later.');
    }
    const body = await readJson(req, postSchema);
    const flagged = MISINFO.test(body.body);
    // Red-flag scan on community text (safety coverage item 2.5): a post that
    // describes an EMERGENCY pattern is flagged for urgent moderation review,
    // so moderators can reach out to the author with crisis guidance.
    const safety = assessSafety(body.body);
    if (safety.level === 'EMERGENCY') {
      await logSafetyEvent(user.id, 'MODERATION', 'HIGH', `Community post matches red-flag categories: ${safety.categories.join(',')}`);
    }
    // Post + its FLAG audit row are written atomically so the moderation trail
    // can never miss a misinfo-pattern post.
    const post = await db.$transaction(async (tx) => {
      const created = await tx.communityPost.create({
        data: {
          userId: user.id,
          authorAlias: body.alias,
          topic: body.topic,
          body: body.body,
          language: body.lang,
          status: 'PENDING',
          flagCount: flagged || safety.level === 'EMERGENCY' ? 1 : 0,
          moderationNote: flagged
            ? 'Auto-flagged: possible medical misinformation or promotional claim'
            : safety.level === 'EMERGENCY'
              ? `Auto-flagged: red-flag language (${safety.categories.join(',')}) — urgent review`
              : null,
        },
      });
      if (flagged) {
        await tx.moderationAction.create({
          data: { postId: created.id, moderatorId: null, action: 'FLAG', reason: 'misinfo-pattern' },
        });
      }
      return created;
    });
    if (flagged) {
      await logSafetyEvent(user.id, 'MODERATION', 'MEDIUM', 'Community post auto-flagged for misinformation review');
    }
    return json({ id: post.id, status: post.status, flagged }, 201);
  });
}

export async function PATCH(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const gated = await ensureFeature('community', user.id);
    if (gated) return gated;
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');
    const post = await db.communityPost.findUnique({ where: { id } });
    if (!post) return apiError(404, 'NOT_FOUND', 'Post not found');
    if (post.status !== 'APPROVED') return apiError(404, 'NOT_FOUND', 'Post not available');
    const updated = await db.communityPost.update({ where: { id }, data: { flagCount: { increment: 1 } } });
    // Anti-harassment auto-flag: once a live post accumulates enough reports it
    // returns to the moderation queue (AUTO_FLAG trail row, no moderator yet).
    if (updated.flagCount >= AUTO_REPORT_THRESHOLD && updated.status === 'APPROVED') {
      await db.$transaction([
        db.communityPost.update({
          where: { id },
          data: { status: 'PENDING', moderationNote: AUTO_REPORT_NOTE },
        }),
        db.moderationAction.create({
          data: { postId: id, moderatorId: null, action: 'AUTO_FLAG', reason: `flagCount=${updated.flagCount}` },
        }),
      ]);
    }
    await logSafetyEvent(user.id, 'MODERATION', 'LOW', `User flagged post ${id} for review`);
    return json({ ok: true });
  });
}
