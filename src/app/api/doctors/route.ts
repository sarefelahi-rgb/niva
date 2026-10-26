import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

/**
 * Wave 11 — public doctor directory (authenticated patients + staff).
 * Only APPROVED doctors are listed. Sorting: rating desc, then name.
 */

export async function GET(req: Request) {
  return withUser(req, [], async () => {
    const doctors = await db.doctorProfile.findMany({
      where: { status: 'APPROVED' },
      include: {
        user: { select: { name: true } },
        availabilities: { where: { active: true } },
        _count: { select: { appointments: { where: { status: { in: ['REQUESTED', 'CONFIRMED'] } } } } },
      },
      orderBy: [{ ratingAvg: 'desc' }, { createdAt: 'asc' }],
    });
    return json({
      doctors: doctors.map((d) => ({
        id: d.id,
        name: d.user.name,
        specialty: d.specialty,
        subSpecialty: d.subSpecialty,
        bio: d.bio,
        city: d.city,
        clinicName: d.clinicName,
        clinicAddress: d.clinicAddress,
        visitTypes: d.visitTypes,
        clinicFee: d.clinicFee,
        onlineFee: d.onlineFee,
        experienceYears: d.experienceYears,
        ratingAvg: d.ratingAvg,
        openWeek: d.availabilities.some((a) => a.active),
        activeBookings: d._count.appointments,
      })),
    });
  });
}
