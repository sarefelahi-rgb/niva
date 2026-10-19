import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/** Clinical review queue — content + 3D assets. Approval requires CLINICAL_REVIEWER/ADMIN and is audited. */
export async function GET(req: Request) {
  return withUser(req, ['ADMIN', 'CLINICAL_REVIEWER'], async () => {
    const contents = await db.educationalContent.findMany({
      where: { status: 'IN_REVIEW' },
      orderBy: [{ category: 'asc' }, { week: 'asc' }],
      take: 100,
    });
    const assets = await db.anatomicalAsset.findMany({ where: { reviewStatus: { in: ['DEMONSTRATION', 'IN_REVIEW'] } }, orderBy: { gestationalStage: 'asc' } });
    const decisions = await db.clinicalReview.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] } },
      orderBy: { reviewedAt: 'desc' },
      take: 30,
      include: { reviewer: { select: { name: true } } },
    });
    return json({ contents, assets, decisions });
  });
}

const decideSchema = z.object({
  contentType: z.enum(['EDUCATIONAL_CONTENT', 'ANATOMICAL_ASSET']),
  contentId: z.string(),
  decision: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  return withUser(req, ['ADMIN', 'CLINICAL_REVIEWER'], async ({ user }) => {
    const body = await readJson(req, decideSchema);
    // Integrity: the target must exist BEFORE any review row is written, and
    // decision + review record are committed atomically — orphan ClinicalReview
    // rows on the 404 path are impossible by construction (Wave 2.4).
    if (body.contentType === 'EDUCATIONAL_CONTENT') {
      const content = await db.educationalContent.findUnique({ where: { id: body.contentId } });
      if (!content) return apiError(404, 'NOT_FOUND', 'Content not found');
      const review = await db.$transaction(async (tx) => {
        const created = await tx.clinicalReview.create({
          data: {
            contentType: body.contentType,
            contentId: body.contentId,
            reviewerId: user.id,
            status: body.decision,
            notes: body.notes,
            reviewedAt: new Date(),
          },
        });
        await tx.educationalContent.update({
          where: { id: body.contentId },
          data: {
            status: body.decision === 'APPROVED' ? 'APPROVED' : body.decision === 'REJECTED' ? 'RETIRED' : 'IN_REVIEW',
            version: { increment: 1 },
            ...(body.decision === 'APPROVED'
              ? {
                  // Evidence governance: approval stamps reviewedAt and a 12-month
                  // review-expiry; expired content is suppressed from delivery.
                  reviewedAt: new Date(),
                  expiresAt: new Date(Date.now() + 365 * 86_400_000),
                }
              : {}),
          },
        });
        return created;
      });
      await logAudit(user.id, `REVIEW_${body.decision}`, body.contentType, body.contentId, { reviewer: user.id }, req.headers.get('x-forwarded-for'));
      return json({ id: review.id, status: review.status }, 201);
    }

    const asset = await db.anatomicalAsset.findUnique({ where: { id: body.contentId } });
    if (!asset) return apiError(404, 'NOT_FOUND', 'Asset not found');
    const review = await db.$transaction(async (tx) => {
      const created = await tx.clinicalReview.create({
        data: {
          contentType: body.contentType,
          contentId: body.contentId,
          reviewerId: user.id,
          status: body.decision,
          notes: body.notes,
          reviewedAt: new Date(),
        },
      });
      await tx.anatomicalAsset.update({
        where: { id: body.contentId },
        data: {
          reviewStatus: body.decision === 'APPROVED' ? 'APPROVED' : body.decision === 'REJECTED' ? 'DRAFT' : 'IN_REVIEW',
          reviewerName: user.name,
        },
      });
      return created;
    });
    await logAudit(user.id, `REVIEW_${body.decision}`, body.contentType, body.contentId, { reviewer: user.id }, req.headers.get('x-forwarded-for'));
    return json({ id: review.id, status: review.status }, 201);
  });
}
