import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, assertSameOrigin } from '@/lib/api';
import { createSession, hashPassword, hashEmail } from '@/lib/auth';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { PLAN_FEATURES } from '@/lib/entitlements';

/** Minimum age for an independent account (Wave 6.4 age gate).
 * COPPA sets 13 as the US floor; GDPR-K allows member states to require up to
 * 16 — production must gate per deployed jurisdiction (docs/audit/07-privacy-pack.md). */
const MIN_AGE = 13;

const schema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
  /** Privacy-minimal: self-declared YEAR only — never the full date of birth. */
  birthYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear()),
  acceptedTerms: z.literal(true),
  locale: z.enum(['fa', 'en']).default('fa'),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  if (!rateLimit(clientKey(req, 'register'), 5, 60_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many attempts');
  }
  try {
    const body = await readJson(req, schema);

    // Age gate — computed from the declared year only (privacy-minimal; see
    // docs/audit/07-privacy-pack.md §Age gating). Year-only arithmetic may
    // admit a child who turns MIN_AGE later in the current year; that bias is
    // accepted deliberately rather than collecting day+month.
    const age = new Date().getFullYear() - body.birthYear;
    if (age < MIN_AGE) {
      // Hard block, explicit by design (no account is created, so there is no
      // user-enumeration concern to mask). Bilingual fa+en message.
      return apiError(
        403,
        'AGE_BLOCKED',
        'نیوا فقط برای کاربران ۱۳ سال و بالاتر در دسترس است | NIVA is only available to users aged 13 and over'
      );
    }

    const email = body.email.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return apiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');

    const user = await db.user.create({
      data: {
        email,
        name: body.name.trim(),
        passwordHash: hashPassword(body.password),
        locale: body.locale,
        consent: {
          create: {
            termsVersion: '1.0',
            privacyVersion: '1.0',
            dataProcessing: true,
            birthYear: body.birthYear,
            ageConfirmedAt: new Date(),
          },
        },
        entitlement: { create: { plan: 'FREE', features: JSON.stringify(PLAN_FEATURES.FREE) } },
      },
    });
    const session = await createSession(user.id);
    await logAudit(user.id, 'USER_REGISTER', 'User', user.id, { emailHash: hashEmail(email) }, req.headers.get('x-forwarded-for'));
    return json({ id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale, token: session.token }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(400, 'VALIDATION', err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    }
    console.error('[auth/register]', err);
    return apiError(500, 'INTERNAL', 'Registration failed');
  }
}
