// NIVA Maternal Health Platform — Bilingual Nutrition Guide dataset (TASK 2-e)
// داده‌ی دوزبانه‌ی راهنمای تغذیه — دوره‌ی اقدام به بارداری (TRYING) و بارداری (PREGNANT).
// Educational content only — general public-health guidance, not a therapeutic diet; consult your doctor.
// صرفاً محتوای آموزشی — توصیه‌های عمومی سلامت، نه رژیم درمانی اختصاصی؛ برای موارد شخصی با پزشک مشورت کنید.

export interface NutritionGuideItem {
  fa: string;
  en: string;
  noteFa?: string; // optional short clarification
  noteEn?: string;
}

export interface NutritionGuideCategory {
  id: string; // stable slug e.g. 'trying-folate'
  stage: 'TRYING' | 'PREGNANT';
  trimester?: 1 | 2 | 3; // PREGNANT only — which trimester section shows it
  icon: string; // lucide icon name, one of: 'Leaf','Wheat','Beef','Fish','Apple','Egg','Milk','Droplets','Salad','Cherry','Nut','EggFried','Carrot','Soup','ShieldCheck','CircleAlert','Flame','Bean','Citrus'
  title: string; // فارسی
  titleEn: string;
  intro: string; // ۲ تا ۳ جمله فارسی
  introEn: string;
  items: NutritionGuideItem[]; // ۴ تا ۷ آیتم (غذاها/اصول) فارسی + انگلیسی
  cautionFa?: string; // هشدار ایمنی در صورت لزوم
  cautionEn?: string;
  medicalReference: string; // e.g. 'WHO — Healthy diet' / 'ACOG — Nutrition During Pregnancy'
  medicalReferenceUrl?: string;
  reviewedAt: string; // '2025-10-15'
}

const WHO_URL = 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet';
const ACOG_URL = 'https://www.acog.org/womens-health/faqs/nutrition-during-pregnancy';
const CDC_FOLATE_URL = 'https://www.cdc.gov/folic-acid/about/index.html';
const REVIEWED_AT = '2025-10-15';

export const NUTRITION_GUIDES: NutritionGuideCategory[] = [
  // ───────────────────────────────────────────────────────────────
  // TRYING — دوره‌ی اقدام به بارداری (۸ دسته)
  // ───────────────────────────────────────────────────────────────
  {
    id: 'trying-basics',
    stage: 'TRYING',
    icon: 'Salad',
    title: 'اصول تغذیه پیش از بارداری',
    titleEn: 'Preconception Nutrition Basics',
    intro:
      'تغذیه در دوره‌ی اقدام به بارداری، زمینه‌ساز سلامت شما و آینده‌ی فرزندتان است. الگوی غذایی متعادل که همه‌ی گروه‌های اصلی را پوشش دهد، بدن را برای یک بارداری سالم آماده می‌کند. نیازی به غذاهای خاص یا «برنامه‌ی ویژه» نیست؛ تعادل، تنوع و میزان مناسب کافی است.',
    introEn:
      "Nutrition while trying to conceive lays the groundwork for your health and your future baby's. A balanced pattern covering all main food groups prepares your body for a healthy pregnancy. No special foods or crash plans needed — just balance, variety and sensible portions.",
    items: [
      {
        fa: 'میوه و سبزیجات تازه — دست‌کم ۵ واحد در روز',
        en: 'Fresh fruits and vegetables — at least 5 servings a day',
        noteFa: 'رنگ‌های متنوع یعنی ریزمغذی‌های متنوع',
        noteEn: 'A variety of colors means a variety of micronutrients',
      },
      {
        fa: 'غلات کامل مانند نان سبوس‌دار و برنج قهوه‌ای',
        en: 'Whole grains such as whole-wheat bread and brown rice',
        noteFa: 'انرژی پایدارتر و فیبر بیشتر',
        noteEn: 'Steadier energy and more fiber',
      },
      {
        fa: 'حبوبات مانند عدس، لوبیا و نخود',
        en: 'Legumes such as lentils, beans and chickpeas',
        noteFa: 'منبع گیاهی پروتئین، آهن و فولات',
        noteEn: 'Plant-based source of protein, iron and folate',
      },
      {
        fa: 'لبنیات کم‌چرب پاستوریزه',
        en: 'Low-fat pasteurized dairy',
        noteFa: 'کلسیم و پروتئین باکیفیت',
        noteEn: 'Quality calcium and protein',
      },
      {
        fa: 'نوشیدن آب کافی در طول روز',
        en: 'Adequate water intake throughout the day',
        noteFa: 'حدود ۶ تا ۸ لیوان، بسته به فعالیت و آب‌وهوا',
        noteEn: 'Roughly 6–8 glasses, depending on activity and climate',
      },
      {
        fa: 'وعده‌های منظم بدون حذف وعده‌ی اصلی',
        en: 'Regular meals without skipping main meals',
        noteFa: 'نوسان قند خون و گرسنگی شدید را کم می‌کند',
        noteEn: 'Reduces blood-sugar swings and intense hunger',
      },
    ],
    medicalReference: 'WHO — Healthy diet',
    medicalReferenceUrl: WHO_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'trying-folate',
    stage: 'TRYING',
    icon: 'Leaf',
    title: 'مواد غذایی حاوی فولات',
    titleEn: 'Folate-Rich Foods',
    intro:
      'فولات (ویتامین B9) از نخستین روزهای بارداری در تشکیل لوله‌ی عصبی جنین نقش کلیدی دارد؛ به همین دلیل ساختن ذخیره‌ی آن باید پیش از بارداری شروع شود. سبزیجات برگ‌سبز، حبوبات و غلات غنی‌شده بهترین منابع غذایی‌اند. توصیه‌ی عمومی CDC مصرف ۴۰۰ میکروگرم اسید فولیک در روز از حداقل یک ماه پیش از بارداری است — دوز و زمان دقیق را با پزشک خود هماهنگ کنید.',
    introEn:
      "Folate (vitamin B9) plays a key role in the baby's neural-tube formation from the very first days of pregnancy, so building your stores should start before conception. Leafy greens, legumes and fortified grains are the best food sources. The CDC's general recommendation is 400 µg of folic acid daily from at least one month before pregnancy — confirm the exact dose and timing with your doctor.",
    items: [
      {
        fa: 'اسفناج تازه یا پخته',
        en: 'Fresh or cooked spinach',
        noteFa: 'پختن کوتاه، فولات را بهتر حفظ می‌کند',
        noteEn: 'Brief cooking helps preserve folate',
      },
      {
        fa: 'عدس پخته',
        en: 'Cooked lentils',
        noteFa: 'از غنی‌ترین منابع گیاهی فولات',
        noteEn: 'One of the richest plant sources of folate',
      },
      {
        fa: 'غلات صبحانه و نان غنی‌شده با اسید فولیک',
        en: 'Folic-acid-fortified cereals and breads',
        noteFa: 'برچسب محصول را برای «فولیک اسید» بررسی کنید',
        noteEn: "Check the label for 'folic acid'",
      },
      {
        fa: 'کلم بروکلی',
        en: 'Broccoli',
        noteFa: 'بخارپز کنید تا فولات بیشتری حفظ شود',
        noteEn: 'Steam it to retain more folate',
      },
      {
        fa: 'نخود',
        en: 'Chickpeas',
        noteFa: 'در سالاد، خوراک یا به‌صورت حمص',
        noteEn: 'Add to salads, stews or hummus',
      },
      {
        fa: 'آووکادو',
        en: 'Avocado',
        noteFa: 'فولات به‌همراه چربی مفید',
        noteEn: 'Folate plus healthy fat',
      },
      {
        fa: 'مارچوبه',
        en: 'Asparagus',
        noteFa: 'بخارپز، یکی از غنی‌ترین سبزیجات از نظر فولات',
        noteEn: 'Steamed, one of the richest vegetable sources',
      },
    ],
    cautionFa:
      'مکمل اسید فولیک جایگزین تغذیه‌ی سالم نیست؛ نوع، دوز و زمان شروع آن را حتماً با پزشک یا ماما تعیین کنید.',
    cautionEn:
      'A folic-acid supplement does not replace healthy eating; decide its type, dose and start date with your doctor or midwife.',
    medicalReference: 'CDC — Folic Acid',
    medicalReferenceUrl: CDC_FOLATE_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'trying-iron',
    stage: 'TRYING',
    icon: 'Beef',
    title: 'منابع آهن',
    titleEn: 'Iron Sources',
    intro:
      'آهن برای ساخت هموگلوبین و اکسیژن‌رسانی به همه‌ی سلول‌ها ضروری است و در بارداری نیاز بدن به آن چند برابر می‌شود. ذخیره‌ی خوب آهن پیش از بارداری، خطر کم‌خونی را کاهش می‌دهد. آهن «هم» در منابع حیوانی و آهن «غیرهم» در منابع گیاهی وجود دارد؛ همراه کردن آن‌ها با ویتامین C جذب را بهتر می‌کند.',
    introEn:
      "Iron is essential for making hemoglobin and delivering oxygen to every cell, and your body's need for it multiplies during pregnancy. Good iron stores before pregnancy lower the risk of anemia. 'Heme' iron comes from animal sources and 'non-heme' from plants; pairing them with vitamin C improves absorption.",
    items: [
      {
        fa: 'گوشت قرمز کم‌چرب پخته',
        en: 'Cooked lean red meat',
        noteFa: 'منبع آهن هم با جذب بالا',
        noteEn: 'A well-absorbed source of heme iron',
      },
      {
        fa: 'جگر — فقط گاه‌به‌گاه و مقدار کم',
        en: 'Liver — only occasionally and in small amounts',
        noteFa: 'غنی از آهن اما بسیار پُر از ویتامین A؛ در بارداری باید محدود شود',
        noteEn: 'Rich in iron but very high in vitamin A; limit during pregnancy',
      },
      {
        fa: 'عدس و لوبیا',
        en: 'Lentils and beans',
        noteFa: 'همراه آب‌لیمو یا فلفل دلمه‌ای بخورید تا جذب بهتر شود',
        noteEn: 'Pair with lemon juice or bell pepper for better absorption',
      },
      {
        fa: 'تخم‌مرغ',
        en: 'Eggs',
        noteFa: 'زرده حاوی آهن و کولین است',
        noteEn: 'The yolk provides iron and choline',
      },
      {
        fa: 'غلات صبحانه غنی‌شده با آهن',
        en: 'Iron-fortified breakfast cereals',
        noteFa: 'برچسب ارزش غذایی را بررسی کنید',
        noteEn: 'Check the nutrition label',
      },
      {
        fa: 'سبزیجات برگ‌سبز مانند اسفناج',
        en: 'Leafy greens such as spinach',
        noteFa: 'آهن غیرهم؛ با منبع ویتامین C جذب بهتری دارد',
        noteEn: 'Non-heme iron; vitamin C boosts absorption',
      },
    ],
    cautionFa:
      'اگر با آزمایش خون کم‌خونی تشخیص داده شد، مصرف مکمل آهن فقط با تشخیص و دوز پیشنهادی پزشک انجام شود.',
    cautionEn:
      "If blood tests show anemia, iron supplementation should only be taken on your doctor's diagnosis and recommended dose.",
    medicalReference: 'WHO — Healthy diet',
    medicalReferenceUrl: WHO_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'trying-protein',
    stage: 'TRYING',
    icon: 'Egg',
    title: 'منابع پروتئین',
    titleEn: 'Protein Sources',
    intro:
      'پروتئین، بلوک ساختاری همه‌ی بافت‌هاست و در دوره‌ی اقدام به بارداری برای سلامت عمومی و آماده‌سازی بدن اهمیت دارد. پخش کردن منابع پروتئین در طول روز — حیوانی و گیاهی — ساده‌ترین راه رسیدن به نیاز روزانه است. گزینه‌های کم‌چرب را انتخاب کنید.',
    introEn:
      'Protein is the building block of every tissue and matters before conception for overall health and preparing your body. Spreading protein sources across the day — animal and plant — is the easiest way to meet daily needs. Choose lean options.',
    items: [
      {
        fa: 'تخم‌مرغ کاملاً پخته',
        en: 'Fully cooked eggs',
        noteFa: 'پروتئین کامل به‌همراه کولین',
        noteEn: 'Complete protein plus choline',
      },
      {
        fa: 'مرغ یا بوقلمون کم‌چرب پخته',
        en: 'Cooked lean chicken or turkey',
        noteFa: 'پوست را حذف کنید تا چربی کمتر شود',
        noteEn: 'Remove the skin for less fat',
      },
      {
        fa: 'ماهی کم‌جیوه مانند سالمون',
        en: 'Low-mercury fish such as salmon',
        noteFa: 'هفته‌ای ۱ تا ۲ وعده؛ کاملاً پخته',
        noteEn: '1–2 servings a week; cook thoroughly',
      },
      {
        fa: 'حبوبات مانند عدس و لوبیا',
        en: 'Legumes such as lentils and beans',
        noteFa: 'پروتئین گیاهی همراه با فیبر',
        noteEn: 'Plant protein bundled with fiber',
      },
      {
        fa: 'لبنیات پاستوریزه مانند ماست و پنیر',
        en: 'Pasteurized dairy such as yogurt and cheese',
        noteFa: 'پروتئین و کلسیم در یک بسته',
        noteEn: 'Protein and calcium in one package',
      },
      {
        fa: 'آجیل و دانه‌ها',
        en: 'Nuts and seeds',
        noteFa: 'یک مشت کوچک در روز کافی است',
        noteEn: 'A small handful a day is enough',
      },
    ],
    medicalReference: 'ACOG — Nutrition During Pregnancy',
    medicalReferenceUrl: ACOG_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'trying-fats',
    stage: 'TRYING',
    icon: 'Nut',
    title: 'چربی‌های مفید',
    titleEn: 'Healthy Fats',
    intro:
      'چربی دشمن نیست؛ نوع درست آن مهم است. چربی‌های غیراشباع به تعادل هورمونی، جذب ویتامین‌های محلول در چربی و سلامت عمومی کمک می‌کنند. امگا-۳ (به‌ویژه DHA) نقش مهمی در تکامل مغز جنین دارد و ساختن ذخیره‌ی آن از قبل مفید است.',
    introEn:
      "Fat isn't the enemy — the right kind matters. Unsaturated fats support hormonal balance, absorption of fat-soluble vitamins and overall health. Omega-3s (especially DHA) play a key role in fetal brain development, so building stores early helps.",
    items: [
      {
        fa: 'گردو',
        en: 'Walnuts',
        noteFa: 'منبع گیاهی امگا-۳ (ALA)',
        noteEn: 'A plant source of omega-3 (ALA)',
      },
      {
        fa: 'ماهی چرب پخته مانند سالمون و ساردین',
        en: 'Cooked fatty fish such as salmon and sardines',
        noteFa: 'منبع مستقیم DHA؛ گونه‌های کم‌جیوه را انتخاب کنید',
        noteEn: 'A direct DHA source; choose low-mercury species',
      },
      {
        fa: 'روغن زیتون',
        en: 'Olive oil',
        noteFa: 'جایگزین روغن‌های جامد و سرخ‌کردنی',
        noteEn: 'Swap for solid or frying fats',
      },
      {
        fa: 'آووکادو',
        en: 'Avocado',
        noteFa: 'چربی مفید به‌همراه فولات',
        noteEn: 'Healthy fat plus folate',
      },
      {
        fa: 'دانه‌ی چیا و بذر کتان آسیاب‌شده',
        en: 'Chia seeds and ground flaxseed',
        noteFa: 'به ماست یا جو دوسر اضافه کنید',
        noteEn: 'Sprinkle over yogurt or oatmeal',
      },
      {
        fa: 'بادام و آجیل ترکیبی بدون نمک',
        en: 'Almonds and unsalted mixed nuts',
        noteFa: 'مقدار را کنترل کنید؛ کالری بالایی دارند',
        noteEn: 'Watch portions — they are calorie-dense',
      },
    ],
    medicalReference: 'WHO — Healthy diet',
    medicalReferenceUrl: WHO_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'trying-produce',
    stage: 'TRYING',
    icon: 'Apple',
    title: 'میوه‌ها و سبزیجات',
    titleEn: 'Fruits and Vegetables',
    intro:
      'میوه‌ها و سبزیجات منبع اصلی ویتامین‌ها، مواد معدنی، پتاسیم و فیبر هستند و آنتی‌اکسیدان‌های آن‌ها از سلول‌ها محافظت می‌کنند. تنوع رنگی، تنوع ریزمغذی می‌آورد. هدف روزانه: نیمی از بشقاب از میوه و سبزیجات.',
    introEn:
      'Fruits and vegetables are the main source of vitamins, minerals, potassium and fiber, and their antioxidants protect your cells. More colors mean more micronutrients. Daily goal: half your plate from produce.',
    items: [
      {
        fa: 'مرکبات مانند پرتقال و گریپ‌فروت',
        en: 'Citrus fruits such as oranges and grapefruit',
        noteFa: 'ویتامین C آن‌ها جذب آهن گیاهی را بهتر می‌کند',
        noteEn: 'Their vitamin C improves plant-iron absorption',
      },
      {
        fa: 'توت‌ها — توت‌فرنگی، بلوبری، فراوله',
        en: 'Berries — strawberries, blueberries, raspberries',
        noteFa: 'آنتی‌اکسیدان بالا و فیبر خوب',
        noteEn: 'High in antioxidants and fiber',
      },
      {
        fa: 'سبزیجات برگ‌سبز تیره',
        en: 'Dark leafy greens',
        noteFa: 'منبع فولات، آهن و ویتامین K',
        noteEn: 'A source of folate, iron and vitamin K',
      },
      {
        fa: 'هویج و کدو حلوایی',
        en: 'Carrots and butternut squash',
        noteFa: 'سرشار از بتاکاروتن (پیش‌ساز ویتامین A)',
        noteEn: 'Rich in beta-carotene (a vitamin A precursor)',
      },
      {
        fa: 'گوجه‌فرنگی و فلفل دلمه‌ای',
        en: 'Tomatoes and bell peppers',
        noteFa: 'پختن گوجه‌فرنگی مقدار لیکوپن را بیشتر می‌کند',
        noteEn: 'Cooking tomatoes boosts their lycopene',
      },
      {
        fa: 'موز و سیب با پوست',
        en: 'Bananas and apples with the skin on',
        noteFa: 'میان‌وعده‌ی ساده و قابل حمل',
        noteEn: 'Simple, portable snacks',
      },
    ],
    cautionFa:
      'میوه‌ها و سبزیجات را پیش از مصرف کاملاً بشویید تا خطر آلودگی با انگل‌ها و باکتری‌ها کاهش یابد.',
    cautionEn:
      'Wash fruits and vegetables thoroughly before eating to reduce the risk of contamination with parasites and bacteria.',
    medicalReference: 'WHO — Healthy diet',
    medicalReferenceUrl: WHO_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'trying-limit',
    stage: 'TRYING',
    icon: 'CircleAlert',
    title: 'مواد غذایی و نوشیدنی‌های نیازمند محدودیت',
    titleEn: 'Foods and Drinks to Limit',
    intro:
      'برخی مواد غذایی و نوشیدنی‌ها در دوره‌ی اقدام و به‌ویژه در بارداری نیازمند محدودیت یا حذف کامل هستند. این محدودیت‌ها توصیه‌های عمومی ایمنی‌اند، نه رژیم درمانی. درباره‌ی هر مورد خاص با پزشک خود مشورت کنید.',
    introEn:
      'Some foods and drinks call for limits or complete avoidance while trying to conceive and especially during pregnancy. These are general safety recommendations, not therapeutic diets. Discuss any specific case with your doctor.',
    items: [
      {
        fa: 'الکل — حذف کامل',
        en: 'Alcohol — avoid completely',
        noteFa: 'هیچ مقدار ایمن و شناخته‌شده‌ای برای الکل در بارداری وجود ندارد',
        noteEn: 'No known safe level of alcohol in pregnancy',
      },
      {
        fa: 'کافئین — حداکثر ۲۰۰ میلی‌گرم در روز',
        en: 'Caffeine — at most 200 mg per day',
        noteFa: 'جمع همه‌ی منابع (قهوه، چای، نوشابه‌ی کولا، شکلات) را حساب کنید',
        noteEn: 'Count all sources together (coffee, tea, cola, chocolate)',
      },
      {
        fa: 'نوشیدنی‌های شیرین و نوشابه‌های انرژی‌زا',
        en: 'Sugary and energy drinks',
        noteFa: 'کالری خالی؛ نوشابه‌های انرژی‌زا کافئین بالا و نامشخص دارند',
        noteEn: 'Empty calories; energy drinks add high, unclear caffeine',
      },
      {
        fa: 'ماهی‌های پرجیوه مانند کوسه و شمشیرماهی',
        en: 'High-mercury fish such as shark and swordfish',
        noteFa: 'جیوه برای سیستم عصبی در حال رشد مضر است',
        noteEn: 'Mercury can harm a developing nervous system',
      },
      {
        fa: 'گوشت‌های فرآوری‌شده مانند سوسیس و کالباس',
        en: 'Processed meats such as sausages and deli meats',
        noteFa: 'سدیم بالا و خطر آلودگی؛ مصرف را به حداقل برسانید',
        noteEn: 'High sodium and contamination risk; keep to a minimum',
      },
      {
        fa: 'روغن‌های سرخ‌کردنی تکراری و فست‌فود',
        en: 'Reused frying oils and fast food',
        noteFa: 'حاوی چربی ترانس و اکسیدشده',
        noteEn: 'Contain trans and oxidized fats',
      },
    ],
    cautionFa:
      'این فهرست توصیه‌ی عمومی است؛ شرایط خاص مانند سندرم تخمدان پلی‌کیستیک، دیابت یا حساسیت‌های غذایی نیازمند راهنمایی اختصاصی پزشک است.',
    cautionEn:
      'This list is general guidance; specific conditions such as PCOS, diabetes or food allergies need individualized medical advice.',
    medicalReference: 'ACOG — Nutrition During Pregnancy',
    medicalReferenceUrl: ACOG_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'trying-healthy',
    stage: 'TRYING',
    icon: 'ShieldCheck',
    title: 'اصول تغذیه‌ی سالم در دوره‌ی اقدام',
    titleEn: 'Healthy Eating Principles While Trying to Conceive',
    intro:
      'الگوی کلی غذا خوردن شما مهم‌تر از هر غذای «جادویی» است. تغذیه‌ی منظم، خواب کافی و مدیریت استرس با هم شانس یک بارداری سالم را بالا می‌برند. تغییرهای کوچک و پایدار بهتر از رژیم‌های سخت و کوتاه‌مدت‌اند.',
    introEn:
      "Your overall eating pattern matters more than any single 'magic' food. Regular meals, adequate sleep and stress management work together to support a healthy conception. Small sustainable changes beat strict short-lived diets.",
    items: [
      {
        fa: 'بشقاب متعادل: نیمی سبزیجات، یک‌چهارم پروتئین، یک‌چهارم غلات کامل',
        en: 'A balanced plate: half vegetables, a quarter protein, a quarter whole grains',
        noteFa: 'قاعده‌ای ساده بدون نیاز به شمارش کالری',
        noteEn: 'A simple rule — no calorie counting needed',
      },
      {
        fa: 'میان‌وعده‌های هدفمند مانند ماست و میوه',
        en: 'Planned snacks such as yogurt and fruit',
        noteFa: 'جلوی گرسنگی شدید و پرخوری را می‌گیرد',
        noteEn: 'Prevents extreme hunger and overeating',
      },
      {
        fa: 'آب کافی و حذف نوشیدنی‌های شیرین',
        en: 'Enough water and cutting out sugary drinks',
        noteFa: 'ساده‌ترین تغییر با بیشترین اثر',
        noteEn: 'The simplest change with the biggest impact',
      },
      {
        fa: 'خواندن برچسب مواد غذایی',
        en: 'Reading food labels',
        noteFa: 'به قند، سدیم و چربی اشباع نگاه کنید',
        noteEn: 'Look at sugar, sodium and saturated fat',
      },
      {
        fa: 'آشپزی در خانه بیشتر از غذا خوردن بیرون',
        en: 'Cooking at home more often than eating out',
        noteFa: 'کنترل کامل روی نمک، روغن و بهداشت',
        noteEn: 'Full control over salt, oil and hygiene',
      },
      {
        fa: 'پرهیز از رژیم‌های حذفی سخت‌گیرانه بدون نظر پزشک',
        en: 'Avoiding strict elimination diets without medical advice',
        noteFa: 'حذف کامل گروه‌های غذایی ممکن است ذخایر مغذی را کم کند',
        noteEn: 'Cutting whole food groups may deplete nutrient stores',
      },
    ],
    medicalReference: 'WHO — Healthy diet',
    medicalReferenceUrl: WHO_URL,
    reviewedAt: REVIEWED_AT,
  },

  // ───────────────────────────────────────────────────────────────
  // PREGNANT — بارداری (۱۰ دسته، نگاشت‌شده به سه‌ماهه‌ها)
  // ───────────────────────────────────────────────────────────────
  {
    id: 'preg-t1',
    stage: 'PREGNANT',
    trimester: 1,
    icon: 'Carrot',
    title: 'غذاهای مناسب سه‌ماهه‌ی اول',
    titleEn: 'First-Trimester Friendly Foods',
    intro:
      'در سه‌ماهه‌ی اول بدن تازه با بارداری کنار می‌آید و تهوع ممکن است اشتها را کم کند. در این دوره کیفیت مهم‌تر از «مقدار» است؛ نیاز انرژی هنوز تقریباً برابر قبل از بارداری است. وعده‌های کوچک و مکرر معمولاً راحت‌تر از وعده‌های بزرگ تحمل می‌شوند.',
    introEn:
      "In the first trimester your body is adjusting to pregnancy and nausea can dampen your appetite. Quality matters more than quantity here — energy needs are still roughly the same as before pregnancy. Small, frequent meals are usually easier to tolerate than large ones.",
    items: [
      {
        fa: 'بیسکویت ساده یا نان تست خشک — صبح، پیش از بلند شدن از تخت',
        en: 'Plain crackers or dry toast — in the morning before getting up',
        noteFa: 'راه‌حل کلاسیک برای تهوع صبحگاهی',
        noteEn: 'A classic remedy for morning nausea',
      },
      {
        fa: 'زنجبیل — چای زنجبیل رقیق یا آب‌نبات زنجبیلی',
        en: 'Ginger — diluted ginger tea or ginger candy',
        noteFa: 'شواهد علمی از اثر آن بر کاهش تهوع پشتیبانی می‌کند',
        noteEn: 'Evidence supports its effect on reducing nausea',
      },
      {
        fa: 'موز و میوه‌های ملایم',
        en: 'Bananas and mild fruits',
        noteFa: 'پتاسیم‌دار و قابل تحمل برای معده‌ی حساس',
        noteEn: 'Potassium plus gentle on a sensitive stomach',
      },
      {
        fa: 'ماست ساده‌ی پاستوریزه',
        en: 'Plain pasteurized yogurt',
        noteFa: 'پروتئین و پروبیوتیک، حتی وقتی اشتها کم است',
        noteEn: 'Protein and probiotics even with low appetite',
      },
      {
        fa: 'سبزیجات پخته‌ی ملایم مانند هویج',
        en: 'Mild cooked vegetables such as carrots',
        noteFa: 'پخته، سبک‌تر از خام هضم می‌شود',
        noteEn: 'Cooked is gentler to digest than raw',
      },
      {
        fa: 'آب و مایعات در جرعه‌های کوچک',
        en: 'Water and fluids in small sips',
        noteFa: 'بین وعده‌ها، نه هم‌زمان با غذا',
        noteEn: 'Between meals rather than with food',
      },
    ],
    cautionFa:
      'اگر تهوع و استفراغ مانع خوردن و نوشیدن عادی شود (بیش از چند بار در روز یا همراه با کاهش وزن محسوس)، حتماً به پزشک مراجعه کنید — ممکن است تهوع شدید بارداری (هایپرامزیس) باشد.',
    cautionEn:
      'If nausea and vomiting stop you from eating and drinking normally (more than a few times a day, or with noticeable weight loss), contact your doctor — it could be hyperemesis gravidarum.',
    medicalReference: 'ACOG — Nutrition During Pregnancy',
    medicalReferenceUrl: ACOG_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'preg-t2',
    stage: 'PREGNANT',
    trimester: 2,
    icon: 'Wheat',
    title: 'غذاهای مناسب سه‌ماهه‌ی دوم',
    titleEn: 'Second-Trimester Friendly Foods',
    intro:
      'سه‌ماهه‌ی دوم معمولاً «دوره‌ی طلایی» است؛ تهوع کم شده و اشتها برمی‌گردد. نیاز انرژی فقط حدود ۳۴۰ کیلوکالری در روز بیشتر می‌شود — یعنی کیفیت مهم‌تر از خوردن «برای دو نفر» است. حالا زمان تقویت آهن، کلسیم و پروتئین است.',
    introEn:
      "The second trimester is often the 'golden period' — nausea eases and appetite returns. Energy needs rise by only about 340 kcal a day, meaning quality beats 'eating for two.' Now is the time to focus on iron, calcium and protein.",
    items: [
      {
        fa: 'غلات کامل مانند نان سنگک، جو دوسر و برنج قهوه‌ای',
        en: 'Whole grains such as sangak bread, oats and brown rice',
        noteFa: 'انرژی پایدار به‌همراه فیبر برای یبوست',
        noteEn: 'Steady energy plus fiber for constipation',
      },
      {
        fa: 'لبنیات پاستوریزه — شیر، ماست، پنیر پاستوریزه',
        en: 'Pasteurized dairy — milk, yogurt, pasteurized cheese',
        noteFa: 'کلسیم برای استخوان‌های شما و جنین',
        noteEn: "Calcium for the baby's bones and yours",
      },
      {
        fa: 'تخم‌مرغ کاملاً پخته',
        en: 'Fully cooked eggs',
        noteFa: 'کولین برای رشد مغز جنین',
        noteEn: "Choline for the baby's brain development",
      },
      {
        fa: 'حبوبات — عدس، لوبیا چیتی، نخود',
        en: 'Legumes — lentils, kidney beans, chickpeas',
        noteFa: 'پروتئین گیاهی به‌همراه آهن و فولات',
        noteEn: 'Plant protein plus iron and folate',
      },
      {
        fa: 'ماهی کم‌جیوه‌ی پخته، هفته‌ای ۲ تا ۳ وعده',
        en: 'Cooked low-mercury fish 2–3 times a week',
        noteFa: 'DHA برای تکامل مغز و چشم جنین',
        noteEn: 'DHA for brain and eye development',
      },
      {
        fa: 'سبزیجات رنگارنگ تازه یا پخته',
        en: 'Colorful vegetables, fresh or cooked',
        noteFa: 'هر روز دست‌کم دو رنگ متفاوت',
        noteEn: 'At least two different colors every day',
      },
    ],
    medicalReference: 'ACOG — Nutrition During Pregnancy',
    medicalReferenceUrl: ACOG_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'preg-t3',
    stage: 'PREGNANT',
    trimester: 3,
    icon: 'Soup',
    title: 'غذاهای مناسب سه‌ماهه‌ی سوم',
    titleEn: 'Third-Trimester Friendly Foods',
    intro:
      'در سه‌ماهه‌ی سوم رشد جنین شتاب می‌گیرد و معنای «خوردن برای دو نفر» فقط حدود ۴۵۰ کیلوکالری اضافه در روز است. بزرگ شدن رحم، جا را کم می‌کند؛ وعده‌های کوچک و مکرر و غذاهای پُرمغذی بهترین گزینه‌اند. سوزش سر دل و یبوست شایع‌اند — غذاهای چرب و وعده‌های سنگین شب را کم کنید.',
    introEn:
      "In the third trimester fetal growth accelerates, and 'eating for two' really means only about 450 extra kcal a day. The growing uterus leaves less room — small, frequent, nutrient-dense meals work best. Heartburn and constipation are common, so cut back on heavy, fatty late-night meals.",
    items: [
      {
        fa: 'سوپ و خوراک‌های مغذی مانند سوپ عدس و آش حبوبات',
        en: 'Nourishing soups and stews such as lentil soup',
        noteFa: 'مغذی و سبک برای معده‌ی فشرده',
        noteEn: 'Nutritious yet gentle on a crowded stomach',
      },
      {
        fa: 'پروتئین کم‌چرب در هر وعده',
        en: 'Lean protein at every meal',
        noteFa: 'رشد سریع جنین در این دوره به پروتئین نیاز دارد',
        noteEn: 'Rapid fetal growth in this phase needs protein',
      },
      {
        fa: 'لبنیات کم‌چرب پاستوریزه',
        en: 'Low-fat pasteurized dairy',
        noteFa: 'استخوان‌سازی جنین ادامه دارد',
        noteEn: 'Fetal bone-building continues',
      },
      {
        fa: 'غلات کامل و جو دوسر',
        en: 'Whole grains and oats',
        noteFa: 'فیبر برای یبوست و انرژی پایدار',
        noteEn: 'Fiber for constipation and steady energy',
      },
      {
        fa: 'خوراک‌های آهندار همراه با ویتامین C',
        en: 'Iron-rich meals paired with vitamin C',
        noteFa: 'مثلاً عدس با آب‌لیمو یا گوجه‌فرنگی',
        noteEn: 'E.g. lentils with lemon juice or tomato',
      },
      {
        fa: 'مایعات کافی بین وعده‌ها',
        en: 'Enough fluids between meals',
        noteFa: 'به یبوست کمک می‌کند؛ هم‌زمان با غذا ننوشید',
        noteEn: 'Helps constipation; avoid drinking with meals',
      },
    ],
    medicalReference: 'ACOG — Nutrition During Pregnancy',
    medicalReferenceUrl: ACOG_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'preg-iron',
    stage: 'PREGNANT',
    trimester: 2,
    icon: 'Beef',
    title: 'منابع آهن در بارداری',
    titleEn: 'Iron Sources in Pregnancy',
    intro:
      'در بارداری حجم خون شما تقریباً ۵۰ درصد بیشتر می‌شود و نیاز به آهن تقریباً دو برابر است. کمبود آهن می‌تواند با خستگی، کم‌خونی و زایمان زودرس مرتبط باشد. آهن هم (حیوانی) بهتر جذب می‌شود؛ آهن گیاهی را با ویتامین C همراه کنید و هم‌زمان با غذا چای یا قهوه ننوشید.',
    introEn:
      'During pregnancy your blood volume rises by almost 50% and iron needs roughly double. Low iron is linked to fatigue, anemia and preterm birth. Heme (animal) iron is better absorbed; pair plant iron with vitamin C and skip tea or coffee with meals.',
    items: [
      {
        fa: 'گوشت قرمز کم‌چرب کاملاً پخته',
        en: 'Fully cooked lean red meat',
        noteFa: 'بهترین منبع آهن هم',
        noteEn: 'The best source of heme iron',
      },
      {
        fa: 'عدس پخته',
        en: 'Cooked lentils',
        noteFa: 'همراه ویتامین C جذب بهتری دارد',
        noteEn: 'Pair with vitamin C for better absorption',
      },
      {
        fa: 'لوبیا و نخود',
        en: 'Beans and chickpeas',
        noteFa: 'آهن، فیبر و پروتئین با هم',
        noteEn: 'Iron, fiber and protein together',
      },
      {
        fa: 'غلات غنی‌شده با آهن',
        en: 'Iron-fortified cereals',
        noteFa: 'برچسب را برای مقدار آهن بررسی کنید',
        noteEn: 'Check the label for iron content',
      },
      {
        fa: 'اسفناج و سبزیجات برگ‌سبز',
        en: 'Spinach and leafy greens',
        noteFa: 'با آب‌لیمو بخورید؛ بلافاصله بعد از آن چای ننوشید',
        noteEn: 'Have it with lemon juice; skip tea right after',
      },
      {
        fa: 'تخم‌مرغ کامل',
        en: 'Whole eggs',
        noteFa: 'زرده منبع آهن و کولین است',
        noteEn: 'The yolk carries iron and choline',
      },
    ],
    cautionFa:
      'مکمل آهن در بارداری معمولاً بر اساس آزمایش خون تجویز می‌شود — خودسرانه مصرف نکنید؛ دوز دقیق را پزشک تعیین می‌کند.',
    cautionEn:
      'Iron supplements in pregnancy are usually prescribed based on blood tests — do not self-dose; your doctor sets the exact amount.',
    medicalReference: 'ACOG — Nutrition During Pregnancy',
    medicalReferenceUrl: ACOG_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'preg-calcium',
    stage: 'PREGNANT',
    trimester: 2,
    icon: 'Milk',
    title: 'منابع کلسیم در بارداری',
    titleEn: 'Calcium Sources in Pregnancy',
    intro:
      'جنین در حال رشد برای استخوان‌سازی به کلسیم نیاز دارد و اگر دریافت شما کافی نباشد، نیازش را از استخوان‌های شما تأمین می‌کند. دریافت کافی کلسیم برای سلامت استخوان مادر و جنین هر دو مهم است. منابع را در طول روز پخش کنید، چون بدن در هر بار مقدار محدودی جذب می‌کند.',
    introEn:
      "Your growing baby needs calcium for building bones — and if your intake falls short, the baby takes it from yours. Adequate calcium in pregnancy protects both your bones and the baby's. Spread sources through the day, since the body absorbs only so much at a time.",
    items: [
      {
        fa: 'شیر پاستوریزه',
        en: 'Pasteurized milk',
        noteFa: 'یک لیوان، بخش قابل توجهی از نیاز روزانه را پوشش می‌دهد',
        noteEn: 'One glass covers a good share of daily needs',
      },
      {
        fa: 'ماست پاستوریزه',
        en: 'Pasteurized yogurt',
        noteFa: 'کلسیم به‌همراه پروبیوتیک برای گوارش',
        noteEn: 'Calcium plus probiotics for digestion',
      },
      {
        fa: 'پنیرهای پاستوریزه',
        en: 'Pasteurized cheeses',
        noteFa: 'پنیرهای نرم غیرپاستوریزه در بارداری ممنوع است',
        noteEn: 'Soft unpasteurized cheeses are off-limits in pregnancy',
      },
      {
        fa: 'کنجد و ارده (طحینه)',
        en: 'Sesame seeds and tahini',
        noteFa: 'منبع گیاهی خوب کلسیم',
        noteEn: 'A good plant source of calcium',
      },
      {
        fa: 'بادام',
        en: 'Almonds',
        noteFa: 'میان‌وعده‌ی کلسیم‌دار؛ به تعداد کم',
        noteEn: 'A calcium-rich snack in small amounts',
      },
      {
        fa: 'شیر سویا یا آب‌پرتقال غنی‌شده با کلسیم',
        en: 'Calcium-fortified soy milk or orange juice',
        noteFa: 'برای کسانی که لبنیات مصرف نمی‌کنند',
        noteEn: 'For those who avoid dairy',
      },
    ],
    cautionFa:
      'جذب کلسیم به ویتامین D هم نیاز دارد؛ سبزیجاتی مانند اسفناج کلسیم دارند اما اگزالات بالا جذب را محدود می‌کند — لبنیات و محصولات غنی‌شده جذب بالاتری دارند.',
    cautionEn:
      'Calcium absorption also needs vitamin D; greens like spinach contain calcium but their oxalates limit absorption — dairy and fortified products are better absorbed.',
    medicalReference: 'ACOG — Nutrition During Pregnancy',
    medicalReferenceUrl: ACOG_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'preg-protein',
    stage: 'PREGNANT',
    trimester: 2,
    icon: 'Egg',
    title: 'منابع پروتئین در بارداری',
    titleEn: 'Protein Sources in Pregnancy',
    intro:
      'پروتئین، ماده‌ی اصلی رشد بافت‌های جنین، جفت و افزایش خون شماست. در نیمه‌ی دوم بارداری نیاز روزانه به‌طور محسوس بالاتر می‌رود. ترکیب منابع حیوانی و گیاهی، هم پروتئین کامل می‌دهد و هم تنوع ریزمغذی.',
    introEn:
      "Protein is the raw material for the baby's tissues, the placenta and your expanding blood supply. Daily needs rise noticeably in the second half of pregnancy. Mixing animal and plant sources gives you complete protein plus micronutrient variety.",
    items: [
      {
        fa: 'تخم‌مرغ کاملاً پخته (سفیده و زرده)',
        en: 'Fully cooked eggs (white and yolk)',
        noteFa: 'تخم‌مرغ نیم‌پز در بارداری هرگز',
        noteEn: 'Never runny eggs during pregnancy',
      },
      {
        fa: 'مرغ و بوقلمون پخته بدون پوست',
        en: 'Cooked, skinless poultry',
        noteFa: 'پروتئین کم‌چرب با جذب بالا',
        noteEn: 'Lean, well-absorbed protein',
      },
      {
        fa: 'ماهی کم‌جیوه کاملاً پخته',
        en: 'Fully cooked low-mercury fish',
        noteFa: 'مثل سالمون، ساردین و قزل‌آلا',
        noteEn: 'Such as salmon, sardines and trout',
      },
      {
        fa: 'عدس و سایر حبوبات',
        en: 'Lentils and other legumes',
        noteFa: 'پروتئین گیاهی به‌همراه فیبر',
        noteEn: 'Plant protein plus fiber',
      },
      {
        fa: 'ماست و شیر پاستوریزه',
        en: 'Pasteurized yogurt and milk',
        noteFa: 'پروتئین همراه کلسیم',
        noteEn: 'Protein bundled with calcium',
      },
      {
        fa: 'آجیل و کره‌ی بادام‌زمینی طبیعی',
        en: 'Nuts and natural peanut butter',
        noteFa: 'پروتئین گیاهی فشرده؛ مقدار کم کافی است',
        noteEn: 'Concentrated plant protein; a little goes far',
      },
    ],
    medicalReference: 'ACOG — Nutrition During Pregnancy',
    medicalReferenceUrl: ACOG_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'preg-folate',
    stage: 'PREGNANT',
    trimester: 1,
    icon: 'Leaf',
    title: 'منابع فولات در بارداری',
    titleEn: 'Folate Sources in Pregnancy',
    intro:
      'فولات در سه‌ماهه‌ی اول بیشترین اهمیت را دارد، چون لوله‌ی عصبی جنین در هفته‌های نخست شکل می‌گیرد — گاهی پیش از آنکه بارداری مشخص شود. در کنار مکمل اسید فولیک طبق توصیه‌ی پزشک، منابع غذایی غنی از فولات را در برنامه‌ی روزانه بگنجانید.',
    introEn:
      "Folate matters most in the first trimester, when the baby's neural tube forms — sometimes before the pregnancy is even known. Alongside a folic-acid supplement as advised by your doctor, make folate-rich foods part of your daily routine.",
    items: [
      {
        fa: 'اسفناج و برگ‌چغندر (سبزی‌های برگ‌سبز تیره)',
        en: 'Spinach and chard (dark leafy greens)',
        noteFa: 'پخت کوتاه یا خام، هر دو مفیدند',
        noteEn: 'Lightly cooked or raw — both count',
      },
      {
        fa: 'عدس پخته',
        en: 'Cooked lentils',
        noteFa: 'یک پیمانه، بخش بزرگی از نیاز روزانه را می‌پوشاند',
        noteEn: 'One cup covers a large share of daily needs',
      },
      {
        fa: 'آووکادو',
        en: 'Avocado',
        noteFa: 'فولات به‌همراه چربی مفید',
        noteEn: 'Folate plus healthy fat',
      },
      {
        fa: 'مارچوبه‌ی بخارپز',
        en: 'Steamed asparagus',
        noteFa: 'از غنی‌ترین سبزیجات از نظر فولات',
        noteEn: 'One of the richest vegetable sources of folate',
      },
      {
        fa: 'پرتقال و آب‌پرتقال تازه',
        en: 'Oranges and fresh orange juice',
        noteFa: 'فولات طبیعی به‌همراه ویتامین C',
        noteEn: 'Natural folate plus vitamin C',
      },
      {
        fa: 'نان و غلات غنی‌شده',
        en: 'Fortified breads and cereals',
        noteFa: 'اسید فولیک افزوده با جذب خوب',
        noteEn: 'Added folic acid, well absorbed',
      },
    ],
    medicalReference: 'CDC — Folic Acid',
    medicalReferenceUrl: CDC_FOLATE_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'preg-fiber',
    stage: 'PREGNANT',
    trimester: 2,
    icon: 'Bean',
    title: 'منابع فیبر در بارداری',
    titleEn: 'Fiber Sources in Pregnancy',
    intro:
      'فیبر بهترین دوست روده‌های باردار است؛ یبوست یکی از شایع‌ترین ناراحتی‌های بارداری است و فیبر کافی به‌همراه آب کافی به‌طور مشخص آن را کم می‌کند. فیبر همچنین به پایداری قند خون و کنترل کلسترول کمک می‌کند. افزایش فیبر را تدریجی انجام دهید.',
    introEn:
      "Fiber is a pregnant gut's best friend — constipation is one of the most common pregnancy complaints, and enough fiber with plenty of water clearly eases it. Fiber also steadies blood sugar and supports cholesterol control. Increase it gradually.",
    items: [
      {
        fa: 'جو دوسر (اوتمیل)',
        en: 'Oatmeal',
        noteFa: 'فیبر محلول؛ صبحانه‌ای آرام‌بخش برای گوارش',
        noteEn: 'Soluble fiber; a gentle breakfast for digestion',
      },
      {
        fa: 'حبوبات — عدس، لوبیا، نخود',
        en: 'Legumes — lentils, beans, chickpeas',
        noteFa: 'فیبر بالا به‌همراه پروتئین؛ تدریجی اضافه کنید',
        noteEn: 'High fiber plus protein; add gradually',
      },
      {
        fa: 'نان سبوس‌دار و غلات کامل',
        en: 'Whole-wheat bread and whole grains',
        noteFa: 'سبوس، حرکت روده را فعال نگه می‌دارد',
        noteEn: 'Bran keeps the gut moving',
      },
      {
        fa: 'آلو و آب آلو',
        en: 'Prunes and prune juice',
        noteFa: 'ملین طبیعی شناخته‌شده',
        noteEn: 'A well-known natural laxative',
      },
      {
        fa: 'میوه‌ها با پوست — سیب، گلابی، کیوی',
        en: 'Fruits with the skin on — apple, pear, kiwi',
        noteFa: 'پوستِ شسته‌شده همان‌جاست که فیبر است',
        noteEn: 'The washed skin is where the fiber lives',
      },
      {
        fa: 'سبزیجات خام و پخته',
        en: 'Raw and cooked vegetables',
        noteFa: 'در هر وعده یک سهم سبزی',
        noteEn: 'One serving of vegetables with each meal',
      },
    ],
    cautionFa:
      'فیبر بدون آب نتیجه‌ی عکس می‌دهد؛ در روز آب کافی بنوشید. افزایش ناگهانی فیبر ممکن است نفخ ایجاد کند.',
    cautionEn:
      'Fiber without water can backfire — drink enough fluids daily. A sudden fiber increase may cause bloating.',
    medicalReference: 'WHO — Healthy diet',
    medicalReferenceUrl: WHO_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'preg-discomfort',
    stage: 'PREGNANT',
    trimester: 1,
    icon: 'Citrus',
    title: 'غذاهای مناسب در تهوع و یبوست',
    titleEn: 'Foods for Nausea and Constipation',
    intro:
      'تهوع صبحگاهی و یبوست دو ناراحتی شایع و معمولاً خوش‌خیم بارداری‌اند که تغذیه می‌تواند کمی آرامشان کند. برای تهوع: وعده‌های کوچک، غذاهای کم‌بو و کم‌چرب و زنجبیل. برای یبوست: فیبر، آب کافی و حرکت. اگر نشانه‌ها شدید است، با پزشک صحبت کنید.',
    introEn:
      'Morning nausea and constipation are two common, usually harmless pregnancy discomforts that diet can gently ease. For nausea: small meals, low-odor low-fat foods and ginger. For constipation: fiber, enough fluids and movement. Speak to your doctor if symptoms are severe.',
    items: [
      {
        fa: 'زنجبیل — چای رقیق یا فراورده‌های خانگی زنجبیل',
        en: 'Ginger — weak tea or homemade ginger preparations',
        noteFa: 'برای تهوع؛ جرعه‌جرعه در طول روز',
        noteEn: 'For nausea; sip throughout the day',
      },
      {
        fa: 'لیمو ترش — آب‌لیمو در آب یا حتی بوییدن لیموی تازه',
        en: 'Lemon — lemon water or simply smelling a fresh lemon',
        noteFa: 'بوی لیمو برای برخی افراد تهوع را کم می‌کند',
        noteEn: 'The scent alone eases nausea for some people',
      },
      {
        fa: 'بیسکویت یا نان خشک ساده',
        en: 'Plain crackers or dry bread',
        noteFa: 'چند عدد پیش از بلند شدن از تخت',
        noteEn: 'A few before getting out of bed',
      },
      {
        fa: 'آلو و کیوی',
        en: 'Prunes and kiwi',
        noteFa: 'برای یبوست؛ همراه آب کافی',
        noteEn: 'For constipation; with plenty of water',
      },
      {
        fa: 'ماست و غذاهای پروبیوتیک',
        en: 'Yogurt and probiotic foods',
        noteFa: 'به تعادل میکروبیوم روده کمک می‌کند',
        noteEn: 'Supports gut microbiome balance',
      },
      {
        fa: 'سوپ‌ها و نوشیدنی‌های رقیق',
        en: 'Broths and diluted drinks',
        noteFa: 'مایعات، وقتی خوردن غذای جامد سخت است',
        noteEn: 'Fluids when solid food is hard to keep down',
      },
    ],
    cautionFa:
      'استفراغ شدید یا مداوم، ناتوانی در حفظ مایعات یا کاهش وزن، نشانه‌ی تهوع شدید بارداری است و نیاز به بررسی پزشکی فوری دارد.',
    cautionEn:
      'Severe or persistent vomiting, inability to keep fluids down, or weight loss are signs of hyperemesis gravidarum and need prompt medical review.',
    medicalReference: 'ACOG — Nutrition During Pregnancy',
    medicalReferenceUrl: ACOG_URL,
    reviewedAt: REVIEWED_AT,
  },
  {
    id: 'preg-avoid',
    stage: 'PREGNANT',
    icon: 'CircleAlert',
    title: 'غذاهای نیازمند محدودیت یا پرهیز و نکات بهداشت و ایمنی',
    titleEn: 'Foods to Limit or Avoid, plus Hygiene and Safety',
    intro:
      'برخی غذاها و نوشیدنی‌ها در بارداری به‌دلیل خطر آلودگی (مانند لیستریوز و توکسوپلاسموز) یا مواد مضر (الکل، جیوه، کافئین زیاد) باید حذف یا محدود شوند. این فهرست توصیه‌ی عمومی ایمنی است؛ موارد اختصاصی را با پزشک خود بررسی کنید.',
    introEn:
      'Some foods and drinks should be avoided or limited in pregnancy because of contamination risks (such as listeriosis and toxoplasmosis) or harmful substances (alcohol, mercury, excess caffeine). This is general safety guidance — review your personal situation with your doctor.',
    items: [
      {
        fa: 'الکل — پرهیز کامل در تمام دوران بارداری',
        en: 'Alcohol — completely avoided throughout pregnancy',
        noteFa: 'هیچ مقدار ایمنی برای جنین شناخته نشده است',
        noteEn: 'No safe amount for the fetus is known',
      },
      {
        fa: 'کافئین — حداکثر ۲۰۰ میلی‌گرم در روز',
        en: 'Caffeine — at most 200 mg per day',
        noteFa: 'قهوه، چای، نوشابه‌ی کولا و شکلات را با هم جمع بزنید',
        noteEn: 'Count coffee, tea, cola and chocolate together',
      },
      {
        fa: 'گوشت و ماهی خام یا نیم‌پز — سوشی خام، استیک آبدار، کارپاچو',
        en: 'Raw or undercooked meat and fish — raw sushi, rare steak, carpaccio',
        noteFa: 'خطر توکسوپلاسموز و باکتری‌های مضر',
        noteEn: 'Risk of toxoplasmosis and harmful bacteria',
      },
      {
        fa: 'پنیرهای نرم غیرپاستوریزه — بری، کاممبر، فتای سنتی',
        en: 'Soft unpasteurized cheeses — brie, camembert, traditional feta',
        noteFa: 'خطر لیستریا؛ پاستوریزه بودن را روی برچسب چک کنید',
        noteEn: 'Listeria risk; always check the label for pasteurization',
      },
      {
        fa: 'ماهی‌های پرجیوه — کوسه، شمشیرماهی، ماهی خال‌خالی پادشاه، تیله‌ماهی',
        en: 'High-mercury fish — shark, swordfish, king mackerel, tilefish',
        noteFa: 'جیوه به مغز و سیستم عصبی جنین آسیب می‌زند',
        noteEn: "Mercury harms the baby's brain and nervous system",
      },
      {
        fa: 'تخم‌مرغ خام و محصولات حاوی آن — خمیر کوکی، مایونز خانگی، سس هولندیز',
        en: 'Raw eggs and foods containing them — cookie dough, homemade mayonnaise, hollandaise',
        noteFa: 'خطر سالمونلا؛ فقط فراورده‌های پاستوریزه',
        noteEn: 'Salmonella risk; pasteurized products only',
      },
      {
        fa: 'شیر غیرپاستوریزه و آب‌میوه‌ی تازه‌ی غیرپاستوریزه',
        en: 'Unpasteurized milk and fresh unpasteurized juice',
        noteFa: 'خطر باکتری‌های لیستریا و ای‌کولای',
        noteEn: 'Risk of listeria and E. coli bacteria',
      },
    ],
    cautionFa:
      'توصیه‌های عمومی این بخش جایگزین رژیم درمانی اختصاصی برای دیابت بارداری، کم‌خونی، حساسیت‌های غذایی یا بیماری‌های زمینه‌ای نیست — برنامه‌ی غذایی خود را با پزشک هماهنگ کنید. در صورت مشکوک بودن به مسمومیت غذایی، فوراً به پزشک مراجعه کنید.',
    cautionEn:
      'The general advice in this section does not replace a therapeutic diet for gestational diabetes, anemia, food allergies or underlying conditions — coordinate your meal plan with your doctor. If you suspect food poisoning, seek medical care immediately.',
    medicalReference: 'ACOG — Nutrition During Pregnancy',
    medicalReferenceUrl: ACOG_URL,
    reviewedAt: REVIEWED_AT,
  },
];
