import { z } from 'zod';
import { db } from '@/lib/db';
import { json, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

const FLAGS = ['community', 'family', 'studio', 'ar'] as const;
type Flag = (typeof FLAGS)[number];

export async function GET(req: Request) {
  return withUser(req, ['ADMIN'], async () => {
    const row = await db.setting.findUnique({ where: { key: 'featureFlags' } });
    return json({ flags: row ? (JSON.parse(row.value) as Record<Flag, boolean>) : { community: true, family: true, studio: true, ar: true } });
  });
}

export async function POST(req: Request) {
  return withUser(req, ['ADMIN'], async ({ user }) => {
    const body = await readJson(req, z.object({ flags: z.record(z.string(), z.boolean()) }));
    const current = await db.setting.findUnique({ where: { key: 'featureFlags' } });
    const merged: Record<Flag, boolean> = current
      ? (JSON.parse(current.value) as Record<Flag, boolean>)
      : { community: true, family: true, studio: true, ar: true };
    for (const f of FLAGS) {
      if (f in body.flags) merged[f] = Boolean(body.flags[f]);
    }
    await db.setting.upsert({
      where: { key: 'featureFlags' },
      update: { value: JSON.stringify(merged) },
      create: { key: 'featureFlags', value: JSON.stringify(merged) },
    });
    await logAudit(user.id, 'FEATURE_FLAGS_UPDATE', 'Setting', 'featureFlags', body.flags, req.headers.get('x-forwarded-for'));
    return json({ flags: merged });
  });
}
