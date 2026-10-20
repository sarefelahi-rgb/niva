import { z } from 'zod';
import { db } from '@/lib/db';
import { json, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/**
 * Notification channel preferences (withUser, any role).
 * - GET  → current email-reminders consent + whether an email transport exists.
 * - PUT  → upsert Consent.emailReminders (audited). Honest gating: turning the
 *   consent on only schedules EMAIL rows once SMTP_URL is configured server-side.
 */

function payload(emailReminders: boolean) {
  return {
    emailReminders,
    emailTransportConfigured: Boolean(process.env.SMTP_URL && process.env.SMTP_URL.trim() !== ''),
  };
}

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const consent = await db.consent.findUnique({
      where: { userId: user.id },
      select: { emailReminders: true },
    });
    return json(payload(Boolean(consent?.emailReminders)));
  });
}

export async function PUT(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, z.object({ emailReminders: z.boolean() }));
    const consent = await db.consent.upsert({
      where: { userId: user.id },
      update: { emailReminders: body.emailReminders },
      create: { userId: user.id, emailReminders: body.emailReminders },
    });
    await logAudit(
      user.id,
      'consent.emailReminders',
      'Consent',
      consent.id,
      { emailReminders: body.emailReminders },
      req.headers.get('x-forwarded-for')
    );
    return json(payload(consent.emailReminders));
  });
}
