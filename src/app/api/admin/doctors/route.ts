import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser, logAdminAction } from '@/lib/api';
import { normalizeMobile, phoneEmail } from '@/lib/phone';
import { PLAN_FEATURES } from '@/lib/entitlements';

/**
 * Wave 11 — admin management of doctor accounts.
 *
 * GET    — list all doctor profiles (any status) with booking counts.
 * POST   — grant a doctor account by mobile number: create a new DOCTOR user
 *          (OTP-native) or PROMOTE an existing phone-matched user to DOCTOR,
 *          then upsert the DoctorProfile. The doctor signs in with OTP only.
 * PATCH  — update status (PENDING | APPROVED | SUSPENDED) or profile fields.
 *
 * Guards: ADMIN/SUPER_ADMIN via withUser allow-list. Every mutation is audited.
 */

export async function GET(req: Request) {
  return withUser(req, ['ADMIN'], async ({ user }) => {
    const doctors = await db.doctorProfile.findMany({
      include: {
        user: { select: { name: true, phone: true, email: true, deactivatedAt: true } },
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    await logAdminAction(user.id, 'DOCTOR_LIST', 'DoctorProfile', null, { count: doctors.length }, req);
    return json({
      doctors: doctors.map((d) => ({
        id: d.id,
        name: d.user.name,
        phone: d.user.phone,
        email: d.user.email,
        specialty: d.specialty,
        subSpecialty: d.subSpecialty,
        city: d.city,
        clinicName: d.clinicName,
        visitTypes: d.visitTypes,
        clinicFee: d.clinicFee,
        onlineFee: d.onlineFee,
        experienceYears: d.experienceYears,
        status: d.status,
        licenseNo: d.licenseNo,
        bio: d.bio,
        bookings: d._count.appointments,
        deactivated: d.user.deactivatedAt != null,
        createdAt: d.createdAt,
      })),
    });
  });
}

const createSchema = z.object({
  phone: z.string().min(4).max(24),
  name: z.string().min(2).max(80),
  specialty: z.string().min(2).max(80),
  subSpecialty: z.string().max(80).optional(),
  licenseNo: z.string().max(40).optional(),
  bio: z.string().max(1000).optional(),
  city: z.string().max(60).optional(),
  clinicName: z.string().max(120).optional(),
  clinicAddress: z.string().max(200).optional(),
  visitTypes: z.enum(['CLINIC', 'ONLINE', 'BOTH']).default('BOTH'),
  clinicFee: z.number().int().min(0).max(10_000_000_000).optional(),
  onlineFee: z.number().int().min(0).max(10_000_000_000).optional(),
  experienceYears: z.number().int().min(0).max(70).default(0),
  status: z.enum(['PENDING', 'APPROVED']).default('APPROVED'),
});

export async function POST(req: Request) {
  return withUser(req, ['ADMIN'], async ({ user }) => {
    const body = await readJson(req, createSchema);
    const phone = normalizeMobile(body.phone);
    if (!phone) return apiError(400, 'VALIDATION', 'شماره موبایل معتبر نیست | Invalid mobile number');

    // Create-or-promote: an existing phone-matched account becomes a doctor;
    // otherwise a fresh OTP-native DOCTOR user is created.
    let target = await db.user.findUnique({ where: { phone } });
    if (!target) {
      target = await db.user.create({
        data: {
          phone,
          email: phoneEmail(phone),
          name: body.name.trim(),
          role: 'DOCTOR',
          passwordHash: randomBytes(32).toString('hex'), // unusable — OTP-only sign-in
          consent: { create: { termsVersion: '1.0', privacyVersion: '1.0', dataProcessing: true } },
          entitlement: { create: { plan: 'FREE', features: JSON.stringify(PLAN_FEATURES.FREE) } },
        },
      });
    } else {
      // Preserve the highest-privilege role: never demote staff accounts.
      if (target.role === 'USER') {
        target = await db.user.update({ where: { id: target.id }, data: { role: 'DOCTOR' } });
      }
      if (target.name.trim().length < 2) {
        target = await db.user.update({ where: { id: target.id }, data: { name: body.name.trim() } });
      }
    }

    const profile = await db.doctorProfile.upsert({
      where: { userId: target.id },
      update: {
        specialty: body.specialty,
        subSpecialty: body.subSpecialty,
        licenseNo: body.licenseNo,
        bio: body.bio,
        city: body.city,
        clinicName: body.clinicName,
        clinicAddress: body.clinicAddress,
        visitTypes: body.visitTypes,
        clinicFee: body.clinicFee,
        onlineFee: body.onlineFee,
        experienceYears: body.experienceYears,
        status: body.status,
      },
      create: {
        userId: target.id,
        specialty: body.specialty,
        subSpecialty: body.subSpecialty,
        licenseNo: body.licenseNo,
        bio: body.bio,
        city: body.city,
        clinicName: body.clinicName,
        clinicAddress: body.clinicAddress,
        visitTypes: body.visitTypes,
        clinicFee: body.clinicFee,
        onlineFee: body.onlineFee,
        experienceYears: body.experienceYears,
        status: body.status,
      },
    });

    // Default weekly template so the doctor is bookable immediately (Sun–Thu, 9–13).
    const existingAvail = await db.availability.count({ where: { doctorId: profile.id } });
    if (existingAvail === 0) {
      await db.availability.createMany({
        data: [0, 1, 2, 3, 4].map((weekday) => ({ doctorId: profile.id, weekday, startMin: 9 * 60, endMin: 13 * 60, slotMin: 20 })),
      });
    }

    await db.notification.create({
      data: {
        userId: target.id,
        title: 'حساب پزشکی شما فعال شد',
        body: 'پروفایل شما در نیوا ثبت شد. برای ورود، کد یک‌بارمصرف شماره موبایل خود را درخواست کنید.',
        type: 'SYSTEM',
      },
    });
    await logAdminAction(user.id, 'DOCTOR_GRANT', 'DoctorProfile', profile.id, { phone, status: body.status }, req);
    return json({ id: profile.id, userId: target.id }, 201);
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']).optional(),
  visitTypes: z.enum(['CLINIC', 'ONLINE', 'BOTH']).optional(),
  clinicFee: z.number().int().min(0).max(10_000_000_000).nullable().optional(),
  onlineFee: z.number().int().min(0).max(10_000_000_000).nullable().optional(),
});

export async function PATCH(req: Request) {
  return withUser(req, ['ADMIN'], async ({ user }) => {
    const body = await readJson(req, patchSchema);
    const profile = await db.doctorProfile.findUnique({ where: { id: body.id } });
    if (!profile) return apiError(404, 'NOT_FOUND', 'Doctor profile not found');

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.visitTypes !== undefined) data.visitTypes = body.visitTypes;
    if (body.clinicFee !== undefined) data.clinicFee = body.clinicFee;
    if (body.onlineFee !== undefined) data.onlineFee = body.onlineFee;
    const updated = await db.doctorProfile.update({ where: { id: profile.id }, data });

    if (body.status === 'APPROVED') {
      await db.notification.create({
        data: { userId: profile.userId, title: 'پروفایل شما تأیید شد', body: 'نمایه شما در فهرست پزشکان نیوا برای بیماران قابل مشاهده است.', type: 'SYSTEM' },
      });
    }
    await logAdminAction(user.id, 'DOCTOR_UPDATE', 'DoctorProfile', profile.id, body, req);
    return json({ ok: true, status: updated.status });
  });
}
