import { db } from '@/lib/db';
import { json, apiError, withUser } from '@/lib/api';
import { gestationalAgeAt, trimesterOf } from '@/lib/gestational';

/**
 * Partner-side read endpoints, strictly scoped by the granter's permissions.
 * - GET            → active grants shared WITH me (as viewer)
 * - GET ?granterId → privacy-minimal payload for ONLY the granted scopes
 */
export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const granterId = new URL(req.url).searchParams.get('granterId');

    if (!granterId) {
      const grants = await db.partnerAccess.findMany({
        where: { partnerUserId: user.id, status: 'ACTIVE' },
        include: { granter: { select: { name: true } } },
        orderBy: { invitedAt: 'desc' },
      });
      return json({
        grants: grants.map((g) => ({
          id: g.id,
          granterId: g.granterId,
          granterName: g.granter.name,
          permissions: JSON.parse(g.permissions) as string[],
          invitedAt: g.invitedAt,
        })),
      });
    }

    const grant = await db.partnerAccess.findFirst({
      where: { granterId, partnerUserId: user.id, status: 'ACTIVE' },
      include: { granter: { select: { name: true } } },
    });
    if (!grant) return apiError(404, 'NOT_FOUND', 'Shared access not found');

    const permissions = JSON.parse(grant.permissions) as string[];
    const now = new Date();
    const data: {
      timeline?: Record<string, unknown>;
      appointments?: Array<Record<string, unknown>>;
      tracking?: Array<Record<string, unknown>>;
      journal?: Array<Record<string, unknown>>;
    } = {};

    if (permissions.includes('VIEW_TIMELINE')) {
      const preg = await db.pregnancy.findFirst({
        where: { userId: grant.granterId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      if (preg) {
        const ga = gestationalAgeAt(preg.lmpDate ? { lmp: preg.lmpDate } : { dueDate: preg.dueDate }, now);
        data.timeline = {
          label: preg.label,
          dueDate: preg.dueDate,
          plurality: preg.plurality,
          datingMethod: preg.datingMethod,
          week: { weeks: ga.weeks, days: ga.days },
          trimester: trimesterOf(ga.weeks),
        };
      }
    }

    if (permissions.includes('VIEW_APPOINTMENTS')) {
      data.appointments = await db.appointment.findMany({
        where: { userId: grant.granterId, scheduledAt: { gt: now }, status: 'SCHEDULED' },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: { title: true, type: true, scheduledAt: true, provider: true },
      });
    }

    if (permissions.includes('VIEW_TRACKING')) {
      const since = new Date(now.getTime() - 14 * 86_400_000);
      data.tracking = await db.symptomEntry.findMany({
        where: { userId: grant.granterId, date: { gte: since } },
        orderBy: { date: 'desc' },
        // Privacy-minimal: no notes, no weight/BP/kick counts.
        select: { date: true, energy: true, mood: true, sleep: true, nausea: true },
      });
    }

    if (permissions.includes('VIEW_JOURNAL')) {
      data.journal = await db.journalEntry.findMany({
        where: { userId: grant.granterId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { title: true, mood: true, body: true, createdAt: true },
      });
    }

    return json({ granterName: grant.granter.name, permissions, data });
  });
}
