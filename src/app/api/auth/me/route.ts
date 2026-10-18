import { db } from '@/lib/db';
import { json } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { getEntitlementFeatures } from '@/lib/entitlements';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ user: null });
  const { plan, features } = await getEntitlementFeatures(user.id);
  const pregnancy = await db.pregnancy.findFirst({
    where: { userId: user.id, status: { in: ['ACTIVE', 'POSTPARTUM'] } },
    orderBy: { createdAt: 'desc' },
  });
  return json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale },
    plan,
    features,
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
          status: pregnancy.status,
        }
      : null,
  });
}
