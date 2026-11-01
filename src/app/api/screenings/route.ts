import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';
import { gestationalAgeAt } from '@/lib/gestational';

/**
 * Wave 17 — «آزمایش‌ها و سونوگرافی‌های بارداری» (feature 6).
 * Read-only catalog from the reviewed seed; week filtering mirrors the
 * dashboard teaser. The program never outputs results or decisions —
 * it explains what each check is for and that the schedule belongs to
 * the clinician (§7.6).
 */
export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const url = new URL(req.url);
    const kind = url.searchParams.get('kind'); // ULTRASOUND | LAB_TEST | SCREENING | DIAGNOSTIC
    const weekParam = url.searchParams.get('week');
    const week = weekParam ? Math.min(Math.max(parseInt(weekParam, 10) || 0, 4), 40) : null;

    const [items, pregnancy] = await Promise.all([
      db.medicalScreeningCatalog.findMany({
        where: { status: 'PUBLISHED', ...(kind ? { kind } : {}) },
        orderBy: [{ kind: 'asc' }, { weeksFrom: 'asc' }],
      }),
      db.pregnancy.findFirst({
        where: { userId: user.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const currentWeek = pregnancy
      ? Math.min(Math.max(gestationalAgeAt({ dueDate: new Date(pregnancy.dueDate) }).weeks, 4), 40)
      : null;

    const mapped = items.map((i) => ({
      slug: i.slug,
      kind: i.kind,
      nameFa: i.nameFa,
      nameEn: i.nameEn,
      purposeFa: i.purposeFa,
      purposeEn: i.purposeEn,
      weeksFrom: i.weeksFrom,
      weeksTo: i.weeksTo,
      indication: i.indication,
      methodFa: i.methodFa,
      methodEn: i.methodEn,
      clinicianMayOrderFa: i.clinicianMayOrderFa,
      clinicianMayOrderEn: i.clinicianMayOrderEn,
      limitationsFa: i.limitationsFa,
      limitationsEn: i.limitationsEn,
      preparationFa: i.preparationFa,
      preparationEn: i.preparationEn,
      medicalReference: i.medicalReference,
      reviewedAt: i.reviewedAt,
      contentVersion: i.contentVersion,
      // Timing relevance flags (never a prescription — UI shows a check-with-
      // your-doctor sentence around them).
      inWindow: i.weeksFrom != null && i.weeksTo != null && currentWeek != null
        ? currentWeek >= i.weeksFrom && currentWeek <= i.weeksTo
        : null,
    }));

    return json({ items: mapped, currentWeek });
  });
}
