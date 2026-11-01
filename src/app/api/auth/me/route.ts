import { db } from '@/lib/db';
import { json } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { getEntitlementFeatures } from '@/lib/entitlements';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ user: null });
  const { plan, features } = await getEntitlementFeatures(user.id);
  const [pregnancy, profile, preference] = await Promise.all([
    db.pregnancy.findFirst({
      where: { userId: user.id, status: { in: ['ACTIVE', 'POSTPARTUM'] } },
      orderBy: { createdAt: 'desc' },
    }),
    db.reproductiveProfile.findUnique({ where: { userId: user.id } }),
    db.preference.findUnique({ where: { userId: user.id } }),
  ]);

  const complete = profile?.onboardingStatus === 'COMPLETE';
  // New-user enforcement: no questionnaire, no legacy Preference/pregnancy/baby
  // data → the lifecycle questionnaire runs once before the dashboard (feature
  // 3.1). Legacy users (have data) get the soft path — a dismissible banner,
  // never a forced wall (master prompt §4.8).
  const hasLegacyData = Boolean(preference || pregnancy);
  const onboardingRequired = !complete && !hasLegacyData;
  const onboardingComplete = complete || (hasLegacyData && !profile);

  return json({
    user: { id: user.id, email: user.email, phone: user.phone, name: user.name, role: user.role, locale: user.locale },
    plan,
    features,
    stage: preference?.stage ?? profile?.stage ?? null,
    onboardingRequired,
    onboardingComplete,
    pregnancy: pregnancy
      ? {
          id: pregnancy.id,
          label: pregnancy.label,
          dueDate: pregnancy.dueDate,
          lmpDate: pregnancy.lmpDate,
          datingMethod: pregnancy.datingMethod,
          datingLocked: pregnancy.datingLocked,
          datingConfidence: pregnancy.datingConfidence,
          plurality: pregnancy.plurality,
          specialCare: pregnancy.specialCare,
          status: pregnancy.status,
        }
      : null,
  });
}
