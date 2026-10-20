import { timingSafeEqual } from 'crypto';
import type { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { apiError, assertSameOrigin, json } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { isPushConfigured, sendPushToUser } from '@/lib/push-server';
import { reconcileExpiredSubscriptions } from '@/lib/billing';

/**
 * Scheduler tick — the single job runner for scheduled notifications.
 *
 * Auth (either):
 *  1. `x-scheduler-secret` header === process.env.SCHEDULER_SECRET (background mini-service), or
 *  2. a valid ADMIN session (for the admin "run tick now" button — the secret is never exposed to the browser).
 *
 * Jobs (in order):
 *  a) MATERIALIZE — flip due IN_APP scheduled notifications to sentAt=now (visible in the feed).
 *  b) REMINDER JOBS — for reminders due within the next 24h create an idempotent scheduled
 *     notification (dedupeKey reminder:{id}:{dueAt}), nudging 30min before due. Overdue
 *     one-shot reminders are deliberately skipped (no spam).
 *  c) APPOINTMENT T-24h — create the day-before appointment reminder job (dedupeKey appt:{id}:t24).
 *  d) EMAIL TWINS — only when SMTP_URL is configured AND the user consented (Consent.emailReminders),
 *     duplicate this tick's freshly created jobs as channel=EMAIL rows. Honest gating: with no
 *     transport configured, zero EMAIL rows are ever written.
 *  e) WEB PUSH — rows materialized in (a) are delivered via web-push when the VAPID
 *     env trio is set. Fire-and-forget (await Promise.allSettled): push failures never
 *     break the tick response. Fail-soft when unconfigured: push.configured=false.
 *  f) BILLING RECONCILIATION (Wave 6.1 hook) — idempotent sweep of expired trials /
 *     ended periods (EXPIRED/CANCELLED + entitlement FREE). Fail-soft: reported as
 *     billing.error=true in the payload, retried next tick.
 *
 * Re-entrancy: a module-level flag returns 409 if a tick is already in progress (the interval
 * worker and the admin button share the same runner).
 */

let running = false;

function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const DAY = 86_400_000;
const HOUR = 3_600_000;

function fmtDateTime(d: Date, locale: string): string {
  return d.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtTime(d: Date, locale: string): string {
  return d.toLocaleTimeString(locale === 'fa' ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Idempotent batch insert keyed on the unique dedupeKey.
 * Note: Prisma's createMany `skipDuplicates` is not available on the SQLite
 * provider (the generator omits it entirely), so dedupe is implemented via a
 * pre-filter on existing keys plus a per-row P2002 fallback for races.
 */
async function createManyDeduped(rows: Prisma.NotificationCreateManyInput[]): Promise<number> {
  if (rows.length === 0) return 0;
  const keys = rows.map((r) => r.dedupeKey).filter((k): k is string => typeof k === 'string');
  const existing = keys.length > 0
    ? await db.notification.findMany({ where: { dedupeKey: { in: keys } }, select: { dedupeKey: true } })
    : [];
  const taken = new Set(existing.map((e) => e.dedupeKey));
  const fresh = rows.filter((r) => typeof r.dedupeKey !== 'string' || !taken.has(r.dedupeKey));
  if (fresh.length === 0) return 0;
  try {
    const res = await db.notification.createMany({ data: fresh });
    return res.count;
  } catch (err) {
    if ((err as { code?: string }).code !== 'P2002') throw err;
    // Concurrent tick slipped a duplicate past the pre-filter — insert one-by-one.
    let n = 0;
    for (const row of fresh) {
      try {
        await db.notification.create({ data: row as Prisma.NotificationUncheckedCreateInput });
        n += 1;
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e;
      }
    }
    return n;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const secretOk = secretMatches(req.headers.get('x-scheduler-secret'), process.env.SCHEDULER_SECRET);
  if (!secretOk) {
    // Fallback: an ADMIN session may invoke the tick from the admin dashboard (no secret in browser).
    if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
    const user = await getSessionUser();
    // Wave 6.2: role spectrum — hasRole(['ADMIN']) admits ADMIN and SUPER_ADMIN.
    if (!user || !hasRole(user, ['ADMIN'])) return apiError(403, 'err.forbidden', 'Scheduler secret or admin session required');
  }
  try {
    return await doTick();
  } catch (err) {
    console.error('[scheduler-tick]', err);
    return apiError(500, 'INTERNAL', 'Unexpected server error');
  }
}

async function doTick(): Promise<NextResponse> {
  if (running) return apiError(409, 'err.conflict', 'Scheduler tick already running');
  running = true;
  try {
    const now = new Date();

    // ── a) Materialize due IN_APP notifications ──────────────────────────────
    // Rows are read first so this tick's materialized set can be pushed (e);
    // the localized title/body stored at creation time is used as-is.
    const dueRows = await db.notification.findMany({
      where: { channel: 'IN_APP', sentAt: null, scheduledFor: { lte: now } },
      select: { id: true, userId: true, title: true, body: true },
      take: 500,
    });
    const materialized = await db.notification.updateMany({
      where: { channel: 'IN_APP', sentAt: null, scheduledFor: { lte: now } },
      data: { sentAt: now },
    });

    // ── b) Reminder jobs (due within the next 24h) ───────────────────────────
    const soon = new Date(now.getTime() + DAY);
    const reminders = await db.reminder.findMany({
      where: { done: false, dueAt: { gte: now, lte: soon } },
      take: 500,
      select: { id: true, userId: true, title: true, type: true, dueAt: true },
    });

    // ── c) Appointment T-24h jobs ────────────────────────────────────────────
    const appts = await db.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: new Date(now.getTime() + DAY), lte: new Date(now.getTime() + DAY + HOUR) },
      },
      take: 500,
      select: { id: true, userId: true, title: true, scheduledAt: true },
    });

    // One batched user lookup for localization of both job sets.
    const userIds = [...new Set([...reminders.map((r) => r.userId), ...appts.map((a) => a.userId)])];
    const users = userIds.length > 0
      ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, locale: true } })
      : [];
    const faById = new Set(users.filter((u) => u.locale === 'fa').map((u) => u.id));

    // Explicit Prisma input annotation keeps the shape locked for the deduped insert helper.
    const reminderRows: Prisma.NotificationCreateManyInput[] = reminders.map((r) => {
      const fa = faById.has(r.userId);
      return {
        userId: r.userId,
        title: fa ? 'یادآور' : 'Reminder',
        body: fa
          ? `${r.title} — موعد: ${fmtDateTime(r.dueAt, 'fa')}`
          : `${r.title} — due ${fmtDateTime(r.dueAt, 'en')}`,
        type: r.type === 'APPOINTMENT' ? 'APPOINTMENT' : 'SYSTEM',
        channel: 'IN_APP',
        scheduledFor: new Date(r.dueAt.getTime() - 30 * 60_000),
        sentAt: null,
        dedupeKey: `reminder:${r.id}:${r.dueAt.toISOString()}`,
      };
    });

    const apptRows: Prisma.NotificationCreateManyInput[] = appts.map((a) => {
      const fa = faById.has(a.userId);
      return {
        userId: a.userId,
        title: fa ? 'یادآور نوبت' : 'Appointment reminder',
        body: fa
          ? `${a.title} — فردا ساعت ${fmtTime(a.scheduledAt, 'fa')}`
          : `${a.title} — tomorrow at ${fmtTime(a.scheduledAt, 'en')}`,
        type: 'APPOINTMENT',
        channel: 'IN_APP',
        scheduledFor: new Date(a.scheduledAt.getTime() - DAY),
        sentAt: null,
        dedupeKey: `appt:${a.id}:t24`,
      };
    });

    let remindersCreated = 0;
    if (reminderRows.length > 0) remindersCreated = await createManyDeduped(reminderRows);
    let apptRemindersCreated = 0;
    if (apptRows.length > 0) apptRemindersCreated = await createManyDeduped(apptRows);

    // ── d) Consent-gated EMAIL twins (honest: only when a transport is configured) ──
    const emailTransportConfigured = Boolean(process.env.SMTP_URL && process.env.SMTP_URL.trim() !== '');
    if (emailTransportConfigured && (reminderRows.length > 0 || apptRows.length > 0)) {
      const candidates = [...reminderRows, ...apptRows];
      const consents = await db.consent.findMany({
        where: { userId: { in: [...new Set(candidates.map((c) => c.userId))] }, emailReminders: true },
        select: { userId: true },
      });
      if (consents.length > 0) {
        const allowed = new Set(consents.map((c) => c.userId));
        const twins = candidates
          .filter((c) => allowed.has(c.userId))
          .map((c) => ({ ...c, channel: 'EMAIL', dedupeKey: `${c.dedupeKey}:email` }));
        if (twins.length > 0) await createManyDeduped(twins);
      }
    }

    const pendingScheduled = await db.notification.count({ where: { sentAt: null, scheduledFor: { not: null } } });

    // ── e) Web push for this tick's materialized rows (never breaks the tick) ──
    const pushPayloadByUser = new Map<string, { title: string; body: string }>();
    for (const row of dueRows) {
      if (!pushPayloadByUser.has(row.userId)) {
        pushPayloadByUser.set(row.userId, { title: row.title, body: row.body });
      }
    }
    const pushSettled = await Promise.allSettled(
      [...pushPayloadByUser.entries()].map(([userId, payload]) =>
        sendPushToUser(userId, { ...payload, url: '/' })
      )
    );
    const push = pushSettled.reduce(
      (acc, r) => {
        const v = r.status === 'fulfilled'
          ? r.value
          : { sent: 0, removed: 0, failed: 0, configured: true }; // rejected send = attempt happened
        acc.sent += v.sent;
        acc.removed += v.removed;
        acc.failed += v.failed;
        acc.configured = acc.configured || v.configured;
        return acc;
      },
      { sent: 0, removed: 0, failed: 0, configured: pushPayloadByUser.size > 0 ? false : isPushConfigured() }
    );

    // ── f) Billing reconciliation (Wave 6.1 hook) — idempotent sweep: TRIALING
    //    past trialEndsAt → EXPIRED; ACTIVE past currentPeriodEnd → EXPIRED /
    //    CANCELLED (cancelAtPeriodEnd); entitlements dropped to FREE. Fail-soft.
    let billing: { changed: number; ranAt: string } | { error: true };
    try {
      const r = await reconcileExpiredSubscriptions();
      billing = { changed: r.changed, ranAt: r.ranAt };
    } catch {
      billing = { error: true }; // honest signal in the tick payload; retried next tick
    }

    return json({
      ok: true,
      materialized: materialized.count,
      remindersCreated,
      apptRemindersCreated,
      pendingScheduled,
      emailTransportConfigured,
      push,
      billing,
    });
  } finally {
    running = false;
  }
}
