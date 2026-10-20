import { z } from 'zod';
import { db } from '@/lib/db';
import { json, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/**
 * Wave 6.2 — platform incident log.
 *
 * GET  — open incidents first (INVESTIGATING/IDENTIFIED/MONITORING), then
 *        resolved (most recent first). Role: ADMIN/SUPER_ADMIN (`incidents`).
 * POST — open a new incident (title, description, severity). The opener is
 *        recorded; every mutation is audited.
 *
 * HONEST NOTE: the public status page (status.niva.health-style) is a
 * documented production target — incidents are admin-console-only in this
 * build (see docs backlog).
 */

const createSchema = z.object({
  title: z.string().min(4).max(140),
  description: z.string().min(4).max(4000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

export async function GET(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN'], async () => {
    const rows = await db.incident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { openedBy: { select: { email: true, name: true } } },
    });
    const open = rows.filter((r) => r.status !== 'RESOLVED');
    const resolved = rows.filter((r) => r.status === 'RESOLVED');
    const map = (r: (typeof rows)[number]) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      severity: r.severity,
      status: r.status,
      openedBy: r.openedBy?.email ?? null,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
    return json({ incidents: [...open, ...resolved].map(map), counts: { open: open.length, total: rows.length } });
  });
}

export async function POST(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN'], async ({ user }) => {
    const body = await readJson(req, createSchema);
    const incident = await db.incident.create({
      data: {
        title: body.title,
        description: body.description,
        severity: body.severity,
        status: 'INVESTIGATING',
        openedById: user.id,
      },
    });
    await logAudit(
      user.id,
      'INCIDENT_OPENED',
      'Incident',
      incident.id,
      { severity: body.severity },
      req.headers.get('x-forwarded-for')
    );
    return json(
      {
        incident: {
          id: incident.id,
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          status: incident.status,
          resolvedAt: incident.resolvedAt,
          createdAt: incident.createdAt,
        },
      },
      201
    );
  });
}
