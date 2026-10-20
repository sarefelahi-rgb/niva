import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, json, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/**
 * Wave 6.2 — incident lifecycle transitions.
 * PATCH { status } moves an incident through INVESTIGATING → IDENTIFIED →
 * MONITORING → RESOLVED (skips allowed). Reaching RESOLVED stamps resolvedAt;
 * leaving RESOLVED clears it (honest reopen). Every transition is audited.
 */

const msg = (fa: string, en: string) => `${fa} | ${en}`;

const patchSchema = z.object({
  status: z.enum(['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED']),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, ['ADMIN', 'SUPER_ADMIN'], async ({ user }) => {
    const incident = await db.incident.findUnique({ where: { id } });
    if (!incident) return apiError(404, 'NOT_FOUND', 'حادثه یافت نشد | Incident not found');

    const body = await readJson(req, patchSchema);
    const updated = await db.incident.update({
      where: { id: incident.id },
      data: {
        status: body.status,
        resolvedAt: body.status === 'RESOLVED' ? new Date() : null,
      },
    });
    await logAudit(
      user.id,
      'INCIDENT_STATUS',
      'Incident',
      incident.id,
      { before: incident.status, after: body.status },
      req.headers.get('x-forwarded-for')
    );
    return json({
      incident: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        severity: updated.severity,
        resolvedAt: updated.resolvedAt,
        updatedAt: updated.updatedAt,
      },
    });
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, ['ADMIN', 'SUPER_ADMIN'], async ({ user }) => {
    const incident = await db.incident.findUnique({ where: { id } });
    if (!incident) return apiError(404, 'NOT_FOUND', 'حادثه یافت نشد | Incident not found');
    await db.incident.delete({ where: { id: incident.id } });
    await logAudit(user.id, 'INCIDENT_DELETED', 'Incident', incident.id, { title: incident.title }, req.headers.get('x-forwarded-for'));
    return json({ ok: true });
  });
}
