import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';

const createSchema = z.object({
  title: z.string().min(2).max(120),
  type: z.enum(['CHECKUP', 'ULTRASOUND', 'LAB', 'SPECIALIST', 'VACCINE', 'OTHER']).default('CHECKUP'),
  provider: z.string().max(120).optional(),
  location: z.string().max(160).optional(),
  scheduledAt: z.string(),
  notes: z.string().max(1000).optional(),
});

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED']),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const appointments = await db.appointment.findMany({
      where: { userId: user.id },
      orderBy: { scheduledAt: 'asc' },
    });
    const now = new Date();
    return json({
      upcoming: appointments.filter((a) => a.scheduledAt >= now && a.status === 'SCHEDULED'),
      past: appointments.filter((a) => a.scheduledAt < now || a.status !== 'SCHEDULED'),
    });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, createSchema);
    const when = new Date(body.scheduledAt);
    if (Number.isNaN(when.getTime())) return apiError(400, 'VALIDATION', 'Invalid date');
    // Appointment + T-24h reminder + notification are written atomically so a
    // partial booking can never exist (risk R-03).
    const appt = await db.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          userId: user.id,
          title: body.title,
          type: body.type,
          provider: body.provider,
          location: body.location,
          scheduledAt: when,
          notes: body.notes,
        },
      });
      await tx.reminder.create({
        data: {
          userId: user.id,
          title: `نوبت: ${created.title}`,
          type: 'APPOINTMENT',
          dueAt: new Date(when.getTime() - 24 * 3_600_000),
        },
      });
      await tx.notification.create({
        data: { userId: user.id, title: 'Appointment scheduled', body: `${created.title} — ${when.toLocaleString()}`, type: 'APPOINTMENT' },
      });
      return created;
    });
    return json({ id: appt.id }, 201);
  });
}

export async function PATCH(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, patchSchema);
    const appt = await db.appointment.findUnique({ where: { id: body.id } });
    if (!appt || appt.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Appointment not found');
    await db.appointment.update({ where: { id: body.id }, data: { status: body.status } });
    return json({ ok: true });
  });
}
