import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';
import { getEntitlementFeatures } from '@/lib/entitlements';
import { logAudit } from '@/lib/audit';

/** GDPR-style data portability. Full user-owned export; gated by plan entitlement. */
export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const { features } = await getEntitlementFeatures(user.id);
    if (!features.dataExport) {
      return json({ entitled: false }, 402);
    }
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
