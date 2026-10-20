import { z } from 'zod';
import { db } from '@/lib/db';
import { json, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { FLAG_NAMES, getFlags, invalidateFlagsCache, isFlagEnabled } from '@/lib/feature-flags';

/**
 * Wave 6.2 — admin feature flags with staged rollout.
 *
 * GET  — normalized flags ({enabled, rolloutPercent} per flag).
 * POST — accepts the legacy boolean shape OR {enabled?, rolloutPercent?} per
 *        flag; merges into the Setting row, invalidates the 30s cache, audits
 *        the change and returns the flags PLUS the effective evaluation for
 *        the seeded demo user (demo@niva.health) so the console can show an
 *        honest "effective for demo user" indicator computed server-side.
 */

const flagShape = z.union([
  z.boolean(),
  z.object({
    enabled: z.boolean().optional(),
    rolloutPercent: z.number().min(0).max(100).nullable().optional(),
  }),
]);

const postSchema = z.object({
  flags: z.record(z.string(), flagShape),
});

export async function GET(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN'], async () => {
    const flags = await getFlags();
    return json({ flags });
  });
}

export async function POST(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN'], async ({ user }) => {
    const body = await readJson(req, postSchema);
    const current = await getFlags();
    const merged = { ...current };

    for (const name of FLAG_NAMES) {
      const v = body.flags[name];
      if (v === undefined) continue;
      if (typeof v === 'boolean') {
        merged[name] = { enabled: v, rolloutPercent: current[name].rolloutPercent };
      } else {
        merged[name] = {
          enabled: v.enabled ?? current[name].enabled,
          rolloutPercent: v.rolloutPercent === undefined ? current[name].rolloutPercent : v.rolloutPercent,
        };
      }
    }

    await db.setting.upsert({
      where: { key: 'featureFlags' },
      update: { value: JSON.stringify(merged) },
      create: { key: 'featureFlags', value: JSON.stringify(merged) },
    });
    invalidateFlagsCache();

    // Honest "effective for demo user" evaluation — computed server-side after
    // the save, using the same deterministic bucketing as the real gates.
    const demo = await db.user.findUnique({ where: { email: 'demo@niva.health' }, select: { id: true } });
    const effective: Record<string, boolean> = {};
    for (const name of FLAG_NAMES) {
      effective[name] = demo ? await isFlagEnabled(name, demo.id) : merged[name].enabled;
    }

    await logAudit(
      user.id,
      'FEATURE_FLAGS_UPDATE',
      'Setting',
      'featureFlags',
      { flags: body.flags },
      req.headers.get('x-forwarded-for')
    );

    return json({ flags: merged, effective });
  });
}
