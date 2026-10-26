import { db } from '@/lib/db';
import { json, apiError, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/**
 * Wave 11 — consent-gated patient health summary for the treating doctor.
 *
 * Access rule (hard requirement from the privacy model):
 *   The doctor may open the summary of a booking addressed to THEIR profile,
 *   and each section of health data is returned ONLY when the PATIENT granted
 *   the corresponding consent flag on that booking. Revoked flags hide the
 *   data immediately — the endpoint re-reads flags on every call.
 *
 * Sections:
 *   shareTracking → pregnancy week summary + symptom/tracking entries (14d)
 *   shareRecords  → medical documents metadata (no file contents)
 *   shareDaily    → wellness dailies: mood / sleep / exercise (7d)
 */

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');

    const row = await db.doctorAppointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, userId: true, specialty: true } },
      },
    });
    if (!row) return apiError(404, 'NOT_FOUND', 'Consultation not found');

    const isOwnerDoctor = user.role === 'DOCTOR' && row.doctor.userId === user.id;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    if (!isOwnerDoctor && !isAdmin) return apiError(403, 'FORBIDDEN', 'Only the treating doctor can open this summary');

    const now = new Date();
    const since14 = new Date(now.getTime() - 14 * 86_400_000);
    const since7 = new Date(now.getTime() - 7 * 86_400_000);

    const pregnancy = row.shareTracking
      ? await db.pregnancy.findFirst({
          where: { userId: row.patientId, status: { in: ['ACTIVE', 'POSTPARTUM'] } },
          orderBy: { createdAt: 'desc' },
        })
      : null;

    const tracking = row.shareTracking
      ? await db.symptomEntry.findMany({
          where: { userId: row.patientId, date: { gte: since14 } },
          orderBy: { date: 'desc' },
          take: 14,
        })
      : null;

    const documents = row.shareRecords
      ? await db.medicalDocument.findMany({
          where: { userId: row.patientId },
          orderBy: { uploadedAt: 'desc' },
          take: 20,
          select: { id: true, title: true, category: true, fileName: true, fileType: true, sizeKb: true, uploadedAt: true, notes: true },
        })
      : null;

    const mood = row.shareDaily
      ? await db.moodEntry.findMany({ where: { userId: row.patientId, date: { gte: since7 } }, orderBy: { date: 'desc' } })
      : null;
    const sleep = row.shareDaily
      ? await db.sleepEntry.findMany({ where: { userId: row.patientId, date: { gte: since7 } }, orderBy: { date: 'desc' } })
      : null;
    const exercise = row.shareDaily
      ? await db.exerciseEntry.findMany({ where: { userId: row.patientId, date: { gte: since7 } }, orderBy: { date: 'desc' } })
      : null;

    await logAudit(user.id, 'PATIENT_SUMMARY_VIEW', 'DoctorAppointment', row.id, { consent: [row.shareTracking, row.shareRecords, row.shareDaily] }, null);

    return json({
      patient: { id: row.patient.id, name: row.patient.name, phone: row.patient.phone },
      consultation: { id: row.id, mode: row.mode, scheduledAt: row.scheduledAt, status: row.status, reason: row.reason },
      consent: { tracking: row.shareTracking, records: row.shareRecords, daily: row.shareDaily },
      pregnancy: pregnancy
        ? { label: pregnancy.label, dueDate: pregnancy.dueDate, lmpDate: pregnancy.lmpDate, status: pregnancy.status, plurality: pregnancy.plurality }
        : null,
      tracking,
      documents,
      mood,
      sleep,
      exercise,
    });
  });
}
