import { db } from '@/lib/db';
import { json, apiError, withUser } from '@/lib/api';

/**
 * Wave 11 — doctor detail with computed open slots for the next 14 days.
 * Slots are derived from the weekly Availability template minus
 * already-requested/confirmed DoctorAppointments and past times.
 * Dates are anchored to server-local days; the client groups by ITS locale
 * date for display (slot instants are absolute UTC Date values end-to-end).
 */

const DAYS_AHEAD = 14;
const ACTIVE_STATUSES = ['REQUESTED', 'CONFIRMED'] as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, [], async () => {
    const doctor = await db.doctorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        availabilities: { where: { active: true }, orderBy: [{ weekday: 'asc' }, { startMin: 'asc' }] },
      },
    });
    if (!doctor || doctor.status !== 'APPROVED') {
      return apiError(404, 'NOT_FOUND', 'Doctor not found');
    }

    const from = new Date();
    const to = new Date(from.getTime() + DAYS_AHEAD * 86_400_000);
    const booked = await db.doctorAppointment.findMany({
      where: { doctorId: id, status: { in: ACTIVE_STATUSES }, scheduledAt: { gte: from, lte: to } },
      select: { scheduledAt: true },
    });
    const taken = new Set(booked.map((b) => Math.floor(b.scheduledAt.getTime() / 60_000)));

    const nowMs = Date.now();
    const leadMs = 60 * 60_000; // 1h booking lead time
    const days: { date: string; weekday: number; slots: { startsAt: string; durationMin: number }[] }[] = [];

    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
      const weekday = day.getDay();
      const windows = doctor.availabilities.filter((a) => a.weekday === weekday && a.active);
      if (windows.length === 0) continue;
      const slots: { startsAt: string; durationMin: number }[] = [];
      for (const w of windows) {
        for (let m = w.startMin; m + w.slotMin <= w.endMin; m += w.slotMin) {
          const h = Math.floor(m / 60);
          const min = m % 60;
          const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, min);
          if (start.getTime() < nowMs + leadMs) continue;
          if (taken.has(Math.floor(start.getTime() / 60_000))) continue;
          slots.push({ startsAt: start.toISOString(), durationMin: w.slotMin });
        }
      }
      if (slots.length > 0) {
        days.push({ date: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`, weekday, slots });
      }
    }

    return json({
      doctor: {
        id: doctor.id,
        name: doctor.user.name,
        specialty: doctor.specialty,
        subSpecialty: doctor.subSpecialty,
        bio: doctor.bio,
        city: doctor.city,
        clinicName: doctor.clinicName,
        clinicAddress: doctor.clinicAddress,
        visitTypes: doctor.visitTypes,
        clinicFee: doctor.clinicFee,
        onlineFee: doctor.onlineFee,
        experienceYears: doctor.experienceYears,
        ratingAvg: doctor.ratingAvg,
      },
      days,
    });
  });
}
