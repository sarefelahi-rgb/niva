import { json, withUser } from '@/lib/api';
import { metricsSnapshot } from '@/lib/observability';

/**
 * Platform metrics for the admin dashboard (backlog 5.3).
 *
 * Aggregates from the in-memory request counters (per-process in the sandbox
 * build — honest about scope; the production target is an external metrics
 * pipeline, docs/audit/02-backlog.md 5.3). No request bodies, user ids, or
 * message content are included — counts and route names only.
 */
export async function GET(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN'], async () => {
    return json(metricsSnapshot());
  });
}
