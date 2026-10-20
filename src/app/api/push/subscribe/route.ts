import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, json, readJson, withUser } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

/**
 * Push subscription registry (withUser, any role).
 * - POST   {endpoint, keys:{p256dh, auth}, locale?} → upsert keyed on the unique
 *   endpoint. Locale is copied from the user's profile at save time so the
 *   scheduled-notification pipeline can pick matching copy.
 * - DELETE {endpoint} → removes the caller's row only (owner-checked, no
 *   existence leak for endpoints owned by someone else).
 *
 * Cross-user protection: an endpoint is a per-browser unique — if a row exists
 * for a different user we refuse (409) rather than silently re-own it.
 */

const bodySchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(2048)
    .refine((u) => u.startsWith('https://'), 'endpoint must be https'),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  locale: z.enum(['fa', 'en']).optional(),
});

const deleteSchema = z.object({ endpoint: z.string().url().max(2048) });

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, 'push:subscribe'), 30, 60_000)) {
    return apiError(429, 'RATE_LIMITED', 'Too many requests — slow down');
  }
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, bodySchema);

    const existing = await db.pushSubscription.findUnique({
      where: { endpoint: body.endpoint },
      select: { id: true, userId: true },
    });
    if (existing && existing.userId !== user.id) {
      return apiError(409, 'CONFLICT', 'Endpoint registered to another account');
    }

    const row = await db.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: { p256dh: body.keys.p256dh, auth: body.keys.auth, locale: body.locale ?? user.locale },
      create: {
        userId: user.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        locale: body.locale ?? user.locale,
      },
      select: { id: true },
    });

    await logAudit(user.id, 'push.subscribe', 'PushSubscription', row.id, { locale: body.locale ?? user.locale }, req.headers.get('x-forwarded-for'));
    return json({ ok: true, id: row.id }, existing ? 200 : 201);
  });
}

export async function DELETE(req: Request) {
  if (!rateLimit(clientKey(req, 'push:subscribe'), 30, 60_000)) {
    return apiError(429, 'RATE_LIMITED', 'Too many requests — slow down');
  }
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, deleteSchema);
    const res = await db.pushSubscription.deleteMany({
      where: { endpoint: body.endpoint, userId: user.id },
    });
    await logAudit(user.id, 'push.unsubscribe', 'PushSubscription', null, { removed: res.count }, req.headers.get('x-forwarded-for'));
    return json({ ok: true, removed: res.count });
  });
}
