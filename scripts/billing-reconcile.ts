/**
 * NIVA ops tool — manual billing reconciliation (Wave 6.1).
 *
 * Runs reconcileExpiredSubscriptions() against the configured database:
 * TRIALING/ACTIVE subscriptions past their period/trial end become EXPIRED or
 * CANCELLED (cancelAtPeriodEnd) with the entitlement degraded to FREE. It is
 * idempotent — safe to run on a schedule (the scheduler tick mini-service will
 * call the same function; orchestrator wiring pending).
 *
 * Usage:
 *   bun scripts/billing-reconcile.ts                # reconcile with the real clock
 *   bun scripts/billing-reconcile.ts --now <iso>    # reconcile as of a future/past instant
 */
import { reconcileExpiredSubscriptions } from '../src/lib/billing';

const nowIdx = process.argv.indexOf('--now');
const now = nowIdx > -1 ? new Date(process.argv[nowIdx + 1]) : new Date();
if (Number.isNaN(now.getTime())) {
  console.error('Invalid --now timestamp');
  process.exit(1);
}

reconcileExpiredSubscriptions(now)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error('[billing-reconcile]', err);
    process.exit(1);
  });
