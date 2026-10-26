import { createHash, randomInt } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, assertSameOrigin } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { normalizeMobile, toSmsIrMobile } from '@/lib/phone';
import { sendOtpSms, smsConfigured } from '@/lib/sms';

/**
 * Wave 11 — step 1 of OTP sign-in: issue a 6-digit code and deliver it via
 * sms.ir verify template. Codes are hashed at rest, valid 5 minutes, single-use
 * at verify time. Issue is rate-limited per phone (3/10min) and per IP
 * (10/10min) to blunt SMS-pumping abuse.
 */

const OTP_TTL_MS = 5 * 60_000;

const schema = z.object({
  phone: z.string().min(4).max(24),
  locale: z.enum(['fa', 'en']).default('fa'),
});

function hashCode(phone: string, code: string): string {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  if (!rateLimit(clientKey(req, 'otp-req-ip'), 10, 600_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many requests. Try again later.');
  }
  try {
    const body = await readJson(req, schema);
    const phone = normalizeMobile(body.phone);
    if (!phone) return apiError(400, 'VALIDATION', 'شماره موبایل معتبر نیست | Invalid mobile number');
    if (!rateLimit(`otp-req:${phone}`, 3, 600_000)) {
      return apiError(429, 'RATE_LIMIT', 'برای این شماره درخواست‌های زیاد ثبت شده. کمی بعد تلاش کنید.');
    }

    // Deactivated accounts must not receive codes (fail closed, no enumeration).
    const existing = await db.user.findUnique({ where: { phone } });
    if (existing?.deactivatedAt != null) {
      return apiError(403, 'ACCOUNT_DISABLED', 'این حساب غیرفعال شده است | This account has been deactivated');
    }

    const code = String(randomInt(100_000, 1_000_000));
    await db.otpCode.create({
      data: {
        phone,
        codeHash: hashCode(phone, code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    const sms = await sendOtpSms(toSmsIrMobile(phone), code);
    if (!sms.sent && sms.provider === 'sms.ir') {
      return apiError(502, 'SMS_FAILED', 'ارسال پیامک ناموفق بود. چند لحظه بعد تلاش کنید.');
    }

    return json({
      ok: true,
      phone,
      // devCode only when no provider credentials exist (sandbox/preview QA).
      devCode: sms.devCode,
      devMode: !smsConfigured(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) return apiError(400, 'VALIDATION', 'Invalid payload');
    console.error('[auth/otp/request]', err);
    return apiError(500, 'INTERNAL', 'OTP request failed');
  }
}
