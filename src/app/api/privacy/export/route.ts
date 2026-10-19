import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/** GDPR-style data portability. Full user-owned export — FREE for every
 * account: portability of one's own data is a legal right, never a paid
 * feature (risk R-06 remediation). Rate limiting arrives with the shared
 * middleware hardening (Phase 9). */
export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const [pregnancies, symptoms, journal, appointments, reminders, docs, conversations, consents] =
      await Promise.all([
        db.pregnancy.findMany({ where: { userId: user.id }, include: { events: true, datings: true } }),
        db.symptomEntry.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' } }),
        db.journalEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
        db.appointment.findMany({ where: { userId: user.id } }),
        db.reminder.findMany({ where: { userId: user.id } }),
        db.medicalDocument.findMany({ where: { userId: user.id } }),
        db.aIConversation.findMany({ where: { userId: user.id }, include: { messages: true } }),
        db.consent.findUnique({ where: { userId: user.id } }),
      ]);
    await logAudit(user.id, 'DATA_EXPORT', 'User', user.id, null, req.headers.get('x-forwarded-for'));
    return json({
      exportedAt: new Date().toISOString(),
      format: 'NIVA export v1 (JSON)',
      account: { email: user.email, name: user.name, locale: user.locale, createdAt: user.createdAt },
      consent: consents,
      pregnancies,
      symptomEntries: symptoms,
      journalEntries: journal,
      appointments,
      reminders,
      medicalDocuments: docs,
      aiConversations: conversations,
    });
  });
}
