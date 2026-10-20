import { readFileSync } from 'node:fs';

/**
 * NIVA scheduler worker — pure cron, no HTTP listener.
 *
 * Every 60s (first run after 5s) it POSTs the project's tick endpoint with the
 * shared secret from mini-services/scheduler/.env (falls back to the project
 * root .env when the local file is missing). Failures are logged and retried
 * on the next tick — the worker never crashes on transport errors.
 */

const TICK_URL = process.env.SCHEDULER_TICK_URL ?? 'http://localhost:3000/api/scheduler/tick';
const INTERVAL_MS = 60_000;
const FIRST_RUN_DELAY_MS = 5_000;

function readSecret(): string {
  // Bun auto-loads .env from the service cwd; this also covers a missing local
  // file by parsing the project root .env directly.
  if (process.env.SCHEDULER_SECRET) return process.env.SCHEDULER_SECRET;
  const candidates = [
    new URL('./.env', import.meta.url),
    new URL('../../.env', import.meta.url),
  ];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf8');
      const line = raw.split('\n').find((l) => l.trim().startsWith('SCHEDULER_SECRET='));
      if (line) return line.slice(line.indexOf('=') + 1).trim();
    } catch {
      // try next candidate
    }
  }
  return '';
}

const SECRET = readSecret();

if (!SECRET) {
  console.log('[scheduler] WARN no SCHEDULER_SECRET found — ticks will be rejected (403) until configured');
}

async function tick(): Promise<void> {
  try {
    const res = await fetch(TICK_URL, {
      method: 'POST',
      headers: { 'x-scheduler-secret': SECRET },
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      console.log(`[scheduler] tick rejected status=${res.status}`, JSON.stringify(data ?? {}));
      return;
    }
    console.log(
      `[scheduler] materialized=${data?.materialized ?? '?'} reminders=${data?.remindersCreated ?? '?'} appt=${data?.apptRemindersCreated ?? '?'} pending=${data?.pendingScheduled ?? '?'} email=${data?.emailTransportConfigured ?? '?'}`
    );
  } catch (err) {
    console.log(`[scheduler] tick error (will retry next interval): ${(err as Error).message}`);
  }
}

console.log(`[scheduler] started — tick every ${INTERVAL_MS / 1000}s → ${TICK_URL}`);

// Both timers keep the process alive (this worker is a pure cron — no HTTP
// listener — so the timers are the only thing holding the loop open).
// globalThis guard: `bun --hot` reloads must not stack duplicate intervals.
const g = globalThis as typeof globalThis & { __nivaSchedulerStarted?: boolean };
if (!g.__nivaSchedulerStarted) {
  g.__nivaSchedulerStarted = true;
  setTimeout(() => {
    void tick();
  }, FIRST_RUN_DELAY_MS);
  setInterval(() => {
    void tick();
  }, INTERVAL_MS);
}
