import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, assertSameOrigin } from '@/lib/api';
import { createSession, hashEmail } from '@/lib/auth';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { normalizeMobile, phoneEmail } from '@/lib/phone';
import { PLAN_FEATURES } from '@/lib/entitlements';

/**
 * Wave 11 — step 2 of OTP sign-in: verify the 6-digit code, find-or-create the
 * user and open a session. This is the ONLY consumer sign-in path exposed in
 * the UI (OTP-first per product decision); email/password remains a hidden
 * legacy route for pre-existing accounts.
 *
 * Abuse envelope: verify attempts are capped per code (5), codes are single-use
 * and 5-minute expiring; verification is rate-limited per phone (10/10min).
 */

const MAX_ATTEMPTS = 5;

const schema = z.object({
  phone: z.string().min(4).max(24),
  code: z.string().min(4).max(8),
  locale: z.enum(['fa', 'en']).default('fa'),
});

function hashCode(phone: string, code: string): string {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  if (!rateLimit(clientKey(req, 'otp-ver-ip'), 20, 600_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many attempts. Try again later.');
  }
  try {
    const body = await readJson(req, schema);
    const phone = normalizeMobile(body.phone);
    if (!phone) return apiError(400, 'VALIDATION', 'Invalid mobile number');
    if (!rateLimit(`otp-ver:${phone}`, 10, 600_000)) {
      return apiError(429, 'RATE_LIMIT', 'تلاش‌های زیاد برای این شماره. کمی بعد تلاش کنید.');
    }

    const record = await db.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return apiError(400, 'OTP_EXPIRED', 'کد منقضی شده است. دوباره درخواست کد بدهید.');

    if (record.attempts >= MAX_ATTEMPTS) {
      await db.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
      return apiError(429, 'OTP_LOCKED', 'تلاش‌های ناموفق زیاد بود. کد جدید درخواست کنید.');
    }

    if (hashCode(phone, body.code.trim()) !== record.codeHash) {
      await db.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      return apiError(400, 'OTP_INVALID', 'کد وارد شده صحیح نیست.');
    }

    // Single-use consumption FIRST (atomic guard), then find-or-create user.
    await db.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });

    let user = await db.user.findUnique({ where: { phone } });
    let isNew = false;
    if (!user) {
      user = await db.user.create({
        data: {
          phone,
          // Legacy schema requires a unique email — OTP-native accounts get a
          // synthetic address; the real contact identity is the phone number.
          email: phoneEmail(phone),
          name: 'کاربر نیوا',
          passwordHash: randomBytes(32).toString('hex'), // unusable by design
          role: 'USER',
          locale: body.locale,
          consent: { create: { termsVersion: '1.0', privacyVersion: '1.0', dataProcessing: true } },
          entitlement: { create: { plan: 'FREE', features: JSON.stringify(PLAN_FEATURES.FREE) } },
        },
      });
      isNew = true;
    }
    if (user.deactivatedAt != null) {
      return apiError(403, 'ACCOUNT_DISABLED', 'این حساب غیرفعال شده است | This account has been deactivated');
    }

    const session = await createSession(user.id);
    await logAudit(
      user.id,
      isNew ? 'USER_REGISTER_OTP' : 'USER_LOGIN_OTP',
      'User',
      user.id,
      { phone },
      req.headers.get('x-forwarded-for')
    );
    return json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      locale: user.locale,
      isNew,
      token: session.token,
      emailHash: hashEmail(user.email),
    });
  } catch (err) {
    if (err instanceof z.ZodError) return apiError(400, 'VALIDATION', 'Invalid payload');
    console.error('[auth/otp/verify]', err);
    return apiError(500, 'INTERNAL', 'OTP verification failed');
  }
}
