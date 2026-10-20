import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';
import { assessSafety } from '@/lib/safety';

/** Admin overview: counts + recent safety posture. Role-guarded. */
export async function GET(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN'], async () => {
    const [users, pregnancies, contentPending, assets, safetyOpen, postsPending, payments, aiMessages] =
      await Promise.all([
        db.user.count(),
        db.pregnancy.count({ where: { status: 'ACTIVE' } }),
        db.educationalContent.count({ where: { status: 'IN_REVIEW' } }),
        db.anatomicalAsset.findMany({ orderBy: { gestationalStage: 'asc' } }),
        db.safetyEvent.findMany({ where: { resolved: false }, orderBy: { createdAt: 'desc' }, take: 20 }),
        db.communityPost.count({ where: { status: 'PENDING' } }),
        db.payment.findMany({ where: { status: 'SUCCEEDED' }, orderBy: { createdAt: 'desc' }, take: 20 }),
        db.aIMessage.count({ where: { role: 'ASSISTANT' } }),
      ]);

    // AI quality snapshot: share of messages that triggered emergency escalation.
    const emergency = await db.aIMessage.count({ where: { role: 'ASSISTANT', safetyLevel: 'EMERGENCY' } });

    // Smoke-test the deterministic safety layer on canonical red-flag phrases.
    const safetySmoke = [
      { phrase: 'heavy bleeding with severe abdominal pain', expectEmergency: true },
      { phrase: 'سردرد شدید با تاری دید', expectEmergency: true },
      { phrase: 'baby not moving today', expectEmergency: true },
      { phrase: 'mild back pain after walking', expectEmergency: false },
    ].map((t) => ({ ...t, actual: assessSafety(t.phrase).level }));

    return json({
      users,
      pregnancies,
      contentPending,
      assets: assets.map((a) => ({ assetId: a.assetId, stage: a.gestationalStage, reviewStatus: a.reviewStatus, publicationStatus: a.publicationStatus })),
      safetyOpen: safetyOpen.length,
      safetyRecent: safetyOpen,
      postsPending,
      payments,
      aiMessages,
      aiEmergencyEscalations: emergency,
      safetySmoke,
    });
  });
}
