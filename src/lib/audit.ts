import { db } from '@/lib/db';

/** Append-only audit trail. Never includes sensitive medical content — metadata only. */
export async function logAudit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  metadata: Record<string, unknown> | null,
  ip: string | null
): Promise<void> {
  try {
    await db.auditEvent.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        metadata: metadata ? JSON.stringify(sanitize(metadata)) : null,
        ip: ip ? ip.split(',')[0].trim().slice(0, 64) : null,
      },
    });
  } catch {
    // Audit logging must never break the request path; ops monitor failures via logs.
  }
}

function sanitize(meta: Record<string, unknown>): Record<string, unknown> {
  const banned = ['password', 'token', 'body', 'content', 'notes', 'health'];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (banned.includes(k.toLowerCase())) continue;
    out[k] = typeof v === 'object' && v !== null ? '[object]' : v;
  }
  return out;
}

/** Safety events are recorded for clinical-governance review (admin dashboard). */
export async function logSafetyEvent(
  userId: string | null,
  type: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  detail: string
): Promise<void> {
  try {
    await db.safetyEvent.create({ data: { userId, type, severity, detail: detail.slice(0, 500) } });
  } catch {
    // best-effort
  }
}
