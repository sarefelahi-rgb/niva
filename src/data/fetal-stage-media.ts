/**
 * NIVA Fetal-Growth Studio — natural stage imagery manifest.
 *
 * The studio presents a single continuous, photorealistic growth sequence:
 * 13 curated medical-visualization renders (weeks 3 → 40) generated in one
 * consistent style (fixed camera, lighting and uterine palette) so that
 * stepping through the weeks reads like one pregnancy unfolding, not a set
 * of disconnected pictures. Weeks between keyframes display the latest
 * completed stage — the same convention obstetric references use.
 *
 * This replaces the previous procedural metaball mesh: the honest way to show
 * "natural" development on the web is accurate stage imagery, and the
 * narration/annotation layer keeps the educational framing.
 */

export interface FetalStageImage {
  /** Gestational week this keyframe represents. */
  week: number;
  /** Static asset under /images/fetal (public/, served as-is). */
  src: string;
  altEn: string;
  altFa: string;
}

export const FETAL_STAGE_IMAGES: FetalStageImage[] = [
  {
    week: 3,
    src: '/images/fetal/w03.png',
    altEn: 'A human blastocyst implanting into the uterine lining — a glowing cluster of dividing cells.',
    altFa: 'بلاستوسیست انسانی در حال لانه‌گزینی در دیواره رحم — خوشه‌ای درخشان از سلول‌های در حال تقسیم.',
  },
  {
    week: 4,
    src: '/images/fetal/w04.png',
    altEn: 'A four-week gestational sac with its round yolk sac, shown beside a grain of rice for scale.',
    altFa: 'کیسه بارداری هفته چهارم همراه با کیسه زرده، در کنار یک دانه برنج برای مقایسه اندازه.',
  },
  {
    week: 6,
    src: '/images/fetal/w06.png',
    altEn: 'A week-six embryo in a natural C-curve, with heart bulge, tiny limb buds and a visible tail.',
    altFa: 'رویان هفته ششم در انحنای طبیعی C، با برجستگی قلب، جوانه اندام‌ها و دم قابل مشاهده.',
  },
  {
    week: 8,
    src: '/images/fetal/w08.png',
    altEn: 'An eight-week embryo with a large forehead and webbed hands, umbilical cord in place.',
    altFa: 'رویان هفته هشتم با پیشانی بزرگ و دست‌های پرده‌دار، بند ناف در جای خود.',
  },
  {
    week: 10,
    src: '/images/fetal/w10.png',
    altEn: 'A ten-week fetus with separated fingers and toes and a clear facial profile.',
    altFa: 'جنین هفته دهم با انگشتان جداشده دست و پا و نمای چهره‌ای مشخص.',
  },
  {
    week: 12,
    src: '/images/fetal/w12.png',
    altEn: 'A twelve-week fetus, fully formed profile with closed eyes, cord and placenta nearby.',
    altFa: 'جنین هفته دوازدهم با چهره کاملاً شکل‌گرفته و چشمان بسته، بند ناف و جفت در نزدیکی.',
  },
  {
    week: 16,
    src: '/images/fetal/w16.png',
    altEn: 'A sixteen-week fetus with thin limbs, translucent skin and forming eyebrows.',
    altFa: 'جنین هفته شانزدهم با اندام‌های ظریف، پوست نیمه‌شفاف و ابروهای در حال شکل‌گیری.',
  },
  {
    week: 20,
    src: '/images/fetal/w20.png',
    altEn: 'A twenty-week fetus with fine lanugo hair, sucking its thumb in a curled pose.',
    altFa: 'جنین هفته بیستم با موهای نازک لانوگو، در حال مکیدن شست در حالت جمع‌شده.',
  },
  {
    week: 24,
    src: '/images/fetal/w24.png',
    altEn: 'A twenty-four-week fetus with wrinkled translucent skin and fused closed eyelids.',
    altFa: 'جنین هفته بیست‌وچهارم با پوست چروک و نیمه‌شفاف و پلک‌های به‌هم‌چسبیده.',
  },
  {
    week: 28,
    src: '/images/fetal/w28.png',
    altEn: 'A twenty-eight-week fetus, plumper with slightly open eyes in a curled pose.',
    altFa: 'جنین هفته بیست‌وهشتم، تنومندتر با چشمان کمی باز در حالت جمع‌شده.',
  },
  {
    week: 32,
    src: '/images/fetal/w32.png',
    altEn: 'A thirty-two-week fetus with open eyes and soft fat layer under the skin.',
    altFa: 'جنین هفته سی‌ودوم با چشمان باز و لایه چربی نرم زیر پوست.',
  },
  {
    week: 36,
    src: '/images/fetal/w36.png',
    altEn: 'A thirty-six-week fetus, plump and rosy, in a head-down curled pose.',
    altFa: 'جنین هفته سی‌وششم، تپل و گلگون، در حالت سرِ پایین و جمع‌شده.',
  },
  {
    week: 40,
    src: '/images/fetal/w40.png',
    altEn: 'A full-term baby curled head-down in the womb, ready for birth.',
    altFa: 'نوزاد کاملاً رسیده، سرِ پایین در رحم جمع‌شده، آماده تولد.',
  },
];

/** Navigable stage list (matches the obstetric week timeline in the app). */
export const STUDIO_STAGE_WEEKS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40];

/** Latest completed stage keyframe for a given week (1–40). */
export function stageImageForWeek(week: number): FetalStageImage {
  let found = FETAL_STAGE_IMAGES[0];
  for (const img of FETAL_STAGE_IMAGES) {
    if (img.week <= week) found = img;
    else break;
  }
  return found;
}
