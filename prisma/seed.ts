 
/**
 * NIVA seed (sandbox). Run: bun prisma/seed.ts
 * Creates governance-demo accounts, bilingual educational content (status IN_REVIEW —
 * NO clinical approval is claimed), demonstration 3D asset registry entries, plan
 * catalog and a pre-filled demo pregnancy.
 */
import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'crypto';
import { MEDICAL_KNOWLEDGE } from '../src/data/medical-knowledge';
import { WEEKLY_CONTENT } from '../src/data/weekly-content';

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}

const STAGES = [4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40];

const STAGE_INFO: Record<number, { en: string; fa: string; structures: string[] }> = {
  4: { en: 'A flat embryonic disc, roughly 1 mm, beginning to layer into the structures that will become the nervous system, heart and gut.', fa: 'صفحه جنینی تخت، تقریباً یک میلی‌متر، که لایه‌های اولیه سیستم عصبی، قلب و گوارش از آن شکل می‌گیرد.', structures: ['embryonic_disc', 'amniotic_cavity', 'yolk_sac'] },
  6: { en: 'A curled embryo with a visible neural tube and the earliest heart pulsing motion. Limb buds have not yet appeared.', fa: 'جنین خمیده با لوله عصبی قابل مشاهده و نخستین ضربان قلب. جوانه اندام‌ها هنوز ظاهر نشده است.', structures: ['neural_tube', 'heart_tube', 'somites'] },
  8: { en: 'Upper and lower limb buds appear; the head is large relative to the body. External ears begin to form.', fa: 'جوانه دست و پا ظاهر می‌شود؛ سر نسبت به بدن بزرگ است. شکل‌گیری گوش خارجی آغاز شده است.', structures: ['limb_buds', 'head', 'umbilical_cord'] },
  10: { en: 'Fingers and toes are separating; eyelids are forming. Major organs are present and continuing to mature.', fa: 'انگشتان دست و پا در حال جدا شدن است؛ پلک‌ها در حال شکل‌گیری‌اند. اندام‌های اصلی حاضرند و به بلوغ می‌رسند.', structures: ['fingers', 'eyelids', 'liver', 'kidneys'] },
  12: { en: 'Human proportions begin to emerge; the head is about half the body length. The placenta is becoming the main support organ.', fa: 'تناسب‌های انسانی شکل می‌گیرد؛ سر تقریباً نیمی از طول بدن است. جفت در حال تبدیل شدن به اندام اصلی پشتیبانی است.', structures: ['placenta', 'umbilical_cord', 'brain', 'heart'] },
  16: { en: 'Movements become coordinated; the skeleton hardens from cartilage. Scalp pattern is set.', fa: 'حرکات هماهنگ می‌شوند؛ اسکلت از غضروف سخت می‌شود. الگوی پوست سر تعیین می‌شود.', structures: ['skeleton', 'muscles', 'skin'] },
  20: { en: 'The anatomy-scan midpoint. Vernix caseosa coats the skin; hearing is developing.', fa: 'نقطه میانی سونوگرافی آناتومی. پوست با ماده ورنیکس پوشیده شده؛ شنوایی در حال رشد است.', structures: ['vernix', 'inner_ear', 'heart_chambers'] },
  24: { en: 'Lungs begin producing surfactant; rapid eye movements start. Survival outside the womb becomes medically possible with intensive care.', fa: 'ری‌ها سورفکتانت تولید می‌کنند؛ حرکات سریع چشم آغاز می‌شود. بقا خارج از رحم با مراقبت ویژه از نظر پزشکی ممکن می‌شود.', structures: ['lungs', 'surfactant', 'eyes'] },
  28: { en: 'Third trimester begins. Brain grooves deepen; the fetus opens eyes and may respond to sound.', fa: 'سه‌ماهه سوم آغاز می‌شود. چین‌های مغزی عمیق‌تر می‌شوند؛ جنین چشم باز می‌کند و به صدا پاسخ می‌دهد.', structures: ['brain_folds', 'bones_marrow', 'lungs'] },
  32: { en: 'Rapid weight gain; bones fully harden except the skull plates. Most fetuses turn head-down around this time.', fa: 'افزایش سریع وزن؛ استخوان‌ها به‌جز صفحات جمجمه سخت می‌شوند. بیشتر جنین‌ها در این زمان سر به پایین می‌چرخند.', structures: ['skull_sutures', 'fat_layer', 'lungs'] },
  36: { en: 'Lanugo is shedding; the fetus practices breathing movements and sucking. Early term is approaching.', fa: 'کرک بدن می‌ریزد؛ جنین حرکات تنفسی و مکیدن را تمرین می‌کند. زایمان زودرس کامل نزدیک می‌شود.', structures: ['lungs_mature', 'suck reflex', 'fat_layer'] },
  40: { en: 'Full term. The chest is prominent and the lungs are prepared for air breathing at birth.', fa: 'پرترم کامل. قفسه سینه برجسته است و ری‌ها برای تنفس هوا هنگام تولد آماده‌اند.', structures: ['full_term_body', 'mature_lungs', 'placenta'] },
};

async function main() {
  console.log('Seeding NIVA…');

  // ── Accounts ──────────────────────────────────────────────────────────────
  const users = [
    { email: 'admin@niva.health', name: 'Platform Admin', role: 'ADMIN', pw: 'NivaAdmin!2025' },
    { email: 'reviewer@niva.health', name: 'Dr. S. Reviewer', role: 'CLINICAL_REVIEWER', pw: 'NivaReview!2025' },
    { email: 'demo@niva.health', name: 'Demo User', role: 'USER', pw: 'NivaDemo!2025' },
  ];
  const ids: Record<string, string> = {};
  for (const u of users) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { email: u.email, name: u.name, role: u.role, passwordHash: hashPassword(u.pw), locale: 'fa' },
    });
    ids[u.role] = user.id;
    await db.entitlement.upsert({
      where: { userId: user.id },
      update: { plan: u.role === 'USER' ? 'PREMIUM_MONTHLY' : 'FREE' },
      create: { userId: user.id, plan: u.role === 'USER' ? 'PREMIUM_MONTHLY' : 'FREE' },
    });
    if (u.role === 'USER') {
      await db.subscription.upsert({
        where: { id: `seed-subs-${user.id}` },
        update: {},
        create: {
          id: `seed-subs-${user.id}`,
          userId: user.id,
          plan: 'PREMIUM_MONTHLY',
          status: 'ACTIVE',
          provider: 'SANDBOX',
          currentPeriodEnd: daysFromNow(21),
        },
      });
    }
    await db.consent.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, termsVersion: '1.0', privacyVersion: '1.0', familySharingAck: true },
    });
  }

  // ── Educational content (status IN_REVIEW — honest governance) ───────────
  for (const e of MEDICAL_KNOWLEDGE) {
    const slug = `kb-${e.id}`;
    await db.educationalContent.upsert({
      where: { slug },
      update: { status: 'IN_REVIEW' },
      create: {
        slug,
        category: e.category.toUpperCase(),
        titleEn: e.titleEn,
        titleFa: e.titleFa,
        bodyEn: e.bodyEn,
        bodyFa: e.bodyFa,
        sources: JSON.stringify([{ citation: e.citation, url: e.sourceUrl, year: e.year }]),
        status: 'IN_REVIEW',
      },
    });
  }
  for (const w of WEEKLY_CONTENT) {
    const slug = `week-${w.week}`;
    const body = `${w.highlightsEn} ${w.maternalTipsEn}`;
    const bodyFa = `${w.highlightsFa} ${w.maternalTipsFa}`;
    await db.educationalContent.upsert({
      where: { slug },
      update: { status: 'IN_REVIEW' },
      create: {
        slug,
        week: w.week,
        trimester: w.week < 14 ? 1 : w.week < 28 ? 2 : 3,
        category: 'WEEKLY',
        titleEn: `Week ${w.week}`,
        titleFa: `هفته ${w.week}`,
        bodyEn: body,
        bodyFa: bodyFa,
        sources: JSON.stringify([{ citation: 'WHO Antenatal Care Recommendations (2016); ACOG patient education', year: 2016 }]),
        status: 'IN_REVIEW',
      },
    });
  }

  // ── 3D asset registry (DEMONSTRATION — never claimed as validated) ───────
  for (const stage of STAGES) {
    const info = STAGE_INFO[stage];
    await db.anatomicalAsset.upsert({
      where: { assetId: `NIVA-FET-W${String(stage).padStart(2, '0')}` },
      update: {},
      create: {
        assetId: `NIVA-FET-W${String(stage).padStart(2, '0')}`,
        gestationalStage: stage,
        titleEn: `Stage model — gestational week ${stage}`,
        titleFa: `مدل مرحله‌ای — هفته ${stage} بارداری`,
        descriptionEn: info.en,
        descriptionFa: info.fa,
        structures: JSON.stringify(info.structures),
        scientificSources: JSON.stringify([
          'WHO Antenatal Care Recommendations (2016)',
          'Standard human embryology references (educational schematic)',
        ]),
        reviewerName: null,
        reviewStatus: 'DEMONSTRATION',
        modelVersion: '1.0.0',
        animationMetadata: JSON.stringify({ type: 'parametric-schematic', autoRotate: true, guidedNarration: true }),
        performanceProfile: JSON.stringify({ lodTiers: 3, maxVertsMobile: 45000, targetFps: 30 }),
        publicationStatus: 'PUBLISHED',
      },
    });
  }

  // ── Scientific sources ────────────────────────────────────────────────────
  const sources = [
    { citation: 'WHO Recommendations on Antenatal Care for a Positive Pregnancy Experience', org: 'World Health Organization', year: 2016, url: 'https://www.who.int/publications/i/item/9789241549912' },
    { citation: 'ACOG Patient Education resources on nutrition, exercise and warning signs', org: 'American College of Obstetricians and Gynecologists', year: 2023, url: 'https://www.acog.org/womens-health' },
    { citation: 'CDC Pregnancy information', org: 'Centers for Disease Control and Prevention', year: 2024, url: 'https://www.cdc.gov/pregnancy' },
    { citation: 'NHS Pregnancy week-by-week', org: 'National Health Service (UK)', year: 2024, url: 'https://www.nhs.uk/pregnancy' },
  ];
  for (const s of sources) {
    const existing = await db.scientificSource.findFirst({ where: { citation: s.citation } });
    if (!existing) await db.scientificSource.create({ data: s });
  }

  // ── Settings / feature flags / plan catalog ──────────────────────────────
  await db.setting.upsert({
    where: { key: 'featureFlags' },
    update: { value: JSON.stringify({ community: true, family: true, studio: true, ar: true }) },
    create: { key: 'featureFlags', value: JSON.stringify({ community: true, family: true, studio: true, ar: true }) },
  });
  await db.setting.upsert({
    where: { key: 'planCatalog' },
    update: {},
    create: { key: 'planCatalog', value: JSON.stringify({ currency: 'IRR', provider: 'SANDBOX' }) },
  });

  // ── Demo pregnancy + sample data ─────────────────────────────────────────
  const demoId = ids.USER;
  const existingPreg = await db.pregnancy.findFirst({ where: { userId: demoId } });
  if (!existingPreg) {
    const lmp = daysAgo(147); // ≈ week 21
    const due = new Date(lmp.getTime() + 280 * 86_400_000);
    const preg = await db.pregnancy.create({
      data: {
        userId: demoId,
        label: 'بارداری من',
        lmpDate: lmp,
        dueDate: due,
        datingMethod: 'LMP',
        datingConfidence: 'MEDIUM',
        plurality: 'SINGLETON',
        status: 'ACTIVE',
      },
    });
    await db.gestationalDating.create({
      data: {
        pregnancyId: preg.id,
        method: 'LMP',
        referenceDate: lmp,
        dueDate: due,
        confidence: 'MEDIUM',
        source: 'SELF',
        note: 'Seeded demo dating (LMP, Naegele)',
      },
    });
    await db.pregnancyEvent.create({
      data: { pregnancyId: preg.id, type: 'MILESTONE', title: 'اولین سونوگرافی', date: daysAgo(100) },
    });
    await db.symptomEntry.create({
      data: { userId: demoId, date: daysAgo(1), week: 21, energy: 3, nausea: 1, sleep: 3, mood: 4, weightKg: 64.2, symptoms: JSON.stringify(['heartburn']) },
    });
    await db.symptomEntry.create({
      data: { userId: demoId, date: daysAgo(3), week: 20, energy: 4, nausea: 0, sleep: 4, mood: 4, weightKg: 63.8, symptoms: '[]' },
    });
    await db.appointment.create({
      data: { userId: demoId, title: 'سونوگرافی آناتومی', type: 'ULTRASOUND', provider: 'دکتر مریم راد', location: 'مرکز تصویربرداری آرامیس', scheduledAt: daysFromNow(4) },
    });
    await db.reminder.create({
      data: { userId: demoId, title: 'قرص اسید فولیک', type: 'SUPPLEMENT', dueAt: daysFromNow(0.3), repeat: 'DAILY' },
    });
    await db.reminder.create({
      data: { userId: demoId, title: 'شمارش حرکت جنین', type: 'CUSTOM', dueAt: daysFromNow(1), repeat: 'DAILY' },
    });
    await db.journalEntry.create({
      data: { userId: demoId, title: 'اولین حرکات', body: 'امروز برای اولین بار حرکت جنین را واضح حس کردم؛ حس فوق‌العاده‌ای بود.', mood: 'GREAT' },
    });
    await db.communityPost.create({
      data: { userId: demoId, authorAlias: 'مامان‌آرام', topic: 'NUTRITION', body: 'برای مدیریت تهوع صبحگاهی چه تجربه‌های کاربردی دارید؟ (تجربه شخصی، نه توصیه پزشکی)', language: 'fa', status: 'APPROVED' },
    });
    await db.aIConversation.create({
      data: {
        userId: demoId,
        title: 'تغذیه در سه‌ماهه دوم',
        language: 'fa',
        messages: {
          create: [
            { role: 'USER', content: 'در سه‌ماهه دوم چه تغذیه‌ای کمک می‌کند؟' },
            { role: 'ASSISTANT', content: 'در سه‌ماهه دوم، پروتئین کافی، آهن، کلسیم و اسید فولیک اهمیت ویژه‌ای دارند. منابع حاوی آهن مثل حبوبات و گوشت کم‌چرب، همراه با ویتامین C جذب را بهتر می‌کند. [محتوای آموزشی — نیوا جایگزین مشورت با پزشک نیست.]', citations: JSON.stringify([{ title: 'Iron & anemia', citation: 'WHO Antenatal Care Recommendations (2016)' }]), safetyLevel: 'NORMAL' },
          ],
        },
      },
    });
    await db.notification.create({
      data: { userId: demoId, title: 'به نیوا خوش آمدید', body: 'پروفایل بارداری نمونه شما آماده است. می‌توانید از داشبورد شروع کنید.', type: 'SYSTEM' },
    });
  }

  // ── Clinical review queue entries ────────────────────────────────────────
  const pending = await db.educationalContent.count({ where: { status: 'IN_REVIEW' } });
  console.log(`Review queue: ${pending} content items pending clinical review (honest governance state).`);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
