/**
 * NIVA Studio content layer (Wave 3.3 — separation of concerns).
 *
 * This file is the EDUCATIONAL CONTENT manifest for the 3D studio, kept strictly
 * apart from geometry parameters (src/components/studio/params.ts) and rendering
 * (fetus-model.tsx / scene.tsx). Editors and clinical reviewers own this file;
 * the parametric engine never hard-codes copy.
 *
 * Tone rules (mirrors the platform voice):
 *  - warm, evidence-aligned, schematic framing ("educational illustration");
 *  - NO diagnostic claims, NO measurements presented as exact ("about/approx");
 *  - sizes use standard public fruit/seed analogies grounded in crown–rump
 *    (CRL, ≤ ~13 weeks) and crown–heel (CHL, later weeks) charts from standard
 *    embryology references (Moore & Persaud) and NHS week-by-week;
 *  - every annotation carries a citation the reviewer can check.
 */

export type AnnotationTarget = 'head' | 'heart' | 'limb' | 'cord' | 'placenta' | 'uterus' | 'body';

export interface StudioAnnotation {
  /** Which anatomical structure the marker anchors to (positioned in params.ts). */
  target: AnnotationTarget;
  labelEn: string;
  labelFa: string;
  /** 1–2 sentences, evidence-aligned with standard embryology. */
  textEn: string;
  textFa: string;
  citationEn: string;
  citationFa: string;
}

export interface StudioStageContent {
  week: number;
  titleEn: string;
  titleFa: string;
  /** 60–120 words, warm educational tone, honest schematic framing. */
  narrationEn: string;
  narrationFa: string;
  /** Only structures that exist at this gestational week. */
  annotations: StudioAnnotation[];
  sizeComparisonEn: string;
  sizeComparisonFa: string;
  sources: string[];
}

export interface StudioAssetManifest {
  assetId: string;
  geometryKind: 'parametric' | 'gltf';
  /** Present only for authored glTF assets. */
  gltfUrl?: string;
  version: string;
  reviewStatus: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DEMONSTRATION';
  /** Segment multipliers applied to the base radial segment counts (24/48/96). */
  lodProfile: { low: number; medium: number; high: number };
}

/* Shared citation strings (kept as data, rendered verbatim in the UI). */
const MOORE = {
  en: 'Moore & Persaud, The Developing Human (11th ed.)',
  fa: 'مور و پرسود، جنین‌شناسی بالینی (ویرایش یازدهم)',
};
const NHS = {
  en: 'NHS, Pregnancy week-by-week (2024)',
  fa: 'NHS، راهنمای هفته‌به‌هفته بارداری (۲۰۲۴)',
};
const WHO = {
  en: 'WHO, Recommendations on Antenatal Care (2016)',
  fa: 'سازمان جهانی بهداشت، توصیه‌های مراقبت دوران بارداری (۲۰۱۶)',
};

/**
 * Per-stage educational content for weeks 4, 6, 8 … 40 — matches the
 * STAGE_KEYFRAMES in src/components/studio/params.ts exactly.
 */
export const STUDIO_STAGE_CONTENT: StudioStageContent[] = [
  {
    week: 4,
    titleEn: 'Foundations — the embryonic disc',
    titleFa: 'مبانی — صفحه جنینی',
    narrationEn:
      'This schematic educational illustration shows the very first foundations. A tiny disc-shaped embryo, about the size of a poppy seed, has settled into the nourishing lining of the uterus. Three quiet layers of cells are forming; every organ your baby will ever have begins in these layers. Around it, the early placenta is starting its exchange work. Nothing dramatic can be seen yet — and that is exactly right. This week is about laying foundations, not milestones.',
    narrationFa:
      'این تصویر آموزشی شماتیک، نخستین بنیان‌ها را نشان می‌دهد. جنین کوچکی به شکل دیسک و تقریباً هم‌اندازه‌ی یک دانه‌ی خشخاش، در آغوش مخاط تغذیه‌کننده‌ی رحم جای گرفته است. سه لایه‌ی آرامِ سلولی در حال شکل‌گیری‌اند؛ هر اندامی که فرزند شما روزی خواهد داشت، از همین لایه‌ها آغاز می‌شود. در اطرافش، جفتِ اولیه کار تبادل را آغاز کرده است. هنوز چیز چشمگیری دیده نمی‌شود — و دقیقاً همین درست است. این هفته هفته‌ی بنیان‌گذاری است، نه دستاورد.',
    annotations: [
      {
        target: 'body',
        labelEn: 'Embryonic disc', labelFa: 'صفحه جنینی',
        textEn: 'A flat disc of three germ layers — ectoderm, mesoderm and endoderm — the origin of every body system.',
        textFa: 'دیسکی تخت از سه لایه‌ی زایا — برون‌پوست، میان‌پوست و درون‌پوست — که خاستگاه همه‌ی دستگاه‌های بدن است.',
        citationEn: `${MOORE.en}, ch. 4–5`, citationFa: `${MOORE.fa}، فصل ۴–۵`,
      },
      {
        target: 'placenta',
        labelEn: 'Early placenta', labelFa: 'جفت اولیه',
        textEn: 'Chorionic villi bud into the uterine lining, starting the interface that will exchange oxygen and nutrients.',
        textFa: 'پرزهای کوریونی به مخاط رحم نفوذ می‌کنند و سطحی می‌سازند که بعداً اکسیژن و مواد مغذی را تبادل می‌کند.',
        citationEn: `${MOORE.en}, ch. 7`, citationFa: `${MOORE.fa}، فصل ۷`,
      },
      {
        target: 'uterus',
        labelEn: 'Implantation site', labelFa: 'محل لانه‌گزینی',
        textEn: 'The embryo rests in the upper uterine wall, cradled by the first film of amniotic fluid.',
        textFa: 'جنین در بخش بالایی دیواره‌ی رحم جای گرفته و نخستین لایه‌ی نازک مایع آمنیوتیک دورش را گرفته است.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
    ],
    sizeComparisonEn: 'About the size of a poppy seed — roughly 1 mm. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک دانه‌ی خشخاش — تقریباً ۱ میلی‌متر. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en],
  },
  {
    week: 6,
    titleEn: 'A beating beginning',
    titleFa: 'آغازی با ضربان',
    narrationEn:
      'By this week the embryo has folded into a gentle C shape, and its nervous system is closing into a tube that will become the brain and spinal cord. Small buds mark where arms and legs will grow. In this schematic educational illustration, a soft glow marks the primitive heart — around this time its first regular pulsing motion begins. Remember, this is an educational drawing rather than a scan: it shows typical development, and every pregnancy follows its own rhythm.',
    narrationFa:
      'در این هفته جنین به شکل ملایم C خمیده شده و دستگاه عصبی‌اش در حال بسته‌شدن به لوله‌ای است که مغز و نخاع خواهد شد. جوانه‌های کوچکی جای رشد دست و پا را نشان می‌دهند. در این تصویر آموزشی شماتیک، هاله‌ای نرم قلب اولیه را نشان می‌دهد — حوالی همین هفته است که نخستین ضربان منظم آن آغاز می‌شود. به یاد داشته باشید این یک نقاشی آموزشی است نه سونوگرافی: رشدِ معمول را نشان می‌دهد و هر بارداری ریتم خودش را دارد.',
    annotations: [
      {
        target: 'head',
        labelEn: 'Neural tube & brain', labelFa: 'لوله عصبی و مغز',
        textEn: 'The neural tube is closing; three brain vesicles already outline the future brain — the head is the largest region.',
        textFa: 'لوله‌ی عصبی در حال بسته‌شدن است؛ سه کیسه‌ی مغزی، طرح مغز آینده را ترسیم کرده‌اند — سر بزرگ‌ترین بخش بدن است.',
        citationEn: `${MOORE.en}, ch. 5`, citationFa: `${MOORE.fa}، فصل ۵`,
      },
      {
        target: 'heart',
        labelEn: 'First heartbeat', labelFa: 'نخستین ضربان قلب',
        textEn: 'The heart tube folds and begins its first regular pulsing motion around weeks 5–6.',
        textFa: 'لوله‌ی قلب تاخورده و حوالی هفته‌های ۵ تا ۶ نخستین ضربان منظمش را آغاز می‌کند.',
        citationEn: `${MOORE.en}, ch. 13`, citationFa: `${MOORE.fa}، فصل ۱۳`,
      },
      {
        target: 'placenta',
        labelEn: 'Placenta', labelFa: 'جفت',
        textEn: 'Villi multiply and branch, enlarging the exchange surface between you and the embryo.',
        textFa: 'پرزها تکثیر و منشعب می‌شوند و سطح تبادل میان شما و جنین را بزرگ‌تر می‌کنند.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'body',
        labelEn: 'C-shaped curl', labelFa: 'خمیدگی C شکل',
        textEn: 'Rapid growth of the back folds the embryo into the classic C curve of early weeks.',
        textFa: 'رشد سریع پشت، جنین را به خمیدگی C شکلِ کلاسیک هفته‌های اول درمی‌آورد.',
        citationEn: `${MOORE.en}, ch. 5`, citationFa: `${MOORE.fa}، فصل ۵`,
      },
    ],
    sizeComparisonEn: 'About the size of a lentil — roughly 0.6 cm. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک عدس — تقریباً ۰٫۶ سانتی‌متر. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en, WHO.en],
  },
  {
    week: 8,
    titleEn: 'Paddles and a fading tail',
    titleFa: 'جوانه‌ها و دمی که محو می‌شود',
    narrationEn:
      'The embryo now has distinctly human features — with a head large for the body, which is completely normal at this stage. Upper and lower limb paddles are growing quickly, and the tiny tail of the earliest weeks has nearly disappeared. The umbilical cord now carries blood between embryo and placenta. This schematic educational illustration uses a raspberry for scale — about 1.6 centimetres. Hands and feet are still webbed paddles, refining themselves week by week.',
    narrationFa:
      'جنین اکنون ظاهری آشکارا انسانی دارد — با سری بزرگ‌تر نسبت به بدن، که در این مرحله کاملاً طبیعی است. جوانه‌های بالایی و پایینی دست و پا سریع رشد می‌کنند و دُم کوچکِ هفته‌های نخست تقریباً ناپدید شده است. بند ناف اکنون خون را میان جنین و جفت جابه‌جا می‌کند. این تصویر آموزشی شماتیک برای مقایسه از تمشک استفاده می‌کند — حدود ۱٫۶ سانتی‌متر. دست و پا هنوز پاروهایی پرده‌دارند که هفته‌به‌هفته ظریف‌تر می‌شوند.',
    annotations: [
      {
        target: 'limb',
        labelEn: 'Limb paddles', labelFa: 'پاروهای اندام',
        textEn: 'Upper limbs grow ahead of lower ones; flattened paddles will separate into fingers in the coming weeks.',
        textFa: 'اندام‌های بالایی جلوتر از اندام‌های پایینی رشد می‌کنند؛ پاروهای پهن در هفته‌های پیش‌رو به انگشتان جدا خواهند شد.',
        citationEn: `${MOORE.en}, ch. 6`, citationFa: `${MOORE.fa}، فصل ۶`,
      },
      {
        target: 'cord',
        labelEn: 'Umbilical cord', labelFa: 'بند ناف',
        textEn: 'The body stalk has become a cord carrying blood between embryo and placenta.',
        textFa: 'ساقه‌ی بدنی به بند ناف تبدیل شده و خون را میان جنین و جفت جابه‌جا می‌کند.',
        citationEn: `${MOORE.en}, ch. 7`, citationFa: `${MOORE.fa}، فصل ۷`,
      },
      {
        target: 'head',
        labelEn: 'Face in profile', labelFa: 'چهره از نیم‌رخ',
        textEn: 'Eyelids and external ears begin to take shape; the forehead is still prominent.',
        textFa: 'پلک‌ها و گوش خارجی شکل می‌گیرند؛ پیشانی هنوز برجسته است.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'placenta',
        labelEn: 'Placenta', labelFa: 'جفت',
        textEn: 'Now clearly defined, the placenta handles oxygen, nutrients and waste for the embryo.',
        textFa: 'جفت که اکنون مرزهای روشنی یافته، اکسیژن و مواد مغذی و پسماندها را برای جنین مدیریت می‌کند.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
    ],
    sizeComparisonEn: 'About the size of a raspberry — roughly 1.6 cm. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک تمشک — تقریباً ۱٫۶ سانتی‌متر. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en],
  },
  {
    week: 10,
    titleEn: 'Everything in miniature',
    titleFa: 'همه‌چیز در مقیاس کوچک',
    narrationEn:
      'Fingers and toes are separating now, and eyelids are forming over eyes that already carry pigment. Inside this schematic educational illustration, the major organs — heart, brain, lungs, liver and kidneys — are all present and beginning their early work. The embryo is graduating into the fetal period, when growth and refinement take over from formation. At about three centimetres — roughly the size of a kumquat — everything important is already in place, just in miniature.',
    narrationFa:
      'انگشتان دست و پا از هم جدا می‌شوند و پلک‌ها روی چشم‌هایی که همین حالا هم رنگدانه دارند شکل می‌گیرند. در درون این تصویر آموزشی شماتیک، اندام‌های اصلی — قلب، مغز، ریه‌ها، کبد و کلیه‌ها — همگی حاضرند و کار اولیه‌شان را آغاز کرده‌اند. جنین از دوره‌ی جنینیِ اولیه به دوره‌ی پریودی می‌گذرد؛ دوره‌ای که رشد و ظرافت‌بخشی جای شکل‌گیری را می‌گیرد. با حدود سه سانتی‌متر — تقریباً اندازه‌ی یک کینکوات — هر آنچه مهم است سر جایش است، فقط در مقیاس مینیاتوری.',
    annotations: [
      {
        target: 'limb',
        labelEn: 'Separating fingers', labelFa: 'انگشتان در حال جدا شدن',
        textEn: 'Webbing between fingers and toes recedes as digits separate.',
        textFa: 'پرده‌ی میان انگشتان دست و پا عقب می‌نشیند و انگشتان از هم جدا می‌شوند.',
        citationEn: `${MOORE.en}, ch. 6`, citationFa: `${MOORE.fa}، فصل ۶`,
      },
      {
        target: 'head',
        labelEn: 'Forming eyelids', labelFa: 'پلک‌های در حال شکل‌گیری',
        textEn: 'Eyelids grow over the eyes and will stay fused for several more weeks.',
        textFa: 'پلک‌ها روی چشم‌ها رشد می‌کنند و چند هفته‌ی دیگر نیز بسته می‌مانند.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'body',
        labelEn: 'Organ maturation', labelFa: 'بلوغ اندام‌ها',
        textEn: 'Liver and kidneys begin functioning; the intestines are still partly in the cord base.',
        textFa: 'کبد و کلیه‌ها کارشان را آغاز می‌کنند؛ بخشی از روده‌ها هنوز در پای بند ناف است.',
        citationEn: `${MOORE.en}, ch. 11–12`, citationFa: `${MOORE.fa}، فصل ۱۱–۱۲`,
      },
      {
        target: 'cord',
        labelEn: 'Umbilical cord', labelFa: 'بند ناف',
        textEn: 'A longer, looping cord now shuttles blood freely between fetus and placenta.',
        textFa: 'بند نافِ بلندتر و حلقه‌خورده اکنون به‌آسانی خون را میان جنین و جفت جابه‌جا می‌کند.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
    ],
    sizeComparisonEn: 'About the size of a kumquat — roughly 3 cm. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک کینکوات (نارنج ژاپنی) — تقریباً ۳ سانتی‌متر. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en],
  },
  {
    week: 12,
    titleEn: 'First human proportions',
    titleFa: 'نخستین تناسب‌های انسانی',
    narrationEn:
      'Welcome to a familiar milestone. The head is still about half of the total length, but the body is catching up and the first human proportions are emerging. The heart now beats with four chambers, and tiny fingers can curl into fists. The placenta is becoming the main support organ, feeding and clearing through the umbilical cord. In this schematic educational illustration, a lime stands in for scale — about 5 centimetres crown to rump.',
    narrationFa:
      'به یکی از نقاط عطف آشنا خوش آمدید. سر هنوز حدود نیمی از طول کل است، اما بدن دارد جا می‌افتد و نخستین تناسب‌های انسانی ظاهر می‌شود. قلب اکنون با چهار حفره می‌تپد و انگشتان کوچک می‌توانند به مشت بپیچند. جفت در حال تبدیل‌شدن به اندام اصلی پشتیبان است و از راه بند ناف تغذیه و پاک‌سازی را انجام می‌دهد. در این تصویر آموزشی شماتیک، یک لیمو ترش برای مقایسه معیار است — حدود ۵ سانتی‌متر از سر تا باسن.',
    annotations: [
      {
        target: 'heart',
        labelEn: 'Four-chambered heart', labelFa: 'قلب چهارحفره‌ای',
        textEn: 'The four chambers of the heart are now formed and beat rhythmically.',
        textFa: 'چهار حفره‌ی قلب اکنون شکل گرفته و ریتمیک می‌تپد.',
        citationEn: `${MOORE.en}, ch. 13`, citationFa: `${MOORE.fa}، فصل ۱۳`,
      },
      {
        target: 'head',
        labelEn: 'Half-body head', labelFa: 'سرِ نیم‌تنه',
        textEn: 'The head is about half the crown–rump length; the face looks unmistakably human.',
        textFa: 'سر حدود نیمی از طول سر تا باسن است؛ چهره به‌روشنی انسانی به نظر می‌رسد.',
        citationEn: `${MOORE.en}, ch. 6`, citationFa: `${MOORE.fa}، فصل ۶`,
      },
      {
        target: 'placenta',
        labelEn: 'Placenta takes over', labelFa: 'جفت، اندام اصلی پشتیبان',
        textEn: 'The placenta is now the main organ of exchange, supporting the fetus until birth.',
        textFa: 'جفت اکنون اندام اصلی تبادل است و تا زایمان پشتیبان جنین خواهد بود.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'cord',
        labelEn: 'Umbilical cord', labelFa: 'بند ناف',
        textEn: 'Two arteries and one vein carry exchanges through Wharton’s jelly.',
        textFa: 'دو شریان و یک ورید، تبادل‌ها را از میان ژله‌ی وارتون انجام می‌دهند.',
        citationEn: `${MOORE.en}, ch. 7`, citationFa: `${MOORE.fa}، فصل ۷`,
      },
      {
        target: 'limb',
        labelEn: 'Tiny fists', labelFa: 'مشت‌های کوچک',
        textEn: 'Fingers can close into fists; nail beds are beginning to form.',
        textFa: 'انگشتان می‌توانند به مشت ببندند؛ بستر ناخن‌ها در حال شکل‌گیری است.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
    ],
    sizeComparisonEn: 'About the size of a lime — roughly 5 cm crown to rump. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک لیمو ترش — تقریباً ۵ سانتی‌متر از سر تا باسن. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en, WHO.en],
  },
  {
    week: 16,
    titleEn: 'Bones take shape',
    titleFa: 'استخوان‌ها شکل می‌گیرند',
    narrationEn:
      'Growth is the theme of this stage. The skeleton, first built from soft cartilage, is hardening into bone, and movements are becoming coordinated — though early on you may feel only fluttering, if anything at all. The eyes are moving toward the front of the face and the scalp pattern is being set. This schematic educational illustration shows a stage of about 11–12 centimetres, near the size of an avocado. From here on, each week is largely about refining what already exists.',
    narrationFa:
      'موضوع اصلی این مرحله رشد است. اسکلتی که از غضروف نرم ساخته شده بود، سخت می‌شود و به استخوان تبدیل می‌گردد و حرکات هماهنگ‌تر می‌شوند — هرچند در این مرحله شاید فقط احساس بال‌بال‌زدنی داشته باشید، یا هنوز هیچ. چشم‌ها به سمت جلوی صورت جابه‌جا می‌شوند و الگوی پوست سر تعیین می‌شود. این تصویر آموزشی شماتیک مرحله‌ای حدود ۱۱ تا ۱۲ سانتی‌متر را نشان می‌دهد، نزدیک اندازه‌ی یک آووکادو. از این پس، هر هفته بیشتر ظرافت‌بخشی به همان چیزی است که هست.',
    annotations: [
      {
        target: 'body',
        labelEn: 'Hardening skeleton', labelFa: 'اسکلت در حال سخت‌شدن',
        textEn: 'Cartilage is converting to bone through ossification, beginning around week 16.',
        textFa: 'از حوالی هفته ۱۶ غضروف از راه استخوانی‌شدن به استخوان تبدیل می‌شود.',
        citationEn: `${MOORE.en}, ch. 10`, citationFa: `${MOORE.fa}، فصل ۱۰`,
      },
      {
        target: 'limb',
        labelEn: 'Coordinated movements', labelFa: 'حرکات هماهنگ',
        textEn: 'Arms and legs move in coordinated patterns, though felt movement usually begins later.',
        textFa: 'دست و پا با الگوهای هماهنگ حرکت می‌کنند، هرچند حس حرکت معمولاً بعداً آغاز می‌شود.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'head',
        labelEn: 'Forward-facing eyes', labelFa: 'چشم‌های رو به جلو',
        textEn: 'The eyes face forward and the ears sit close to their final position.',
        textFa: 'چشم‌ها رو به جلو قرار گرفته‌اند و گوش‌ها نزدیک جای نهایی خود نشسته‌اند.',
        citationEn: `${MOORE.en}, ch. 6`, citationFa: `${MOORE.fa}، فصل ۶`,
      },
      {
        target: 'placenta',
        labelEn: 'Placenta', labelFa: 'جفت',
        textEn: 'A network of vessels keeps growing to meet the fetus’ rising demand.',
        textFa: 'شبکه‌ی عروق برای پاسخ به نیاز فزاینده‌ی جنین به رشد خود ادامه می‌دهد.',
        citationEn: WHO.en, citationFa: WHO.fa,
      },
    ],
    sizeComparisonEn: 'About the size of an avocado — roughly 11–12 cm crown to rump. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک آووکادو — تقریباً ۱۱ تا ۱۲ سانتی‌متر از سر تا باسن. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en],
  },
  {
    week: 20,
    titleEn: 'The anatomy-scan midpoint',
    titleFa: 'میانه‌ی راه — سونوگرافی آناتومی',
    narrationEn:
      'This is the midpoint many families look forward to — the stage of the detailed anatomy scan, typically offered around weeks 18 to 22. The skin is coated with vernix, a creamy protective layer, and a fine fuzz called lanugo helps keep it in place. The inner ear is developed enough that sound, including your voice, becomes part of the baby’s world. In this schematic educational illustration, a banana approximates the length — about 25 centimetres from crown to heel, measured with the legs.',
    narrationFa:
      'این همان میانه‌ی راهی است که بسیاری از خانواده‌ها مشتاقش هستند — مرحله‌ی سونوگرافی دقیق آناتومی که معمولاً حوالی هفته‌های ۱۸ تا ۲۲ انجام می‌شود. پوست با ماده‌ای خامه‌ای و محافظ به نام ورنیکس پوشیده شده و کرکی ظریف به نام لانوگو به ماندن آن کمک می‌کند. گوش داخلی به‌قدری رشد کرده که صدا — از جمله صدای شما — بخشی از دنیای نوزاد شود. در این تصویر آموزشی شماتیک، یک موز طول را تقریب می‌زند — حدود ۲۵ سانتی‌متر از فرق سر تا پاشنه، همراه با پاها.',
    annotations: [
      {
        target: 'body',
        labelEn: 'Vernix & lanugo', labelFa: 'ورنیکس و لانوگو',
        textEn: 'Cheesy vernix coats the skin; fine lanugo hair holds it in place.',
        textFa: 'ماده‌ی ورنیکس پوست را می‌پوشاند و موهای ظریف لانوگو آن را سر جایش نگه می‌دارد.',
        citationEn: `${MOORE.en}, ch. 6–7`, citationFa: `${MOORE.fa}، فصل ۶–۷`,
      },
      {
        target: 'head',
        labelEn: 'Developing hearing', labelFa: 'شنوایی در حال رشد',
        textEn: 'Inner-ear structures are mature enough to detect sound vibrations.',
        textFa: 'ساختارهای گوش داخلی به‌اندازه‌ی کافی رسیده‌اند که ارتعاش صدا را دریافت کنند.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'heart',
        labelEn: 'Four chambers at work', labelFa: 'چهار حفره در حال کار',
        textEn: 'All four chambers are visible and working — a standard check during the anatomy scan.',
        textFa: 'هر چهار حفره دیده می‌شوند و کار می‌کنند — بررسی استاندارد در سونوگرافی آناتومی.',
        citationEn: WHO.en, citationFa: WHO.fa,
      },
      {
        target: 'limb',
        labelEn: 'Stronger limbs', labelFa: 'اندام‌های نیرومندتر',
        textEn: 'Legs reach their relative proportions; kicks and stretches become more deliberate.',
        textFa: 'پاها به تناسب نسبی خود می‌رسند؛ لگدها و کش‌وقوس‌ها عامدانه‌تر می‌شوند.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'cord',
        labelEn: 'Umbilical cord', labelFa: 'بند ناف',
        textEn: 'The cord thickens to carry a steadily rising blood flow.',
        textFa: 'بند ناف برای جابه‌جایی خونِ پیوسته رو به افزایش، کلفت‌تر می‌شود.',
        citationEn: `${MOORE.en}, ch. 7`, citationFa: `${MOORE.fa}، فصل ۷`,
      },
    ],
    sizeComparisonEn: 'About the size of a banana — roughly 25 cm crown to heel. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک موز — تقریباً ۲۵ سانتی‌متر از فرق سر تا پاشنه. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en, WHO.en],
  },
  {
    week: 24,
    titleEn: 'Practising for air',
    titleFa: 'تمرین برای نفس کشیدن',
    narrationEn:
      'The lungs are beginning to produce surfactant — the soap-like film that will keep airways open after birth — and breathing movements are practised daily. Rapid eye movements start behind still-fused eyelids. With neonatal intensive care, survival outside the womb becomes medically possible around this age, though every extra week inside is a gift of maturation. This schematic educational illustration uses an ear of corn for scale, about 30 centimetres crown to heel. Hearing is sharp enough to startle now.',
    narrationFa:
      'ریه‌ها تولید سورفکتانت را آغاز می‌کنند — لایه‌ای صابون‌مانند که پس از تولد راه‌های هوایی را باز نگه می‌دارد — و حرکات تنفسی هر روز تمرین می‌شوند. پشت پلک‌هایی که هنوز به هم چسبیده‌اند، حرکات سریع چشم آغاز شده است. با مراقبت ویژه‌ی نوزادان، بقا در بیرون رحم حوالی این سن از نظر پزشکی ممکن می‌شود، هرچند هر هفته‌ی بیشتر در رحم، هدیه‌ای برای بلوغ است. این تصویر آموزشی شماتیک برای مقایسه از بلال استفاده می‌کند، حدود ۳۰ سانتی‌متر از فرق سر تا پاشنه. شنوایی اکنون به‌قدری تیز است که جنین جا بخورد.',
    annotations: [
      {
        target: 'body',
        labelEn: 'Surfactant begins', labelFa: 'آغاز سورفکتانت',
        textEn: 'Lung cells start secreting surfactant; breathing movements rehearse the real thing.',
        textFa: 'سلول‌های ریه ترشح سورفکتانت را آغاز می‌کنند؛ حرکات تنفسی، نسخه‌ی تمرینی کار اصلی‌اند.',
        citationEn: `${MOORE.en}, ch. 10`, citationFa: `${MOORE.fa}، فصل ۱۰`,
      },
      {
        target: 'head',
        labelEn: 'Fused eyelids, quick eyes', labelFa: 'پلک چسبیده، چشم‌های تند',
        textEn: 'Eyelids are still fused, yet rapid eye movements already cycle beneath them.',
        textFa: 'پلک‌ها هنوز به هم چسبیده‌اند، اما حرکات سریع چشم زیر آن‌ها در جریان است.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'heart',
        labelEn: 'Working harder', labelFa: 'قلبی سخت‌کوش‌تر',
        textEn: 'The heart pumps with growing force as blood volume rises.',
        textFa: 'با افزایش حجم خون، قلب با قدرت بیشتری می‌تپد.',
        citationEn: WHO.en, citationFa: WHO.fa,
      },
      {
        target: 'placenta',
        labelEn: 'Placenta', labelFa: 'جفت',
        textEn: 'The placenta now handles a blood flow approaching half a litre per minute.',
        textFa: 'جفت اکنون خونی در حدود نیم لیتر در دقیقه را مدیریت می‌کند.',
        citationEn: `${MOORE.en}, ch. 7`, citationFa: `${MOORE.fa}، فصل ۷`,
      },
    ],
    sizeComparisonEn: 'About the size of an ear of corn — roughly 30 cm crown to heel. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک بلال — تقریباً ۳۰ سانتی‌متر از فرق سر تا پاشنه. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en, WHO.en],
  },
  {
    week: 28,
    titleEn: 'Eyes open on the third trimester',
    titleFa: 'چشم‌هایی گشوده به سه‌ماهه‌ی سوم',
    narrationEn:
      'The third trimester has begun. Grooves and folds in the brain are deepening fast, and the eyes — fused earlier in pregnancy — can now open, close and sense light through the wall of the uterus. Bone marrow is taking over red-blood-cell production. In this schematic educational illustration, an eggplant approximates the size — about 35 centimetres crown to heel. Movements feel strong and purposeful now, and many babies settle into patterns of rest and activity you can learn to read.',
    narrationFa:
      'سه‌ماهه‌ی سوم آغاز شده است. شیارها و چین‌های مغز به‌سرعت عمیق‌تر می‌شوند و چشم‌هایی که پیش‌تر به هم چسبیده بودند، اکنون باز و بسته می‌شوند و از پشت دیواره‌ی رحم نور را حس می‌کنند. مغز استخوان در حال تحویل‌گرفتن کار ساخت گلبول‌های قرمز است. در این تصویر آموزشی شماتیک، یک بادمجان اندازه را تقریب می‌زند — حدود ۳۵ سانتی‌متر از فرق سر تا پاشنه. حرکات اکنون نیرومند و عامدانه‌اند و بسیاری از نوزادان به الگوهایی از خواب و بیداری می‌رسند که می‌توانید یاد بگیرید و بخوانید.',
    annotations: [
      {
        target: 'head',
        labelEn: 'Eyes open', labelFa: 'چشم‌های گشوده',
        textEn: 'Eyelids unfuse around this time; the eyes can open and react to light.',
        textFa: 'حوالی همین زمان پلک‌ها از هم باز می‌شوند؛ چشم‌ها می‌توانند باز شوند و به نور واکنش نشان دهند.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'body',
        labelEn: 'Deepening brain folds', labelFa: 'چین‌های عمیق‌تر مغز',
        textEn: 'The cerebral surface folds rapidly, adding processing capacity.',
        textFa: 'سطح مغز به‌سرعت چین می‌خورد و توان پردازش افزوده می‌شود.',
        citationEn: `${MOORE.en}, ch. 17`, citationFa: `${MOORE.fa}، فصل ۱۷`,
      },
      {
        target: 'limb',
        labelEn: 'Purposeful kicks', labelFa: 'لگدهای عامدانه',
        textEn: 'Movements become stronger and patterned — many caregivers suggest noting daily counts.',
        textFa: 'حرکات نیرومندتر و الگودار می‌شوند — بسیاری از مراقبان توصیه می‌کنند روزانه از آن‌ها یادداشت بردارید.',
        citationEn: WHO.en, citationFa: WHO.fa,
      },
      {
        target: 'placenta',
        labelEn: 'Placenta', labelFa: 'جفت',
        textEn: 'Exchange capacity peaks to fuel the coming weeks of fastest growth.',
        textFa: 'ظرفیت تبادل جفت به اوج می‌رسد تا هفته‌های پرشتاب رشد پیش‌رو را سوخت‌رسانی کند.',
        citationEn: `${MOORE.en}, ch. 7`, citationFa: `${MOORE.fa}، فصل ۷`,
      },
    ],
    sizeComparisonEn: 'About the size of an eggplant — roughly 35 cm crown to heel. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک بادمجان — تقریباً ۳۵ سانتی‌متر از فرق سر تا پاشنه. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en, WHO.en],
  },
  {
    week: 32,
    titleEn: 'Filling out, settling down',
    titleFa: 'پُر شدن و آرام گرفتن',
    narrationEn:
      'Most of the weight gained from here comes from fat layers — softening and warming skin that has been thin and translucent until now. The skull plates stay flexible for the journey of birth, while other bones finish hardening. In this schematic educational illustration, a butternut squash approximates the scale — about 42 centimetres crown to heel. Many babies turn head-down around this time, though some wait a few more weeks, and that can still be perfectly typical.',
    narrationFa:
      'بیشتر وزنی که از این پس اضافه می‌شود از لایه‌های چربی است — پوستی را نرم و گرم می‌کنند که تاکنون نازک و نیمه‌شفاف بوده است. صفحات جمجمه برای سفر زایمان انعطاف‌پذیر می‌مانند، در حالی که بقیه‌ی استخوان‌ها کار سخت‌شدن را به پایان می‌رسانند. در این تصویر آموزشی شماتیک، یک کدو حلوایی مقیاس را تقریب می‌زند — حدود ۴۲ سانتی‌متر از فرق سر تا پاشنه. بسیاری از نوزادان حوالی همین زمان سر به پایین می‌چرخند، هرچند برخی چند هفته‌ای صبر می‌کنند و این هم می‌تواند کاملاً طبیعی باشد.',
    annotations: [
      {
        target: 'body',
        labelEn: 'Fat layer forms', labelFa: 'لایه‌ی چربی شکل می‌گیرد',
        textEn: 'Subcutaneous fat fills in, smoothing skin and storing energy for birth.',
        textFa: 'چربی زیر پوستی پر می‌شود؛ پوست را نرم می‌کند و برای زایمان ذخیره‌ی انرژی می‌سازد.',
        citationEn: `${MOORE.en}, ch. 6`, citationFa: `${MOORE.fa}، فصل ۶`,
      },
      {
        target: 'head',
        labelEn: 'Flexible skull plates', labelFa: 'صفحات جمجمه‌ی منعطف',
        textEn: 'Skull plates remain separated and pliable, moulding easily during birth.',
        textFa: 'صفحات جمجمه جدا و نرم می‌مانند تا هنگام زایمان به‌آسانی شکل بگیرند.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'limb',
        labelEn: 'Chubby limbs', labelFa: 'اندام‌های تپل',
        textEn: 'Limbs round out as fat accumulates; grasp tightens.',
        textFa: 'با انباشته‌شدن چربی، اندام‌ها گرد می‌شوند؛ قدرت گرفتن بیشتر می‌شود.',
        citationEn: `${MOORE.en}, ch. 6`, citationFa: `${MOORE.fa}، فصل ۶`,
      },
      {
        target: 'cord',
        labelEn: 'Umbilical cord', labelFa: 'بند ناف',
        textEn: 'The cord carries a large share of the fetus’ blood volume at all times.',
        textFa: 'بند ناف در هر لحظه سهم بزرگی از حجم خون جنین را در خود دارد.',
        citationEn: `${MOORE.en}, ch. 7`, citationFa: `${MOORE.fa}، فصل ۷`,
      },
    ],
    sizeComparisonEn: 'About the size of a butternut squash — roughly 42 cm crown to heel. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک کدو حلوایی — تقریباً ۴۲ سانتی‌متر از فرق سر تا پاشنه. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en],
  },
  {
    week: 36,
    titleEn: 'Nearly ready to meet you',
    titleFa: 'چشم‌به‌راه',
    narrationEn:
      'The finish line is in sight. Lanugo, the fine fuzz that covered the body, is shedding, and the sucking muscles are practising for their first job. The lungs are in their final phase of maturation, and the baby may settle lower in the pelvis as the head engages. In this schematic educational illustration, a romaine lettuce approximates the length — about 47 centimetres crown to heel. Births from 37 weeks onward are considered early term, and every day still adds refinement.',
    narrationFa:
      'خط پایان در دید است. لانوگو — کرک ظریفی که بدن را پوشانده بود — می‌ریزد و ماهیچه‌های مکیدن برای نخستین مأموریت‌شان تمرین می‌کنند. ریه‌ها در واپسین مرحله‌ی بلوغ‌اند و ممکن است نوزاد با سرِ درگیر شده در لگن، پایین‌تر بنشیند. در این تصویر آموزشی شماتیک، یک کاهوی رومی طول را تقریب می‌زند — حدود ۴۷ سانتی‌متر از فرق سر تا پاشنه. زایمان از هفته ۳۷ به بعد «زودرس کامل» تلقی می‌شود و هر روز همچنان ظرافتی می‌افزاید.',
    annotations: [
      {
        target: 'body',
        labelEn: 'Shedding lanugo', labelFa: 'ریزش لانوگو',
        textEn: 'Lanugo disappears; vernix may remain only in skin creases.',
        textFa: 'لانوگو از بین می‌رود؛ ورنیکس شاید فقط در چین‌های پوست بماند.',
        citationEn: `${MOORE.en}, ch. 7`, citationFa: `${MOORE.fa}، فصل ۷`,
      },
      {
        target: 'head',
        labelEn: 'Engaging head', labelFa: 'سرِ درگیر',
        textEn: 'The head often settles into the pelvis — the baby is practising posture for birth.',
        textFa: 'سر اغلب در لگن جای می‌گیرد — نوزاد وضعیت زایمان را تمرین می‌کند.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'limb',
        labelEn: 'Sucking practice', labelFa: 'تمرین مکیدن',
        textEn: 'Sucking and swallowing are rehearsed with amniotic fluid.',
        textFa: 'مکیدن و بلع با مایع آمنیوتک تمرین می‌شود.',
        citationEn: `${MOORE.en}, ch. 10`, citationFa: `${MOORE.fa}، فصل ۱۰`,
      },
      {
        target: 'placenta',
        labelEn: 'Placenta', labelFa: 'جفت',
        textEn: 'Still fully committed: the placenta keeps exchanging until the very last day.',
        textFa: 'هنوز تمام‌قد در کار است: جفت تا واپسین روز تبادل را ادامه می‌دهد.',
        citationEn: WHO.en, citationFa: WHO.fa,
      },
    ],
    sizeComparisonEn: 'About the size of a romaine lettuce — roughly 47 cm crown to heel. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک کاهوی رومی — تقریباً ۴۷ سانتی‌متر از فرق سر تا پاشنه. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en, WHO.en],
  },
  {
    week: 40,
    titleEn: 'Full term',
    titleFa: 'پرترم کامل',
    narrationEn:
      'Full term. In this schematic educational illustration, a small watermelon stands in for about 50 centimetres of curled-up baby. The chest is prominent, and the lungs — the last organ to mature — are ready to switch from fluid to air within the very first breaths. The placenta has been a tireless exchange organ and will keep supporting the transition after birth. Births anywhere between 37 and 42 weeks are considered term; your baby knows their own schedule.',
    narrationFa:
      'پرترم کامل. در این تصویر آموزشی شماتیک، یک هندوانه‌ی کوچک جای حدود ۵۰ سانتی‌متر نوزادِ جمع‌شده را می‌گیرد. قفسه‌ی سینه برجسته است و ریه‌ها — آخرین اندامی که می‌رسد — آماده‌اند در همان نخستین نفس‌ها از مایع به هوا سوئیچ کنند. جفت اندامی خستگی‌ناپذیر بوده و پس از تولد هم از گذار پشتیبانی خواهد کرد. زایمان در هر نقطه از ۳۷ تا ۴۲ هفته پرترم محسوب می‌شود؛ نوزاد شما برنامه‌ی خودش را می‌داند.',
    annotations: [
      {
        target: 'body',
        labelEn: 'Ready for air', labelFa: 'آماده‌ی هوا',
        textEn: 'Lungs are mature; the first breaths redirect circulation to the newborn pattern.',
        textFa: 'ریه‌ها بالغ‌اند؛ نخستین نفس‌ها گردش خون را به الگوی نوزادی تغییر می‌دهند.',
        citationEn: `${MOORE.en}, ch. 10`, citationFa: `${MOORE.fa}، فصل ۱۰`,
      },
      {
        target: 'head',
        labelEn: 'Term head', labelFa: 'سر در پرترم',
        textEn: 'About one quarter of body length now — the early disproportion has balanced out.',
        textFa: 'اکنون حدود یک‌چهارم طول بدن — عدم تعادل هفته‌های اولیه متعادل شده است.',
        citationEn: `${MOORE.en}, ch. 6`, citationFa: `${MOORE.fa}، فصل ۶`,
      },
      {
        target: 'limb',
        labelEn: 'Firm grasp', labelFa: 'چنگ محکم',
        textEn: 'Arms and legs are plump and strong, with a reliable grasp reflex.',
        textFa: 'دست و پا تپل و نیرومندند با رفلکس گرفتنِ مطمئن.',
        citationEn: NHS.en, citationFa: NHS.fa,
      },
      {
        target: 'cord',
        labelEn: 'Umbilical cord', labelFa: 'بند ناف',
        textEn: 'The cord remains active until delivery — typically 50–60 cm at term.',
        textFa: 'بند ناف تا لحظه‌ی زایمان فعال می‌ماند — در پرترم معمولاً ۵۰ تا ۶۰ سانتی‌متر.',
        citationEn: `${MOORE.en}, ch. 7`, citationFa: `${MOORE.fa}، فصل ۷`,
      },
      {
        target: 'placenta',
        labelEn: 'Placenta', labelFa: 'جفت',
        textEn: 'A term placenta weighs about a sixth of the baby and sustains them until birth.',
        textFa: 'جفتِ پرترم حدود یک‌ششم وزن نوزاد است و تا لحظه‌ی تولد از او پشتیبانی می‌کند.',
        citationEn: `${MOORE.en}, ch. 7`, citationFa: `${MOORE.fa}، فصل ۷`,
      },
    ],
    sizeComparisonEn: 'About the size of a small watermelon — roughly 50 cm crown to heel. Approximate.',
    sizeComparisonFa: 'حدود اندازه‌ی یک هندوانه‌ی کوچک — تقریباً ۵۰ سانتی‌متر از فرق سر تا پاشنه. اندازه تقریبی است.',
    sources: [MOORE.en, NHS.en, WHO.en],
  },
];

const BY_WEEK = new Map(STUDIO_STAGE_CONTENT.map((s) => [s.week, s]));

/**
 * Educational content for an arbitrary week 4–40: falls back to the largest
 * keyframe stage at or before the week (conservative embryology convention —
 * never describe structures that have not appeared yet).
 */
export function stageContentForWeek(week: number): StudioStageContent {
  const w = Math.min(Math.max(Math.floor(week), 4), 40);
  let best = STUDIO_STAGE_CONTENT[0];
  for (const s of STUDIO_STAGE_CONTENT) {
    if (s.week <= w) best = s;
  }
  return BY_WEEK.get(w) ?? best;
}

/**
 * Asset pipeline manifests (Wave 3.3).
 *
 * The PARAMETRIC entries are the demonstration renderer — they ship in this
 * build and are visually generated at runtime from STAGE_KEYFRAMES.
 *
 * The GLTF entry defines the authored-asset swap-in path: professionally
 * authored (Blender/sculpted) models are added here with geometryKind 'gltf'
 * and a gltfUrl AFTER clinical review. The sandbox build ships no glTF
 * geometry and the runtime loader is intentionally not wired — a glTF entry
 * in DRAFT is visible only in the review workspace, never rendered.
 */
export const STUDIO_ASSET_MANIFESTS: StudioAssetManifest[] = [
  ...STUDIO_STAGE_CONTENT.map(
    (s): StudioAssetManifest => ({
      assetId: `NIVA-FET-W${String(s.week).padStart(2, '0')}`,
      geometryKind: 'parametric',
      version: '1.0.0',
      reviewStatus: 'DEMONSTRATION',
      lodProfile: { low: 0.5, medium: 1, high: 2 },
    })
  ),
  {
    // Authored glTF swap-in example — defines the pipeline path only.
    // /studio-assets/example.glb is NOT shipped in this build; professional
    // assets drop in here after clinical review flips DRAFT → APPROVED.
    assetId: 'NIVA-GLTF-EXAMPLE-W20',
    geometryKind: 'gltf',
    gltfUrl: '/studio-assets/example.glb',
    version: '0.1.0',
    reviewStatus: 'DRAFT',
    lodProfile: { low: 0.5, medium: 1, high: 2 },
  },
];
