import { z } from 'zod';
import { db } from '@/lib/db';
import { json, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/**
 * Onboarding preferences (progressive profiling, Wave 2.2).
 * Stage + goals + units chosen during onboarding; updatable any time.
 */
const putSchema = z.object({
  stage: z.enum(['TRYING', 'PREGNANT', 'POSTPARTUM', 'EXPLORING']).optional(),
  goals: z
    .array(z.enum(['NUTRITION', 'SLEEP', 'MOOD', 'BIRTH_PREP', 'POSTPARTUM_CARE', 'FITNESS', 'BABY_MOVEMENT']))
    .max(7)
    .optional(),
  units: z.enum(['METRIC', 'IMPERIAL']).optional(),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const pref = await db.preference.findUnique({ where: { userId: user.id } });
    return json({
      stage: pref?.stage ?? null,
      goals: pref ? (JSON.parse(pref.goals) as string[]) : [],
      units: pref?.units ?? 'METRIC',
    });
  });
}

export async function PUT(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, putSchema);
    const data = {
      ...(body.stage ? { stage: body.stage } : {}),
      ...(body.goals ? { goals: JSON.stringify(body.goals) } : {}),
      ...(body.units ? { units: body.units } : {}),
    };
    const pref = await db.preference.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });
    await logAudit(user.id, 'PREFERENCES_UPDATE', 'Preference', pref.id, { stage: body.stage ?? undefined, units: body.units ?? undefined }, req.headers.get('x-forwarded-for'));
    return json({
      stage: pref.stage,
      goals: JSON.parse(pref.goals) as string[],
      units: pref.units,
    });
  });
}
