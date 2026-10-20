import 'server-only';

/**
 * Web-push server plumbing (server-only). PHI discipline: this module NEVER
 * logs payload content (titles/bodies carry localized health-reminder text) —
 * only counts and endpoint-key identifiers appear in logs.
 *
 * Fail-soft: when the VAPID env trio is unset the module reports
 * { configured: false } and sends nothing, so builds and dev environments
 * without push keys never break.
 */

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushSendResult {
  sent: number;
  removed: number;
  failed: number;
  configured: boolean;
}

function vapidEnvs(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.NIVA_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.NIVA_PUSH_VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.NIVA_PUSH_SUBJECT?.trim() || 'mailto:ops@niva.health';
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

/** Public material only — safe to expose to the browser. */
export function pushPublicKey(): string | null {
  return process.env.NIVA_PUSH_VAPID_PUBLIC_KEY?.trim() || null;
}

export function isPushConfigured(): boolean {
  return vapidEnvs() !== null;
}

/**
 * Sends `payload` to every stored subscription of `userId`.
 * 404/410 responses are the push service telling us the endpoint is dead →
 * the row is deleted. Other errors count as failed (logged without content).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushSendResult> {
  const vapid = vapidEnvs();
  if (!vapid) return { sent: 0, removed: 0, failed: 0, configured: false };

  const { db } = await import('@/lib/db');
  const subs = await db.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true },
    take: 20,
  });
  if (subs.length === 0) return { sent: 0, removed: 0, failed: 0, configured: true };

  // Dynamic import: environments without the dependency must never fail a build.
  const webpush = await import('web-push');
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const json = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;
  let failed = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.endpoint, json, {
          TTL: 3 * 24 * 60 * 60,
          urgency: 'normal',
        });
        sent += 1;
      } catch (err) {
        const status =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (status === 404 || status === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          removed += 1;
        } else {
          // Count only — never the payload, never the raw endpoint URL.
          console.warn(`[push] delivery failed status=${status ?? 'unknown'} subs=${subs.length}`);
          failed += 1;
        }
      }
    })
  );

  return { sent, removed, failed, configured: true };
}
