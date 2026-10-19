import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

/** 3D asset registry. Only PUBLISHED assets are returned; review status is truthfully exposed. */
export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const { features } = await getFeatures(user.id);
    const assets = await db.anatomicalAsset.findMany({
      where: { publicationStatus: 'PUBLISHED' },
      orderBy: { gestationalStage: 'asc' },
    });
    return json({
      assets: assets.map((a) => ({
        assetId: a.assetId,
        gestationalStage: a.gestationalStage,
        titleEn: a.titleEn,
        titleFa: a.titleFa,
        descriptionEn: a.descriptionEn,
        descriptionFa: a.descriptionFa,
        structures: JSON.parse(a.structures) as string[],
        reviewStatus: a.reviewStatus,
        modelVersion: a.modelVersion,
        performance: JSON.parse(a.performanceProfile) as Record<string, unknown>,
        advanced: a.gestationalStage > 24,
        locked: !features.advanced3DLayers && a.gestationalStage > 24,
      })),
    });
  });
}

async function getFeatures(userId: string) {
  const { getEntitlementFeatures } = await import('@/lib/entitlements');
  return getEntitlementFeatures(userId);
}
