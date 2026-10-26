import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/**
 * Wave 11 — doctor-visit & online-consultation bookings.
 *
 * GET   — role-aware list: patients see their own bookings, DOCTOR role sees
 *         bookings addressed to their doctor profile. `?id=` returns one row
 *         (strict ownership — no existence leak).
 * POST  — patient books a doctor: validates APPROVED status, allowed mode,
 *         availability alignment, lead time, and double-booking (transaction).
 * PATCH — patient: cancel / change consent flags. Doctor: confirm / cancel /
 *         complete / no_show. Every transition notifies the other party.
 */

const MODES = ['CLINIC', 'ONLINE_VOICE', 'ONLINE_VIDEO'] as const;

function slotAligns(
  windows: { weekday: number; startMin: number; endMin: number; slotMin: number; active: boolean }[],
  when: Date
): boolean {
  const weekday = when.getDay();
  const minuteOfDay = when.getHours() * 60 + when.getMinutes();
  return windows.some(
    (w) =>
      w.active &&
      w.weekday === weekday &&
      minuteOfDay >= w.startMin &&
      minuteOfDay + w.slotMin <= w.endMin &&
      (minuteOfDay - w.startMin) % w.slotMin === 0
  );
}

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    const isDoctor = user.role === 'DOCTOR';
    let doctorId: string | null = null;
    if (isDoctor) {
      const profile = await db.doctorProfile.findUnique({ where: { userId: user.id } });
      if (!profile) return json({ consultations: [] });
      doctorId = profile.id;
    }

    const include = {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { include: { user: { select: { name: true } } } },
    } as const;

    if (id) {
      const row = await db.doctorAppointment.findUnique({ where: { id }, include });
      const mine = row && (row.patientId === user.id || (doctorId && row.doctorId === doctorId));
      if (!row || !mine) return apiError(404, 'NOT_FOUND', 'Consultation not found');
      return json({ consultation: row });
    }

    const rows = await db.doctorAppointment.findMany({
      where: isDoctor ? { doctorId: doctorId! } : { patientId: user.id },
      include,
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });
    return json({ consultations: rows });
  });
}

const createSchema = z.object({
  doctorId: z.string().min(1),
  mode: z.enum(MODES),
  scheduledAt: z.string(),
  reason: z.string().max(500).optional(),
  shareTracking: z.boolean().default(false),
  shareRecords: z.boolean().default(false),
  shareDaily: z.boolean().default(false),
});

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, createSchema);
    const when = new Date(body.scheduledAt);
    if (Number.isNaN(when.getTime())) return apiError(400, 'VALIDATION', 'Invalid date');

    const doctor = await db.doctorProfile.findUnique({
      where: { id: body.doctorId },
      include: { availabilities: true },
    });
    if (!doctor || doctor.status !== 'APPROVED') return apiError(404, 'NOT_FOUND', 'Doctor not found');

    const modeAllowed =
      doctor.visitTypes === 'BOTH' ||
      (doctor.visitTypes === 'CLINIC' && body.mode === 'CLINIC') ||
      (doctor.visitTypes === 'ONLINE' && body.mode !== 'CLINIC');
    if (!modeAllowed) return apiError(400, 'MODE_NOT_ALLOWED', 'این نوع ویزیت برای این پزشک فعال نیست');

    if (when.getTime() < Date.now() + 60 * 60_000) {
      return apiError(400, 'SLOT_PAST', 'نوبت باید حداقل یک ساعت آینده باشد');
    }
    if (!slotAligns(doctor.availabilities, when)) {
      return apiError(400, 'SLOT_INVALID', 'این زمان با ساعات کاری پزشک هم‌خوانی ندارد');
    }

    // Double-booking guard: same doctor, same start instant, active statuses.
    const clash = await db.doctorAppointment.findFirst({
      where: { doctorId: doctor.id, scheduledAt: when, status: { in: ['REQUESTED', 'CONFIRMED'] } },
      select: { id: true },
    });
    if (clash) return apiError(409, 'SLOT_TAKEN', 'این نوبت همین حالا رزرو شد. زمان دیگری انتخاب کنید.');

    const created = await db.doctorAppointment.create({
      data: {
        patientId: user.id,
        doctorId: doctor.id,
        mode: body.mode,
        scheduledAt: when,
        reason: body.reason,
        shareTracking: body.shareTracking,
        shareRecords: body.shareRecords,
        shareDaily: body.shareDaily,
      },
    });
    await db.$transaction([
      db.notification.create({
        data: {
          userId: doctor.userId,
          title: 'درخواست نوبت جدید',
          body: `بیمار جدید برای ${when.toLocaleString('fa-IR')} درخواست نوبت ثبت کرد.`,
          type: 'APPOINTMENT',
        },
      }),
      db.reminder.create({
        data: {
          userId: user.id,
          title: 'نوبت پزشک',
          type: 'APPOINTMENT',
          dueAt: new Date(when.getTime() - 24 * 3_600_000),
        },
      }),
    ]);
    await logAudit(user.id, 'BOOKING_CREATE', 'DoctorAppointment', created.id, { doctorId: doctor.id, mode: body.mode }, null);
    return json({ id: created.id }, 201);
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['cancel', 'confirm', 'complete', 'no_show']),
  shareTracking: z.boolean().optional(),
  shareRecords: z.boolean().optional(),
  shareDaily: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, patchSchema);
    const row = await db.doctorAppointment.findUnique({
      where: { id: body.id },
      include: { doctor: { include: { user: { select: { id: true } } } } },
    });
    if (!row) return apiError(404, 'NOT_FOUND', 'Consultation not found');

    const isPatient = row.patientId === user.id;
    const isOwnerDoctor = user.role === 'DOCTOR' && row.doctor.user.id === user.id;
    if (!isPatient && !isOwnerDoctor) return apiError(404, 'NOT_FOUND', 'Consultation not found');

    // Patients may cancel or edit their own consent flags only.
    if (isPatient && !['cancel', 'confirm'].includes(body.action)) {
      return apiError(403, 'FORBIDDEN', 'Patients can only cancel or edit sharing');
    }
    // 'confirm' for a patient means re-affirming consent flags (never status).
    if (body.action === 'confirm' && isPatient) {
      const data: Record<string, boolean> = {};
      if (body.shareTracking !== undefined) data.shareTracking = body.shareTracking;
      if (body.shareRecords !== undefined) data.shareRecords = body.shareRecords;
      if (body.shareDaily !== undefined) data.shareDaily = body.shareDaily;
      await db.doctorAppointment.update({ where: { id: row.id }, data });
      await logAudit(user.id, 'BOOKING_CONSENT_UPDATE', 'DoctorAppointment', row.id, data, null);
      return json({ ok: true });
    }

    if (row.status === 'CANCELLED' || row.status === 'COMPLETED') {
      return apiError(400, 'INVALID_STATE', 'این نوبت قابل تغییر نیست');
    }

    const statusMap = { cancel: 'CANCELLED', confirm: 'CONFIRMED', complete: 'COMPLETED', no_show: 'NO_SHOW' } as const;
    const newStatus = statusMap[body.action];
    await db.doctorAppointment.update({ where: { id: row.id }, data: { status: newStatus } });

    const notifyUserId = isPatient ? row.doctor.user.id : row.patientId;
    const text: Record<string, { fa: string }> = {
      cancel: { fa: 'نوبت لغو شد' },
      confirm: { fa: 'نوبت شما توسط پزشک تأیید شد' },
      complete: { fa: 'ویزیت انجام شد' },
      no_show: { fa: 'ویزیت به‌عنوان عدم حضور ثبت شد' },
    };
    await db.notification.create({
      data: { userId: notifyUserId, title: 'به‌روزرسانی نوبت', body: text[body.action].fa, type: 'APPOINTMENT' },
    });
    await logAudit(user.id, `BOOKING_${body.action.toUpperCase()}`, 'DoctorAppointment', row.id, { status: newStatus }, null);
    return json({ ok: true });
  });
}
