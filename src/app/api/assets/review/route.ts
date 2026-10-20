import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/**
 * Per-model clinical review workflow for 3D assets (Wave 3.3).
 *
 * State machine (no schema change — status lives in the existing String column):
 *   DRAFT → IN_REVIEW → APPROVED
 *                ↓          ↓ (REOPEN)
 *              DRAFT  ← ————
 *
 * Every decision also writes a ClinicalReview row (same audit pattern as
 * /api/admin/review) and stamps the reviewer's note into the asset's existing
 * animationMetadata JSON under `lastReview` — no new columns anywhere.
 *
 * Roles mirror the review workspace (/api/admin/review): ADMIN | CLINICAL_REVIEWER.
 */

const patchSchema = z.object({
  assetId: z.string().min(1).max(80),
  action: z.enum(['SUBMIT_REVIEW', 'APPROVE', 'REJECT', 'REOPEN']),
  reviewerName: z.string().trim().min(2, 'reviewerName is required').max(120),
  /** Reviewer note — REQUIRED for REJECT, stored in animationMetadata.lastReview. */
  note: z.string().trim().max(1000).optional(),
  /** Optional semver patch bump on approval (1.2.3 → 1.2.4). */
  bumpVersion: z.enum(['none', 'patch']).default('none'),
});

type AssetRow = Awaited<ReturnType<typeof loadAssets>>[number];

function mapAsset(a: AssetRow) {
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(a.animationMetadata) as Record<string, unknown>; } catch { meta = {}; }
  return {
    id: a.id,
    assetId: a.assetId,
    gestationalStage: a.gestationalStage,
    titleEn: a.titleEn,
    titleFa: a.titleFa,
    descriptionEn: a.descriptionEn,
    descriptionFa: a.descriptionFa,
    reviewStatus: a.reviewStatus,
    publicationStatus: a.publicationStatus,
    reviewerName: a.reviewerName,
    modelVersion: a.modelVersion,
    performance: JSON.parse(a.performanceProfile) as Record<string, unknown>,
    lastReview: (meta.lastReview ?? null) as { action: string; reviewerName: string; note?: string | null; at: string } | null,
  };
}

function loadAssets() {
  return db.anatomicalAsset.findMany({ orderBy: { gestationalStage: 'asc' } });
}

/** Reviewer-facing listing: ALL review statuses (DRAFT/IN_REVIEW never go to the studio feed). */
export async function GET(req: Request) {
  return withUser(req, ['ADMIN', 'CLINICAL_REVIEWER'], async () => {
    const assets = await loadAssets();
    return json({ assets: assets.map(mapAsset) });
  });
}

export async function PATCH(req: Request) {
  return withUser(req, ['ADMIN', 'CLINICAL_REVIEWER'], async ({ user }) => {
    const body = await readJson(req, patchSchema);
    if (body.action === 'REJECT' && (!body.note || body.note.length < 3)) {
      return apiError(400, 'VALIDATION', 'A rejection note (min 3 chars) is required to return an asset to draft');
    }

    const asset = await db.anatomicalAsset.findUnique({ where: { assetId: body.assetId } });
    if (!asset) return apiError(404, 'NOT_FOUND', 'Asset not found');

    const from = asset.reviewStatus;
    let to: string;
    switch (body.action) {
      case 'SUBMIT_REVIEW':
        if (from !== 'DRAFT' && from !== 'DEMONSTRATION') {
          return apiError(409, 'INVALID_TRANSITION', `SUBMIT_REVIEW is not allowed from ${from}`);
        }
        to = 'IN_REVIEW';
        break;
      case 'APPROVE':
        if (from !== 'IN_REVIEW') {
          return apiError(409, 'INVALID_TRANSITION', `APPROVE is only allowed from IN_REVIEW (asset is ${from})`);
        }
        to = 'APPROVED';
        break;
      case 'REJECT':
        if (from !== 'IN_REVIEW') {
          return apiError(409, 'INVALID_TRANSITION', `REJECT is only allowed from IN_REVIEW (asset is ${from})`);
        }
        to = 'DRAFT';
        break;
      case 'REOPEN':
        if (from !== 'APPROVED') {
          return apiError(409, 'INVALID_TRANSITION', `REOPEN is only allowed from APPROVED (asset is ${from})`);
        }
        to = 'DRAFT';
        break;
    }

    // Optional semver patch bump on approval (x.y.z → x.y.(z+1)).
    let modelVersion = asset.modelVersion;
    if (body.action === 'APPROVE' && body.bumpVersion === 'patch') {
      const parts = modelVersion.split('.').map((n) => parseInt(n, 10));
      if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
        modelVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
      }
    }

    // Note storage without schema change: merge into the existing
    // animationMetadata JSON column under a `lastReview` key.
    let meta: Record<string, unknown> = {};
    try { meta = JSON.parse(asset.animationMetadata) as Record<string, unknown>; } catch { meta = {}; }
    meta.lastReview = {
      action: body.action,
      reviewerName: body.reviewerName,
      note: body.note ?? null,
      at: new Date().toISOString(),
    };

    const updated = await db.$transaction(async (tx) => {
      const row = await tx.anatomicalAsset.update({
        where: { id: asset.id },
        data: {
          reviewStatus: to,
          reviewerName: body.reviewerName,
          modelVersion,
          animationMetadata: JSON.stringify(meta),
        },
      });
      // Decisions get a ClinicalReview row (same audit pattern as content review).
      if (body.action === 'APPROVE' || body.action === 'REJECT') {
        await tx.clinicalReview.create({
          data: {
            contentType: 'ANATOMICAL_ASSET',
            contentId: asset.id,
            reviewerId: user.id,
            status: body.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            notes: body.note ?? null,
            reviewedAt: new Date(),
          },
        });
      }
      return row;
    });

    await logAudit(
      user.id,
      `ASSET_${body.action}`,
      'ANATOMICAL_ASSET',
      asset.id,
      { assetId: asset.assetId, from, to },
      req.headers.get('x-forwarded-for')
    );

    return json({ asset: mapAsset(updated) });
  });
}
