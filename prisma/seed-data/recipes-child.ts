// NIVA — Task 2-c: Seed data for recipes — غذای کودک (CHILD، ۶ تا ۲۴ ماه)
// Persian text is primary; English is a natural equivalent. Educational only — no diagnostic claims.
//
// قوانین ایمنی رعایت‌شده در همه دستورها:
//  - هیچ‌جا عسل به‌عنوان ماده اولیه استفاده نشده و برای کودکان زیر ۱۲ ماه در خطوط ایمنی تکرار می‌شود.
//  - هیچ نمک و شکر اضافه‌ای در هیچ دستوری نیست و در خطوط ایمنی هر دستور ذکر می‌شود.
//  - شیر گاو تا ۱۲ ماهگی نوشیدنی اصلی نیست؛ در فرنی ۶-۸ ماه با شیر مادر/شیر خشک آماده می‌شود.
//  - تخم‌مرغ، گوشت، مرغ و ماهی همیشه کاملاً پخته؛ ماهی فقط کم‌جیوه و دو بار استخوان‌گیری.
//  - بافت متناسب با سن (پوره کامل برای ۶-۸ ماه)، خطرات خفگی (انگور چهارقسمت، ممنوعیت آجیل و دانه کامل).
//  - خنک‌کردن تا دمای بدن و نظارت همیشگی بزرگ‌تر؛ باقی‌مانده حداکثر ۲۴ ساعت یخچال و فقط یک‌بار گرم‌کردن.
//
// IMAGE PATHS: only the pre-registered /images/recipes/*.jpg paths (reuse allowed and expected).
// medicalSource: 'WHO — Complementary feeding guideline (2023)' or 'AAP — ...' + real URL.

export interface SeedRecipe {
  slug: string;
  audience: 'CHILD';                        // always 'CHILD' in this file
  ageGroup: '6_8' | '9_11' | '12_15' | '16_18' | '19_24';
  ageFromDays: number;                      // 6_8→183, 9_11→274, 12_15→365, 16_18→487, 19_24→578
  ageToDays: number;                        // 6_8→273, 9_11→364, 12_15→486, 16_18→577, 19_24→730
  category: string;   // 'puree' | 'porridge' | 'soup' | 'lunch' | 'dinner' | 'breakfast' | 'snack' | 'protein' | 'iron' | 'finger'
  mealTypes: Array<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>;
  title: string;      // فارسی
  titleEn: string;
  image: string;      // exact pre-registered path
  ingredients: Array<{ fa: string; en: string; amount: string }>;
  steps: Array<{ fa: string; en: string }>;   // 4-7 concrete, age-safe steps
  prepMinutes: number;
  cookMinutes: number;
  servings: string;   // e.g. '۱ وعده کودک'
  textureFa: string;
  textureEn: string;
  allergens: string[]; // subset of: 'EGG','MILK','GLUTEN','NUTS','PEANUT','FISH','SOY','SESAME' — [] when none. NEVER 'HONEY'.
  safety: Array<{ fa: string; en: string }>;   // 2-3 warnings per recipe
  storageFa?: string;  // نگهداری و گرم‌کردن مجدد
  storageEn?: string;
  substitutions: Array<{ fa: string; en: string }>;
  nutrition?: { kcal?: number; proteinG?: number; ironMg?: number; calciumMg?: number; fiberG?: number };
  medicalSource: string;
  sourceUrl?: string;
  reviewedAt: string;     // '2025-10-15'
}

export const SEED_RECIPES_CHILD: SeedRecipe[] = [

  // ════════════════════════════════════════════════════════════════════
  // سن ۶ تا ۸ ماه (183 تا 273 روز) — همه کاملاً پوره، بدون هیچ تکه‌ای
  // ════════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────────
  // ۱) پوره کدوحلوایی — puree
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'pumpkin-puree',
    audience: 'CHILD',
    ageGroup: '6_8',
    ageFromDays: 183,
    ageToDays: 273,
    category: 'puree',
    mealTypes: ['BREAKFAST', 'SNACK'],
    title: 'پوره کدوحلوایی',
    titleEn: 'Pumpkin Purée',
    image: '/images/recipes/puree-pumpkin.jpg',
    ingredients: [
      { fa: 'کدوحلوایی', en: 'Butternut squash / pumpkin', amount: '۲۰۰ گرم' },
      { fa: 'شیر مادر یا شیر خشک آماده‌شده (برای رقیق‌کردن)', en: 'Breast milk or prepared formula (to thin)', amount: '۱ تا ۲ قاشق غذاخوری (اختیاری)' },
    ],
    steps: [
      { fa: 'کدوحلوایی را پوست بکنید، تخمه‌ها را جدا کنید و گوشت آن را به مکعب‌های کوچک برش بزنید.', en: 'Peel the squash, remove the seeds and cut the flesh into small cubes.' },
      { fa: 'مکعب‌ها را با دو سه قاشق آب در قابلمه روی حرارت ملایم ۱۵ دقیقه بپزید تا با چنگال کاملاً له شود.', en: 'Simmer the cubes with 2-3 spoons of water for 15 minutes until completely fork-tender.' },
      { fa: 'از روی حرارت بردارید و بگذارید کمی خنک شود، سپس با گوشت‌کوب یا بلندر تا بافت کاملاً یکنواخت پوره کنید.', en: 'Take off the heat, let cool briefly, then mash or blend until perfectly uniform.' },
      { fa: 'اگر پوره غلیظ است، قاشق‌قاشق شیر مادر یا شیر خشک اضافه کنید تا بافتی شبیه خمیر ماست پیدا کند.', en: 'If thick, thin spoon by spoon with breast milk or formula to a yogurt-like consistency.' },
      { fa: 'تا دمای بدن خنک کنید و با قاشق نرم به کودک بدهید؛ بار اول با یک تا دو قاشق شروع کنید.', en: 'Cool to body temperature and feed with a soft spoon; start with just one or two spoonfuls the first time.' },
    ],
    prepMinutes: 10,
    cookMinutes: 15,
    servings: '۱ وعده کودک',
    textureFa: 'پوره بسیار نرم و روان، کاملاً بدون تکه',
    textureEn: 'Very smooth, runny purée with no lumps at all',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه به‌هیچ‌وجه مجاز نیست (خطر بوتولیسم نوزادی).', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months of age (infant botulism risk).' },
      { fa: 'بافت باید کاملاً صاف و بدون تکه باشد؛ حتی تکه‌های کوچک در این سن خطر خفگی دارند.', en: 'The texture must be perfectly smooth with no lumps; even small lumps are a choking hazard at this age.' },
      { fa: 'غذا را تا دمای بدن خنک کنید (چند قطره روی مچ دست) و همیشه در حضور بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool the food to body temperature (test a drop on your wrist) and always feed under adult supervision.' },
    ],
    storageFa: 'در ظرف دربسته حداکثر ۲۴ ساعت در یخچال نگه دارید؛ فقط یک‌بار گرم کنید و باقی‌مانده غذای گرم‌شده را دور بریزید. پوره اضافی را می‌توانید در قالب یخ تا ۱ ماه فریزر کنید.',
    storageEn: 'Refrigerate covered up to 24 hours; reheat once only and discard any leftover of the reheated portion. Extra purée can be frozen in an ice-cube tray up to 1 month.',
    substitutions: [
      { fa: 'کدو سبز آب‌پز به جای کدوحلوایی', en: 'Steamed zucchini instead of pumpkin' },
      { fa: 'هویج آب‌پز به جای کدوحلوایی', en: 'Cooked carrot instead of pumpkin' },
    ],
    nutrition: { kcal: 45, proteinG: 1, fiberG: 1.5 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۲) پوره سیب‌زمینی شیرین — puree
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'sweet-potato-puree',
    audience: 'CHILD',
    ageGroup: '6_8',
    ageFromDays: 183,
    ageToDays: 273,
    category: 'puree',
    mealTypes: ['LUNCH'],
    title: 'پوره سیب‌زمینی شیرین',
    titleEn: 'Sweet Potato Purée',
    image: '/images/recipes/puree-sweet-potato.jpg',
    ingredients: [
      { fa: 'سیب‌زمینی شیرین', en: 'Sweet potato', amount: '۲۰۰ گرم (۱ عدد متوسط)' },
      { fa: 'شیر مادر یا شیر خشک آماده‌شده', en: 'Breast milk or prepared formula', amount: '۱ تا ۲ قاشق غذاخوری (اختیاری)' },
    ],
    steps: [
      { fa: 'سیب‌زمینی شیرین را بشویید، پوست بکنید و به مکعب‌های کوچک برش بزنید.', en: 'Wash, peel and cut the sweet potato into small cubes.' },
      { fa: 'در بخارپز یا با دو سه قاشق آب ۲۰ دقیقه بپزید تا با چنگال کاملاً له شود.', en: 'Steam or simmer with a little water for 20 minutes until completely fork-tender.' },
      { fa: 'کمی خنک کنید و با گوشت‌کوب یا بلندر تا بافت کاملاً صاف پوره کنید.', en: 'Cool briefly, then mash or blend until perfectly smooth.' },
      { fa: 'در صورت نیاز با شیر مادر یا شیر خشک رقیق کنید تا بافت خمیری و قابل ریختن از قاشق شود.', en: 'Thin with breast milk or formula if needed, to a soft spoonable mash.' },
      { fa: 'تا دمای بدن خنک کنید و با قاشق به کودک بدهید.', en: 'Cool to body temperature and feed with a spoon.' },
    ],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: '۱ وعده کودک',
    textureFa: 'پوره نرم و خمیری، کاملاً بدون تکه',
    textureEn: 'Soft, creamy purée with no lumps',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک، شکر، کره یا عسل اضافه نکنید؛ شیرینی طبیعی سیب‌زمینی شیرین برای کودک کافی است و عسل زیر ۱۲ ماه مطلقاً ممنوع است.', en: 'Add no salt, sugar, butter or honey; the natural sweetness is enough, and honey is strictly prohibited under 12 months.' },
      { fa: 'پوره باید کاملاً یکنواخت و بدون تکه باشد؛ رشته یا تکه‌های نیم‌پز خطر خفگی دارند.', en: 'The purée must be perfectly uniform; strings or half-cooked bits are a choking hazard.' },
      { fa: 'غذا را تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'در ظرف دربسته حداکثر ۲۴ ساعت در یخچال؛ فقط یک‌بار گرم کنید. پوره اضافی را در قالب یخ تا ۱ ماه فریزر کنید.',
    storageEn: 'Refrigerate covered up to 24 hours; reheat once only. Freeze extra purée in an ice-cube tray up to 1 month.',
    substitutions: [
      { fa: 'کدوحلوایی پخته به جای سیب‌زمینی شیرین', en: 'Cooked pumpkin instead of sweet potato' },
      { fa: 'هویج آب‌پز به جای سیب‌زمینی شیرین', en: 'Boiled carrot instead of sweet potato' },
      { fa: 'موز رسیده له‌شده (بدون پخت)', en: 'Mashed ripe banana (no cooking needed)' },
    ],
    nutrition: { kcal: 70, proteinG: 1, fiberG: 2 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۳) پوره عدس کاملاً پخته — iron
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'lentil-puree',
    audience: 'CHILD',
    ageGroup: '6_8',
    ageFromDays: 183,
    ageToDays: 273,
    category: 'iron',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'پوره عدس کاملاً پخته',
    titleEn: 'Fully Cooked Lentil Purée',
    image: '/images/recipes/puree-lentil.jpg',
    ingredients: [
      { fa: 'عدس قرمز پوست‌کنده', en: 'Skinless red lentils', amount: '۳ قاشق غذاخوری (حدود ۳۰ گرم)' },
      { fa: 'هویج رنده‌شده', en: 'Grated carrot', amount: '۱ عدد کوچک' },
      { fa: 'آب یا شیر مادر (برای رقیق‌کردن)', en: 'Cooking water or breast milk (to thin)', amount: 'در صورت نیاز' },
    ],
    steps: [
      { fa: 'عدس قرمز را چند بار بشویید تا آبِ شست‌وشو کاملاً زلال شود.', en: 'Rinse the red lentils several times until the water runs clear.' },
      { fa: 'عدس، هویج رنده‌شده و یک پیمانه آب را در قابلمه بگذارید و ۲۰ تا ۲۵ دقیقه بپزید تا عدس کاملاً باز شود و له شود.', en: 'Combine lentils, grated carrot and one cup of water; simmer 20-25 minutes until the lentils are completely broken down.' },
      { fa: 'کمی خنک کنید، سپس با بلندر یا صافی ریز بکشید تا حتی پوسته عدس هم کاملاً له شود.', en: 'Cool briefly, then blend or press through a fine sieve so even the lentil skins are fully smooth.' },
      { fa: 'در صورت نیاز با آب پخت یا شیر مادر رقیق کنید تا پوره روان شود.', en: 'Thin with cooking water or breast milk if needed until the purée flows off the spoon.' },
      { fa: 'تا دمای بدن خنک کنید و با قاشق به کودک بدهید.', en: 'Cool to body temperature and feed with a spoon.' },
    ],
    prepMinutes: 5,
    cookMinutes: 25,
    servings: '۱ وعده کودک',
    textureFa: 'پوره کاملاً صاف، بدون هیچ پوسته یا تکه عدس',
    textureEn: 'Completely smooth purée with no lentil skins or bits',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه به‌هیچ‌وجه مجاز نیست.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months.' },
      { fa: 'عدس باید آن‌قدر پخته باشد که با فشار انگشت کاملاً له شود؛ عدس نیم‌پز برای شکم و گلوی کوچک کودک خطرناک است.', en: 'The lentils must mash completely under finger pressure; undercooked lentils are hard to digest and a choking risk.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه در حضور بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال در ظرف دربسته؛ فقط یک‌بار گرم کنید. می‌توانید در قالب یخ تا ۱ ماه فریزر کنید و هر بار یک قالب را آب کنید.',
    storageEn: 'Refrigerate covered up to 24 hours; reheat once only. Freeze in an ice-cube tray up to 1 month and thaw one cube per serving.',
    substitutions: [
      { fa: 'لوبیا سفید پخته و کاملاً صاف‌شده به جای عدس', en: 'Fully puréed cooked white beans instead of lentils' },
      { fa: 'نخود پخته و صاف‌شده به جای عدس', en: 'Smooth cooked chickpeas instead of lentils' },
      { fa: 'کدوسبز پخته به جای هویج', en: 'Cooked zucchini instead of carrot' },
    ],
    nutrition: { kcal: 80, proteinG: 4, ironMg: 2, fiberG: 2.5 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۴) پوره گوشت و سبزیجات — iron
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'meat-veg-puree',
    audience: 'CHILD',
    ageGroup: '6_8',
    ageFromDays: 183,
    ageToDays: 273,
    category: 'iron',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'پوره گوشت و سبزیجات',
    titleEn: 'Meat and Vegetable Purée',
    image: '/images/recipes/puree-meat-veg.jpg',
    ingredients: [
      { fa: 'گوشت گوساله یا گوسفند بدون استخوان و بدون چربی', en: 'Boneless, lean beef or lamb', amount: '۵۰ گرم' },
      { fa: 'سیب‌زمینی', en: 'Potato', amount: '۱ عدد کوچک' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد کوچک' },
      { fa: 'آب پخت (برای رقیق‌کردن)', en: 'Cooking water (to thin)', amount: 'در صورت نیاز' },
    ],
    steps: [
      { fa: 'گوشت را به قطعات ریز برش بزنید و در یک پیمانه آب ۲۰ دقیقه بپزید؛ کف سطح را با قاشق بگیرید.', en: 'Cut the meat into small pieces and simmer in one cup of water for 20 minutes, skimming the foam.' },
      { fa: 'سیب‌زمینی و هویج خردشده را اضافه کنید و ۱۵ دقیقه دیگر بپزید تا همه کاملاً نرم شوند.', en: 'Add the diced potato and carrot and cook 15 more minutes until everything is very soft.' },
      { fa: 'کمی خنک کنید و با بلندر تا بافت کاملاً یکنواخت و بدون رشته پوره کنید.', en: 'Cool briefly, then blend until completely uniform with no meat strings.' },
      { fa: 'با آب پخت رقیق کنید تا غلظت خمیر ماست به‌دست آید.', en: 'Thin with cooking water to a yogurt-like consistency.' },
      { fa: 'تا دمای بدن خنک کنید و با قاشق به کودک بدهید.', en: 'Cool to body temperature and feed with a spoon.' },
    ],
    prepMinutes: 10,
    cookMinutes: 35,
    servings: '۱ وعده کودک',
    textureFa: 'پوره یکنواخت، بدون رشته گوشت و بدون تکه',
    textureEn: 'Uniform purée with no meat strings or lumps',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه به‌هیچ‌وجه مجاز نیست و کودک باید طعم طبیعی غذا را بشناسد.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months and your baby needs to learn the natural taste of food.' },
      { fa: 'گوشت باید کاملاً پخته و پوره بدون هیچ رشته یا تکه باشد؛ قبل از دادن، مقداری پوره را بین انگشتان بمالید و بررسی کنید.', en: 'The meat must be fully cooked and the purée free of strings or lumps; rub a little between your fingers to check before feeding.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال؛ فقط یک‌بار گرم کنید و باقی‌مانده را دور بریزید. برای فریزر، در قالب یخ تا ۱ ماه.',
    storageEn: 'Refrigerate up to 24 hours; reheat once only and discard the rest. Freeze extra in ice-cube trays up to 1 month.',
    substitutions: [
      { fa: 'مرغ یا بوقلمون به جای گوشت قرمز', en: 'Chicken or turkey instead of red meat' },
      { fa: 'عدس پخته به جای گوشت (نسخه گیاهی)', en: 'Cooked lentils instead of meat (plant-based version)' },
      { fa: 'کدوسبز به جای هویج', en: 'Zucchini instead of carrot' },
    ],
    nutrition: { kcal: 110, proteinG: 8, ironMg: 1.5 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۵) پوره مرغ و هویج — protein
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'chicken-carrot-puree',
    audience: 'CHILD',
    ageGroup: '6_8',
    ageFromDays: 183,
    ageToDays: 273,
    category: 'protein',
    mealTypes: ['LUNCH'],
    title: 'پوره مرغ و هویج',
    titleEn: 'Chicken and Carrot Purée',
    image: '/images/recipes/puree-chicken-carrot.jpg',
    ingredients: [
      { fa: 'سینه مرغ بدون پوست و استخوان', en: 'Skinless, boneless chicken breast', amount: '۵۰ گرم' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد متوسط' },
      { fa: 'آب پخت یا شیر مادر (برای رقیق‌کردن)', en: 'Cooking water or breast milk (to thin)', amount: 'در صورت نیاز' },
    ],
    steps: [
      { fa: 'مرغ را به تکه‌های کوچک برش بزنید و در آب کم ۱۵ دقیقه بپزید تا کاملاً سفید و پخته شود.', en: 'Cut the chicken into small pieces and simmer in a little water for 15 minutes until completely cooked through.' },
      { fa: 'هویج خردشده را اضافه کنید و ۱۵ دقیقه دیگر بپزید تا هر دو بسیار نرم شوند.', en: 'Add the diced carrot and cook 15 more minutes until both are very soft.' },
      { fa: 'کمی خنک کنید و با بلندر پوره کنید تا هیچ رشته مرغی باقی نماند.', en: 'Cool briefly, then blend until no chicken strands remain.' },
      { fa: 'با آب پخت یا شیر مادر رقیق کنید تا بافت روان و بدون تکه شود.', en: 'Thin with cooking water or breast milk until smooth and lump-free.' },
      { fa: 'تا دمای بدن خنک کنید و با قاشق به کودک بدهید.', en: 'Cool to body temperature and feed with a spoon.' },
    ],
    prepMinutes: 8,
    cookMinutes: 30,
    servings: '۱ وعده کودک',
    textureFa: 'پوره نرم و روان، بدون رشته مرغ',
    textureEn: 'Smooth, runny purée with no chicken strands',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل زیر ۱۲ ماه مطلقاً ممنوع است.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months.' },
      { fa: 'مرغ باید کاملاً پخته باشد (هیچ قسمت صورتی یا ژله‌ای نماند) و پوره فاقد هر رشته یا تکه باشد.', en: 'The chicken must be fully cooked (no pink or jelly-like parts) and the purée free of any strands or lumps.' },
      { fa: 'غذا را تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال در ظرف دربسته؛ فقط یک‌بار گرم کنید.',
    storageEn: 'Refrigerate covered up to 24 hours; reheat once only.',
    substitutions: [
      { fa: 'بوقلمون به جای مرغ', en: 'Turkey instead of chicken' },
      { fa: 'گوشت گوساله کم‌چرب به جای مرغ', en: 'Lean beef instead of chicken' },
      { fa: 'کدوسبز به جای هویج', en: 'Zucchini instead of carrot' },
    ],
    nutrition: { kcal: 90, proteinG: 9, ironMg: 0.8 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۶) فرنی جو دوسر غنی از آهن — porridge
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'iron-fortified-oat-porridge',
    audience: 'CHILD',
    ageGroup: '6_8',
    ageFromDays: 183,
    ageToDays: 273,
    category: 'porridge',
    mealTypes: ['BREAKFAST'],
    title: 'فرنی جو دوسر غنی از آهن',
    titleEn: 'Iron-Fortified Oat Porridge',
    image: '/images/recipes/oat-porridge.jpg',
    ingredients: [
      { fa: 'جو دوسر (در صورت سابقه سلیاک در خانواده: برچسب «بدون گلوتن»)', en: 'Rolled oats (choose a certified gluten-free label if celiac runs in the family)', amount: '۲ قاشق غذاخوری' },
      { fa: 'شیر مادر یا شیر خشک آماده‌شده', en: 'Breast milk or prepared formula', amount: '۱ پیمانه (۲۴۰ میلی‌لیتر)' },
      { fa: 'موز رسیده له‌شده (اختیاری)', en: 'Mashed ripe banana (optional)', amount: 'نصف عدد' },
    ],
    steps: [
      { fa: 'جو دوسر را در مخلوط‌کن یا آسیاب قهوه تا حالت پودر نرم آسیاب کنید.', en: 'Grind the oats to a fine flour in a blender or coffee grinder.' },
      { fa: 'پودر جو را با شیر مادر یا شیر خشک در قابلمه کوچک مخلوط کنید و روی حرارت ملایم مدام هم بزنید.', en: 'Whisk the oat flour with breast milk or formula in a small saucepan over low heat, stirring constantly.' },
      { fa: '۵ تا ۷ دقیقه بپزید تا کاملاً پخته و غلیظ شود؛ مواظب باشید ته نگیرد.', en: 'Cook 5-7 minutes until fully cooked and thick, making sure it does not stick to the bottom.' },
      { fa: 'از روی حرارت بردارید؛ فرنی سفت‌تر می‌شود، در صورت نیاز کمی شیر یا آب جوشیدهٔ خنک‌شده اضافه کنید.', en: 'Remove from the heat; the porridge thickens as it sits, so add a little more milk or cooled boiled water if needed.' },
      { fa: 'موز له‌شده را (در صورت تمایل) مخلوط کنید، تا دمای بدن خنک کنید و با قاشق نرم به کودک بدهید.', en: 'Stir in the mashed banana if using, cool to body temperature and feed with a soft spoon.' },
    ],
    prepMinutes: 5,
    cookMinutes: 7,
    servings: '۱ وعده کودک',
    textureFa: 'فرنی نرم و کش‌دار، بدون تکه',
    textureEn: 'Soft, silky porridge with no lumps',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل به فرنی اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه به‌هیچ‌وجه مجاز نیست (خطر بوتولیسم نوزادی).', en: 'Add no salt, sugar or honey to the porridge; honey is strictly prohibited under 12 months (infant botulism risk).' },
      { fa: 'فرنی را با شیر مادر یا شیر خشک آماده کنید؛ شیر گاو تا ۱۲ ماهگی به‌عنوان نوشیدنی اصلی کودک مجاز نیست (به مقدار کم در غذا اشکال ندارد).', en: 'Prepare the porridge with breast milk or formula; cow milk is not allowed as the main drink under 12 months (small amounts in food are fine).' },
      { fa: 'جو دوسر معمولاً گلوتن ندارد اما ممکن است با گندم آلوده شده باشد؛ در صورت سابقه سلیاک، محصول دارای تأیید «بدون گلوتن» بخرید.', en: 'Oats are naturally gluten-free but may be cross-contaminated with wheat; if there is a history of celiac disease, buy certified gluten-free oats.' },
    ],
    storageFa: 'بهترین حالت مصرف تازه است؛ باقی‌مانده را حداکثر ۲۴ ساعت در یخچال نگه دارید و فقط یک‌بار گرم کنید.',
    storageEn: 'Best served fresh; store leftovers up to 24 hours in the fridge and reheat once only.',
    substitutions: [
      { fa: 'فرنی برنج آسیاب‌شده به جای جو دوسر', en: 'Ground-rice porridge instead of oats' },
      { fa: 'اضافه‌کردن پوره سیب‌زمینی شیرین به جای موز', en: 'Sweet potato purée instead of banana' },
    ],
    nutrition: { kcal: 130, proteinG: 4, ironMg: 1.2 },
    medicalSource: 'AAP — Infant food safety (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/Starting-Solid-Foods.aspx',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۷) پوره موز — puree
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'banana-puree',
    audience: 'CHILD',
    ageGroup: '6_8',
    ageFromDays: 183,
    ageToDays: 273,
    category: 'puree',
    mealTypes: ['SNACK', 'BREAKFAST'],
    title: 'پوره موز',
    titleEn: 'Banana Purée',
    image: '/images/recipes/puree-banana.jpg',
    ingredients: [
      { fa: 'موز کاملاً رسیده', en: 'Fully ripe banana', amount: '۱ عدد کوچک' },
      { fa: 'شیر مادر یا شیر خشک آماده‌شده', en: 'Breast milk or prepared formula', amount: '۱ تا ۲ قاشق غذاخوری (اختیاری)' },
    ],
    steps: [
      { fa: 'موز کاملاً رسیده (پوست خالدار) را پوست بکنید.', en: 'Peel a fully ripe banana (spotted skin).' },
      { fa: 'با چنگال تا کاملاً نرم و خمیری له کنید؛ هیچ تکه سفتی نماند.', en: 'Mash with a fork until completely soft and creamy, with no firm bits.' },
      { fa: 'در صورت نیاز با شیر مادر یا شیر خشک رقیق کنید تا بافت روان شود.', en: 'Thin with breast milk or formula if needed until the texture flows easily.' },
      { fa: 'بلافاصله به کودک بدهید؛ پوره موز سریع تیره می‌شود.', en: 'Serve immediately; banana purée browns quickly.' },
    ],
    prepMinutes: 5,
    cookMinutes: 0,
    servings: '۱ وعده کودک',
    textureFa: 'خمیر کاملاً نرم و بدون تکه',
    textureEn: 'Completely smooth, lump-free mash',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه به‌هیچ‌وجه مجاز نیست.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months.' },
      { fa: 'موز را کاملاً له کنید؛ قطعات لیز و درشت موز در این سن خطر خفگی دارند.', en: 'Mash the banana completely; large slippery pieces are a choking hazard at this age.' },
      { fa: 'کودک را هنگام خوردن هرگز تنها نگذارید.', en: 'Never leave your baby alone while eating.' },
    ],
    storageFa: 'پوره موز را نگه ندارید؛ در همان لحظه آماده کنید، چون سریع تیره و بی‌کیفیت می‌شود.',
    storageEn: 'Do not store banana purée; prepare it fresh, as it browns and loses quality quickly.',
    substitutions: [
      { fa: 'آووکادوی رسیده به جای موز', en: 'Ripe avocado instead of banana' },
      { fa: 'سیب پخته و پوره‌شده به جای موز', en: 'Cooked, puréed apple instead of banana' },
      { fa: 'گلابی پخته له‌شده به جای موز', en: 'Mashed cooked pear instead of banana' },
    ],
    nutrition: { kcal: 60, fiberG: 1.5 },
    medicalSource: 'AAP — Infant food safety (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/Starting-Solid-Foods.aspx',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۸) پوره آووکادو — puree
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'avocado-puree',
    audience: 'CHILD',
    ageGroup: '6_8',
    ageFromDays: 183,
    ageToDays: 273,
    category: 'puree',
    mealTypes: ['SNACK'],
    title: 'پوره آووکادو',
    titleEn: 'Avocado Purée',
    image: '/images/recipes/puree-avocado.jpg',
    ingredients: [
      { fa: 'آووکادوی کاملاً رسیده', en: 'Fully ripe avocado', amount: 'نصف عدد' },
      { fa: 'شیر مادر یا شیر خشک آماده‌شده', en: 'Breast milk or prepared formula', amount: '۱ تا ۲ قاشق غذاخوری (اختیاری)' },
    ],
    steps: [
      { fa: 'آووکادو رسیده (که با فشار ملایم انگشت نرم می‌شود) را از طول نصف کنید و هسته را جدا کنید.', en: 'Halve a ripe avocado (it yields to gentle finger pressure) and remove the pit.' },
      { fa: 'گوشت آن را با قاشق دربیاورید.', en: 'Scoop the flesh out with a spoon.' },
      { fa: 'با چنگال تا کاملاً نرم و کرمی له کنید؛ هیچ تکه‌ای نماند.', en: 'Mash with a fork until completely smooth and creamy.' },
      { fa: 'در صورت نیاز با چند قاشق شیر مادر یا شیر خشک رقیق کنید و فوراً به کودک بدهید.', en: 'Thin with a little breast milk or formula if needed and serve right away.' },
    ],
    prepMinutes: 5,
    cookMinutes: 0,
    servings: '۱ وعده کودک',
    textureFa: 'خمیر کرمی و نرم، بدون تکه',
    textureEn: 'Creamy, smooth mash with no lumps',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه ممنوع است.', en: 'Add no salt, sugar or honey; honey is prohibited under 12 months.' },
      { fa: 'آووکادو باید کاملاً رسیده و نرم باشد؛ بافت سفت برای این سن مناسب نیست و تکه‌های آن خطر خفگی دارد.', en: 'The avocado must be fully ripe and soft; firm texture is unsuitable at this age and lumps are a choking risk.' },
      { fa: 'همیشه در حضور بزرگ‌ترها به کودک غذا بدهید و پس از هر وعده، دهان و اطراف دهان را تمیز کنید.', en: 'Always feed under adult supervision and wipe the mouth area after each meal.' },
    ],
    storageFa: 'بهترین حالت، تازه‌خوری است. برای نگهداری کوتاه، هسته آووکادو را داخل پوره بگذارید، سطح را با سلفون بچسبانید و حداکثر ۲۴ ساعت در یخچال نگه دارید.',
    storageEn: 'Best served fresh. For short storage, keep the pit inside the purée, press plastic wrap onto the surface and refrigerate up to 24 hours.',
    substitutions: [
      { fa: 'موز له‌شده به جای آووکادو', en: 'Mashed banana instead of avocado' },
      { fa: 'کدوحلوایی پخته به جای آووکادو', en: 'Cooked pumpkin instead of avocado' },
    ],
    nutrition: { kcal: 120, proteinG: 1.5, fiberG: 2 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ════════════════════════════════════════════════════════════════════
  // سن ۹ تا ۱۱ ماه (274 تا 364 روز) — له‌شده تا نرم خردشده
  // ════════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────────
  // ۹) سوپ مرغ و سبزیجات نرم — soup
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'chicken-veg-soup-soft',
    audience: 'CHILD',
    ageGroup: '9_11',
    ageFromDays: 274,
    ageToDays: 364,
    category: 'soup',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'سوپ مرغ و سبزیجات نرم',
    titleEn: 'Soft Chicken and Vegetable Soup',
    image: '/images/recipes/soup-chicken-veg.jpg',
    ingredients: [
      { fa: 'ران مرغ بدون پوست (یا سینه)', en: 'Skinless chicken thigh (or breast)', amount: '۱ عدد کوچک (حدود ۶۰ گرم)' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد' },
      { fa: 'کدوسبز', en: 'Zucchini', amount: '۱ عدد کوچک' },
      { fa: 'سیب‌زمینی', en: 'Potato', amount: '۱ عدد کوچک' },
      { fa: 'برنج', en: 'Rice', amount: '۱ قاشق غذاخوری' },
      { fa: 'آب', en: 'Water', amount: '۲ پیمانه' },
    ],
    steps: [
      { fa: 'مرغ را با آب بگذارید بجوشد؛ کف سطح را بگیرید و ۲۰ دقیقه بپزید.', en: 'Bring the chicken and water to a boil, skim the foam and simmer 20 minutes.' },
      { fa: 'سبزیجات خردشده و برنج شسته را اضافه کنید و ۲۵ دقیقه بپزید تا همه چیز کاملاً نرم شود.', en: 'Add the chopped vegetables and rinsed rice; simmer 25 minutes until everything is completely soft.' },
      { fa: 'مرغ را دربیاورید، از استخوان جدا کنید و ریز خرد کنید؛ استخوان را دور بریزید.', en: 'Remove the chicken, take it off the bone and chop finely; discard the bone.' },
      { fa: 'سبزیجات و برنج را با گوشت‌کوب له کنید تا تکه‌های خیلی نرم و کوچکی بماند که با لثه له می‌شود.', en: 'Mash the vegetables and rice with a masher, leaving very soft small pieces that squash against the gums.' },
      { fa: 'مرغ خردشده را برگردانید، چند دقیقه بجوشانید، تا دمای بدن خنک کنید و به کودک بدهید.', en: 'Return the chopped chicken, simmer a few minutes, cool to body temperature and serve.' },
    ],
    prepMinutes: 15,
    cookMinutes: 50,
    servings: '۱ تا ۲ وعده کودک',
    textureFa: 'سوپ غلیظ با تکه‌های بسیار نرم و کوچکِ قابل له‌شدن با قاشق',
    textureEn: 'Thick soup with very soft, small pieces that mash against a spoon',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه به‌هیچ‌وجه مجاز نیست.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months.' },
      { fa: 'استخوان مرغ را کامل جدا کنید و قبل از دادن، تکه‌های سوپ را بررسی کنید؛ هیچ استخوان یا تکه سخت نباید باقی مانده باشد.', en: 'Remove the bone completely and check the soup pieces before feeding; no bones or hard bits must remain.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال در ظرف دربسته؛ فقط یک‌بار گرم کنید و باقی‌مانده گرم‌شده را دور بریزید.',
    storageEn: 'Refrigerate covered up to 24 hours; reheat once only and discard leftovers of the reheated portion.',
    substitutions: [
      { fa: 'بوقلمون به جای مرغ', en: 'Turkey instead of chicken' },
      { fa: 'عدس پخته به جای برنج', en: 'Cooked lentils instead of rice' },
      { fa: 'کدوحلوایی به جای هویج', en: 'Pumpkin instead of carrot' },
    ],
    nutrition: { kcal: 130, proteinG: 9, ironMg: 1 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۰) عدسی نرم و له‌شده — iron
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'soft-lentil-mash',
    audience: 'CHILD',
    ageGroup: '9_11',
    ageFromDays: 274,
    ageToDays: 364,
    category: 'iron',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'عدسی نرم و له‌شده',
    titleEn: 'Soft Mashed Lentil Stew',
    image: '/images/recipes/soft-lentil.jpg',
    ingredients: [
      { fa: 'عدس قرمز', en: 'Red lentils', amount: '۳ قاشق غذاخوری' },
      { fa: 'پیاز رنده‌شده', en: 'Grated onion', amount: 'نصف عدد کوچک' },
      { fa: 'هویج رنده‌شده', en: 'Grated carrot', amount: '۱ عدد کوچک' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق چای‌خوری' },
      { fa: 'آب', en: 'Water', amount: '۲ پیمانه' },
    ],
    steps: [
      { fa: 'عدس را بشویید و با پیاز رنده‌شده و آب بگذارید بجوشد؛ کف سطح را بگیرید.', en: 'Rinse the lentils, combine with the grated onion and water, bring to a boil and skim.' },
      { fa: '۲۵ تا ۳۰ دقیقه بپزید؛ هویج رنده‌شده را در ۱۰ دقیقه آخر اضافه کنید.', en: 'Simmer 25-30 minutes; add the grated carrot in the last 10 minutes.' },
      { fa: 'وقتی عدس و هویج با فشار انگشت کاملاً له می‌شوند، از روی حرارت بردارید.', en: 'When the lentils and carrot mash completely under finger pressure, remove from the heat.' },
      { fa: 'با گوشت‌کوب عدسی را له کنید تا بافت نرم و یکدست ولی غلیظ به‌دست آید (نه پوره آبکی).', en: 'Mash with a potato masher to a soft, uniform but thick texture (not a watery purée).' },
      { fa: 'روغن زیتون را اضافه کنید، تا دمای بدن خنک کنید و به کودک بدهید.', en: 'Stir in the olive oil, cool to body temperature and serve.' },
    ],
    prepMinutes: 10,
    cookMinutes: 30,
    servings: '۱ وعده کودک',
    textureFa: 'عدسی غلیظ و کاملاً له‌شده، بدون هیچ عدس سفت',
    textureEn: 'Thick, fully mashed lentils with no firm bits',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه مطلقاً ممنوع است.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months.' },
      { fa: 'عدس باید آن‌قدر پخته باشد که با فشار انگشت کاملاً له شود؛ عدس سفت یا پوست‌دار خطر خفگی دارد.', en: 'The lentils must mash completely under finger pressure; firm or skin-on lentils are a choking hazard.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال؛ فقط یک‌بار گرم کنید. عدسی اضافی را در قالب یخ تا ۱ ماه فریزر کنید.',
    storageEn: 'Refrigerate up to 24 hours; reheat once only. Freeze extra in ice-cube trays up to 1 month.',
    substitutions: [
      { fa: 'لوبیا سفید پخته و له‌شده به جای عدس', en: 'Cooked mashed white beans instead of lentils' },
      { fa: 'نخود پخته له‌شده به جای عدس', en: 'Mashed cooked chickpeas instead of lentils' },
      { fa: 'مخلوط با برنج نرم برای وعده سیرکننده‌تر', en: 'Mix with soft rice for a more filling meal' },
    ],
    nutrition: { kcal: 110, proteinG: 5, ironMg: 2.2, fiberG: 3 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۱) کوکوی سبزیجات کاملاً پخته — lunch
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'veg-kookoo-soft',
    audience: 'CHILD',
    ageGroup: '9_11',
    ageFromDays: 274,
    ageToDays: 364,
    category: 'lunch',
    mealTypes: ['LUNCH'],
    title: 'کوکوی سبزیجات نرم',
    titleEn: 'Soft Vegetable Kookoo',
    image: '/images/recipes/veg-kookoo.jpg',
    ingredients: [
      { fa: 'تخم‌مرغ', en: 'Egg', amount: '۱ عدد' },
      { fa: 'سبزی کوكو (اسفناج، جعفری، تره) بسیار ریز خردشده', en: 'Finely chopped kookoo herbs (spinach, parsley, leek)', amount: '۲ قاشق غذاخوری' },
      { fa: 'سیب‌زمینی آب‌پز رنده‌شده', en: 'Grated boiled potato', amount: '۱ عدد کوچک' },
      { fa: 'پیاز رنده‌شده و آب‌گرفته', en: 'Grated onion, squeezed dry', amount: '۱ قاشق غذاخوری' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق چای‌خوری' },
    ],
    steps: [
      { fa: 'سبزی‌ها را بشویید و بسیار ریز خرد کنید؛ پیاز را رنده و آب آن را کامل بگیرید.', en: 'Wash the herbs and chop very finely; grate the onion and squeeze out all the juice.' },
      { fa: 'تخم‌مرغ، سبزی، سیب‌زمینی و پیاز را مخلوط کنید.', en: 'Combine the egg, herbs, potato and onion.' },
      { fa: 'تابه نچسب را با روغن بسیار کم گرم کنید؛ مایه را قاشق‌قاشق بریزید و با درپوش روی حرارت کم بپزید.', en: 'Heat a non-stick pan with very little oil; drop the batter by spoonfuls and cook covered over low heat.' },
      { fa: 'هر کوکو را برگردانید تا هر دو طرف کاملاً سفت و طلایی شود؛ وسط کوکو نباید آبدار یا مایع باشد.', en: 'Flip each kookoo until both sides are fully set and golden; the center must not be watery or liquid.' },
      { fa: 'کمی خنک کنید و به نوارهای نازک قابل گرفتن با دست برش بزنید.', en: 'Cool slightly and cut into thin strips the baby can grasp.' },
    ],
    prepMinutes: 10,
    cookMinutes: 10,
    servings: '۱ تا ۲ وعده کودک',
    textureFa: 'کوکوی کاملاً پخته و نرم، برش‌خورده به نوارهای نازک لمسی',
    textureEn: 'Fully cooked, soft kookoo cut into thin graspable strips',
    allergens: ['EGG'],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه به‌هیچ‌وجه مجاز نیست.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months.' },
      { fa: 'تخم‌مرغ آلرژن شایع است؛ بار اول مقدار خیلی کم بدهید و ۲ تا ۳ روز واکنش پوستی یا گوارشی را زیر نظر بگیرید. کوکو باید در وسط کاملاً پخته و سفت باشد، نه آبدار.', en: 'Egg is a common allergen; offer a tiny amount the first time and watch for skin or digestive reactions for 2-3 days. The kookoo must be fully cooked and firm in the middle, never runny.' },
      { fa: 'بگذارید تا دمای بدن خنک شود و همیشه زیر نظر بزرگ‌ترها به کودک بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال در ظرف دربسته؛ فقط یک‌بار گرم کنید یا در دمای اتاق بدهید.',
    storageEn: 'Refrigerate covered up to 24 hours; reheat once only or serve at room temperature.',
    substitutions: [
      { fa: 'هویج رنده‌شده به جای سیب‌زمینی', en: 'Grated carrot instead of potato' },
      { fa: 'کدوسبز رنده‌شده و آب‌گرفته به جای پیاز', en: 'Grated, squeezed zucchini instead of onion' },
    ],
    nutrition: { kcal: 140, proteinG: 7 },
    medicalSource: 'AAP — Food allergy prevention (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/healthy-living/nutrition/Pages/Food-Allergies.aspx',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۲) ماکارونی ریز و نرم با سس سبزیجات — lunch
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mini-pasta-soft',
    audience: 'CHILD',
    ageGroup: '9_11',
    ageFromDays: 274,
    ageToDays: 364,
    category: 'lunch',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'ماکارونی ریز و نرم با سس سبزیجات',
    titleEn: 'Mini Soft Pasta with Vegetable Sauce',
    image: '/images/recipes/mini-pasta.jpg',
    ingredients: [
      { fa: 'ماکارونی فرم ریز (ستاره یا حروف)', en: 'Mini pasta shapes (stars or letters)', amount: '۳۰ گرم' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد کوچک' },
      { fa: 'کدوسبز', en: 'Zucchini', amount: 'نصف عدد' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق چای‌خوری' },
      { fa: 'آب پخت سبزیجات', en: 'Vegetable cooking water', amount: '۲ تا ۳ قاشق غذاخوری' },
    ],
    steps: [
      { fa: 'ماکارونی را در آب بدون نمک ۱۲ دقیقه بپزید؛ باید از حالت معمول نرم‌تر و کاملاً پخته باشد.', en: 'Boil the pasta in unsalted water for 12 minutes; it must be softer than usual, fully cooked.' },
      { fa: 'هویج و کدو را با کمی آب بپزید تا بسیار نرم شود، سپس پوره کنید تا سس غلیظ به‌دست آید.', en: 'Cook the carrot and zucchini with a little water until very soft, then purée into a thick sauce.' },
      { fa: 'ماکارونی را آبکش کنید و با سس سبزیجات و روغن زیتون مخلوط کنید.', en: 'Drain the pasta and mix with the vegetable sauce and olive oil.' },
      { fa: 'ماکارونی‌ها را با قیچی تمیز یا چاقو بسیار ریز کنید؛ هر تکه کمتر از نیم سانتی‌متر.', en: 'Cut the pasta very small with clean scissors or a knife; each piece under half a centimeter.' },
      { fa: 'تا دمای بدن خنک کنید و با قاشق به کودک بدهید.', en: 'Cool to body temperature and feed with a spoon.' },
    ],
    prepMinutes: 10,
    cookMinutes: 15,
    servings: '۱ وعده کودک',
    textureFa: 'ماکارونی بسیار نرم و خردشده به قطعات ریز، با سس غلیظ سبزیجات',
    textureEn: 'Very soft pasta cut into tiny pieces, coated in a thick vegetable sauce',
    allergens: ['GLUTEN'],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه مطلقاً ممنوع است.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months.' },
      { fa: 'پاستا گندمی است و گلوتن دارد؛ بار اول مقدار کم بدهید و واکنش را زیر نظر بگیرید.', en: 'Wheat pasta contains gluten; offer a small amount the first time and watch for reactions.' },
      { fa: 'تکه‌های درشت و لغزنده ماکارونی خطر خفگی دارند؛ حتماً ریز خرد کنید، تا دمای بدن خنک کنید و زیر نظر بزرگ‌ترها بدهید.', en: 'Long slippery pasta pieces are a choking hazard; cut them very small, cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال؛ فقط یک‌بار گرم کنید و کمی آب جوشیده خنک اضافه کنید تا خشک نشود.',
    storageEn: 'Refrigerate up to 24 hours; reheat once only and add a little cooled boiled water so it does not dry out.',
    substitutions: [
      { fa: 'پاستای برنجی بدون گلوتن در صورت حساسیت', en: 'Gluten-free rice pasta if sensitive' },
      { fa: 'سس عدس یا لوبیای پخته به جای سبزیجات', en: 'Cooked lentil or bean sauce instead of vegetables' },
    ],
    nutrition: { kcal: 150, proteinG: 5, fiberG: 2 },
    medicalSource: 'AAP — Food allergy prevention (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/healthy-living/nutrition/Pages/Food-Allergies.aspx',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۳) پوره ماهی کاملاً پخته و بدون استخوان — protein
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'fish-puree',
    audience: 'CHILD',
    ageGroup: '9_11',
    ageFromDays: 274,
    ageToDays: 364,
    category: 'protein',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'پوره ماهی کاملاً پخته و بدون استخوان',
    titleEn: 'Fully Cooked Boneless Fish Purée',
    image: '/images/recipes/fish-puree.jpg',
    ingredients: [
      { fa: 'فیله ماهی سفید کم‌جیوه (سول یا کفال)', en: 'Low-mercury white fish fillet (sole or mullet)', amount: '۴۰ گرم' },
      { fa: 'سیب‌زمینی', en: 'Potato', amount: '۱ عدد کوچک' },
      { fa: 'هویج', en: 'Carrot', amount: 'نصف عدد' },
      { fa: 'آب پخت (برای رقیق‌کردن)', en: 'Cooking water (to thin)', amount: 'در صورت نیاز' },
    ],
    steps: [
      { fa: 'فیله را روی تخته روشن بررسی کنید و هر استخوان ریزی را با پنس بگیرید.', en: 'Check the fillet against a light board and remove every tiny bone with tweezers.' },
      { fa: 'ماهی را با دو سه قاشق آب در تابه روی حرارت ملایم ۱۰ تا ۱۲ دقیقه بپزید تا کاملاً ورقه‌ورقه و مات شود.', en: 'Poach the fish with 2-3 spoons of water over low heat for 10-12 minutes until it flakes and is opaque throughout.' },
      { fa: 'سیب‌زمینی و هویج را جداگانه بپزید تا بسیار نرم شوند.', en: 'Cook the potato and carrot separately until very soft.' },
      { fa: 'همه را با بلندر پوره کنید و یک بار دیگر استخوان بررسی کنید.', en: 'Blend everything to a purée and check for bones once more.' },
      { fa: 'تا دمای بدن خنک کنید و با قاشق به کودک بدهید.', en: 'Cool to body temperature and feed with a spoon.' },
    ],
    prepMinutes: 10,
    cookMinutes: 15,
    servings: '۱ وعده کودک',
    textureFa: 'پوره کاملاً صاف، بدون تکه و بدون استخوان',
    textureEn: 'Completely smooth purée, lump-free and boneless',
    allergens: ['FISH'],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه مطلقاً ممنوع است.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months.' },
      { fa: 'استخوان‌های ماهی را قبل و بعد از پوره‌کردن دو بار بررسی کنید؛ فقط ماهی کم‌جیوه بدهید و از ماهی‌های بزرگ شکارچی پرهیز کنید. ماهی آلرژن است؛ بار اول مقدار خیلی کم بدهید و ۲ تا ۳ روز زیر نظر بگیرید.', en: 'Check for bones twice, before and after blending; offer only low-mercury fish and avoid large predatory species. Fish is an allergen; offer a tiny amount the first time and monitor for 2-3 days.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'باقی‌مانده را حداکثر ۲۴ ساعت در یخچال نگه دارید و فقط یک‌بار گرم کنید؛ ماهی پخته را بیشتر از این نگه ندارید.',
    storageEn: 'Store leftovers up to 24 hours in the fridge and reheat once only; do not keep cooked fish any longer.',
    substitutions: [
      { fa: 'فیله قزل‌آلای پرورشی (کم‌جیوه) به جای ماهی سفید', en: 'Farmed trout fillet (low-mercury) instead of white fish' },
      { fa: 'مرغ کاملاً پخته برای کودک با آلرژی ماهی (با نظر پزشک)', en: 'Fully cooked chicken for a fish-allergic baby (with medical advice)' },
    ],
    nutrition: { kcal: 100, proteinG: 9, ironMg: 0.5 },
    medicalSource: 'AAP — Food allergy prevention (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/healthy-living/nutrition/Pages/Food-Allergies.aspx',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۴) تخم‌مرغ کاملاً پخته و خردشده — protein
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'egg-mash',
    audience: 'CHILD',
    ageGroup: '9_11',
    ageFromDays: 274,
    ageToDays: 364,
    category: 'protein',
    mealTypes: ['BREAKFAST'],
    title: 'تخم‌مرغ کاملاً پخته و خردشده',
    titleEn: 'Fully Cooked Chopped Egg',
    image: '/images/recipes/egg-mash.jpg',
    ingredients: [
      { fa: 'تخم‌مرغ', en: 'Egg', amount: '۱ عدد' },
      { fa: 'شیر مادر یا شیر خشک آماده‌شده (برای نرم‌کردن)', en: 'Breast milk or prepared formula (to soften)', amount: '۱ قاشق غذاخوری' },
    ],
    steps: [
      { fa: 'تخم‌مرغ را با آب سرد در قابلمه بگذارید؛ بعد از جوش آمدن ۱۰ تا ۱۲ دقیقه بپزید تا زرده و سفیده کاملاً سفت شوند.', en: 'Start the egg in cold water; once boiling, cook 10-12 minutes until both yolk and white are completely firm.' },
      { fa: 'تخم‌مرغ را در آب سرد بگذارید تا خنک شود، سپس پوست بکنید.', en: 'Cool the egg in cold water, then peel.' },
      { fa: 'با چنگال کاملاً له و ریز کنید؛ هیچ تکه لیز یا درشتی نماند.', en: 'Mash and chop finely with a fork; no slippery or large pieces.' },
      { fa: 'با یک قاشق شیر مادر یا شیر خشک نرم‌تر و خمیری‌تر کنید.', en: 'Soften into a fine mash with a spoon of breast milk or formula.' },
      { fa: 'در دمای بدن و زیر نظر بزرگ‌ترها به کودک بدهید.', en: 'Serve at body temperature under adult supervision.' },
    ],
    prepMinutes: 3,
    cookMinutes: 12,
    servings: '۱ وعده کودک',
    textureFa: 'خمیر ریز و نرم از تخم‌مرغ کاملاً سفت',
    textureEn: 'Fine, soft mash from a fully hard-boiled egg',
    allergens: ['EGG'],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه به‌هیچ‌وجه مجاز نیست.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months.' },
      { fa: 'تخم‌مرغ باید کاملاً سفت شود؛ تخم‌مرغ نیم‌پز یا عسلی برای کودک ممنوع است. تخم‌مرغ آلرژن شایع است؛ بار اول مقدار کم بدهید و ۲ تا ۳ روز واکنش را زیر نظر بگیرید.', en: 'The egg must be fully hard-boiled; soft-boiled eggs are not allowed for babies. Egg is a common allergen; offer a small amount first and monitor reactions for 2-3 days.' },
      { fa: 'کودک را هنگام خوردن هرگز تنها نگذارید.', en: 'Never leave your baby alone while eating.' },
    ],
    storageFa: 'تخم‌مرغ پخته را حداکثر ۲۴ ساعت با پوست در یخچال نگه دارید؛ له‌شده را همان روز مصرف کنید و گرم‌کردن مجدد لازم نیست.',
    storageEn: 'Keep the boiled egg (unpeeled) up to 24 hours in the fridge; use the mash the same day; no reheating needed.',
    substitutions: [
      { fa: 'املت کاملاً پخته و ریزخردشده', en: 'Fully cooked, finely chopped omelette' },
      { fa: 'کوکوی سبزیجات کاملاً پخته', en: 'Fully cooked vegetable kookoo' },
    ],
    nutrition: { kcal: 90, proteinG: 7, ironMg: 0.6 },
    medicalSource: 'AAP — Food allergy prevention (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/healthy-living/nutrition/Pages/Food-Allergies.aspx',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۵) غذاهای انگشتی ایمن — finger
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'safe-finger-foods',
    audience: 'CHILD',
    ageGroup: '9_11',
    ageFromDays: 274,
    ageToDays: 364,
    category: 'finger',
    mealTypes: ['SNACK'],
    title: 'غذاهای انگشتی ایمن',
    titleEn: 'Safe Finger Foods Platter',
    image: '/images/recipes/finger-foods.jpg',
    ingredients: [
      { fa: 'هویج آب‌پز نرم', en: 'Soft steamed carrot', amount: '۱ عدد (به شکل چوب درشت)' },
      { fa: 'موز رسیده', en: 'Ripe banana', amount: '۱ عدد (قطعات ۲ سانتی‌متری)' },
      { fa: 'انگور رسیده', en: 'Ripe grapes', amount: '۵ حبه (پوست‌کنده، هر حبه از طول ۴ قسمت)' },
      { fa: 'پنیر پاستوریزه کم‌نمک', en: 'Pasteurized low-salt cheese', amount: '۳۰ گرم (قطعات نرم)' },
    ],
    steps: [
      { fa: 'هویج را تا حدی بپزید که با فشار انگشت له شود؛ به چوب‌های درشت (به اندازه انگشت بزرگ خودتان) برش بزنید.', en: 'Steam the carrot until it squashes under finger pressure; cut into thick sticks (about the size of your thumb).' },
      { fa: 'انگور را پوست بکنید و هر حبه را از طول به چهار قسمت تقسیم کنید.', en: 'Peel the grapes and quarter each one lengthwise.' },
      { fa: 'پنیر را به قطعات کوچک و نرم برش بزنید؛ موز را در لحظه سرو برش بزنید.', en: 'Cut the cheese into small soft pieces; slice the banana just before serving.' },
      { fa: 'هر مورد را جدا در بشقاب بچینید تا کودک خودش انتخاب و بردارد.', en: 'Arrange each item separately on a plate so the baby can choose and pick up.' },
      { fa: 'کنار کودک بنشینید؛ اجازه بدهید خودش غذا را بردارد و شما مراقب هر لقمه باشید.', en: 'Sit with your baby; let them self-feed while you watch every bite.' },
    ],
    prepMinutes: 15,
    cookMinutes: 10,
    servings: '۱ میان‌وعده کودک',
    textureFa: 'قطعات نرم و لمسی که با لثه له می‌شوند، نه ترد و شکننده',
    textureEn: 'Soft graspable pieces that squash between the gums, not brittle',
    allergens: ['MILK'],
    safety: [
      { fa: 'هیچ نمک، شکر یا عسل اضافه نکنید؛ عسل برای کودک زیر ۱۲ ماه به‌هیچ‌وجه مجاز نیست.', en: 'Add no salt, sugar or honey; honey is strictly prohibited under 12 months.' },
      { fa: 'خطر خفگی: انگور را همیشه از طول به ۴ قسمت تقسیم کنید؛ آجیل و دانه کامل، ذرت بوداده، هویج خام و غذاهای سخت، گرد و لغزنده تا ۴ سالگی ممنوع است.', en: 'Choking hazard: always quarter grapes lengthwise; whole nuts and seeds, popcorn, raw carrot sticks and hard, round, slippery foods are prohibited up to age 4.' },
      { fa: 'کودک هنگام خوردن باید نشسته باشد و همیشه زیر نظر بزرگ‌تر؛ هرگز هنگام راه رفتن، گریه یا بازی فعال غذا ندهید.', en: 'The baby must sit while eating and always be supervised; never feed while crawling, walking, crying or playing actively.' },
    ],
    storageFa: 'میوه برش‌خورده را نگه ندارید و تازه آماده کنید؛ پنیر باز‌شده حداکثر ۲۴ ساعت در یخچال.',
    storageEn: 'Prepare cut fruit fresh each time; refrigerate opened cheese up to 24 hours.',
    substitutions: [
      { fa: 'گلابی رسیده پخته به جای موز', en: 'Cooked ripe pear instead of banana' },
      { fa: 'تخم‌مرغ سفت ریزشده به جای پنیر', en: 'Finely chopped hard-boiled egg instead of cheese' },
      { fa: 'کدوحلوایی بخارپز نرم به جای هویج', en: 'Soft steamed pumpkin instead of carrot' },
    ],
    nutrition: { kcal: 120, proteinG: 4, calciumMg: 90 },
    medicalSource: 'AAP — Choking prevention (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/health-issues/injuries-emergencies/Pages/Choking-Prevention.aspx',
    reviewedAt: '2025-10-15',
  },

  // ════════════════════════════════════════════════════════════════════
  // سن ۱۲ تا ۱۵ ماه (365 تا 486 روز) — غذای خانگی نرم با تکه‌های ریز
  // ════════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────────
  // ۱۶) برنج نرم با گوشت — lunch
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'soft-rice-with-meat',
    audience: 'CHILD',
    ageGroup: '12_15',
    ageFromDays: 365,
    ageToDays: 486,
    category: 'lunch',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'برنج نرم با گوشت',
    titleEn: 'Soft Rice with Meat',
    image: '/images/recipes/rice-meat-veg.jpg',
    ingredients: [
      { fa: 'برنج', en: 'Rice', amount: '۲ قاشق غذاخوری' },
      { fa: 'گوشت چرخ‌کرده کم‌چرب', en: 'Lean ground beef or lamb', amount: '۴۰ گرم' },
      { fa: 'هویج و کدوسبز رنده‌شده', en: 'Grated carrot and zucchini', amount: '۲ قاشق غذاخوری' },
      { fa: 'پیاز رنده‌شده', en: 'Grated onion', amount: 'نصف عدد کوچک' },
      { fa: 'آب', en: 'Water', amount: '۱.۵ پیمانه' },
    ],
    steps: [
      { fa: 'برنج شسته را با پیاز رنده‌شده و آب بگذارید بجوشد.', en: 'Bring the rinsed rice, grated onion and water to a boil.' },
      { fa: 'گوشت چرخ‌کرده را اضافه کنید و مدام هم بزنید تا کاملاً باز، خرد و پخته شود (حدود ۱۵ دقیقه).', en: 'Add the ground meat and stir constantly until fully broken up and cooked (about 15 minutes).' },
      { fa: 'سبزیجات رنده‌شده را اضافه کنید و ۱۰ دقیقه دیگر بپزید تا همه نرم شود.', en: 'Add the grated vegetables and cook 10 more minutes until everything is soft.' },
      { fa: 'با پشت قاشق برنج‌ها را کمی له کنید تا بافت نرم با تکه‌های خیلی ریز به‌دست آید.', en: 'Lightly mash the rice with the back of a spoon, leaving a soft texture with very fine pieces.' },
      { fa: 'تا دمای بدن خنک کنید و بدهید؛ برای تمرین قاشق‌زدن توسط خود کودک عالی است.', en: 'Cool to body temperature and serve; great practice for self-feeding with a spoon.' },
    ],
    prepMinutes: 10,
    cookMinutes: 30,
    servings: '۱ وعده کودک',
    textureFa: 'برنج نرمِ کمی له‌شده با تکه‌های ریز گوشت و سبزیجات نرم',
    textureEn: 'Soft, slightly mashed rice with fine meat bits and tender vegetables',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ کودک باید طعم طبیعی غذا را یاد بگیرد.', en: 'Add no salt or sugar; your toddler needs to learn the natural taste of food.' },
      { fa: 'گوشت باید کاملاً پخته و تکه‌های آن ریز باشد تا با دندان‌های تازه در حال بیرون‌آمدن قابل جویدن باشد.', en: 'The meat must be fully cooked and finely minced so it is chewable with newly erupting teeth.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال در ظرف دربسته؛ فقط یک‌بار گرم کنید و باقی‌مانده گرم‌شده را دور بریزید.',
    storageEn: 'Refrigerate covered up to 24 hours; reheat once only and discard leftovers of the reheated portion.',
    substitutions: [
      { fa: 'مرغ چرخ‌کرده به جای گوشت قرمز', en: 'Ground chicken instead of red meat' },
      { fa: 'عدس پخته به جای گوشت', en: 'Cooked lentils instead of meat' },
      { fa: 'برنج قهوه‌ای پخت‌شده تا حد نرمی کامل', en: 'Brown rice cooked until completely soft' },
    ],
    nutrition: { kcal: 180, proteinG: 10, ironMg: 1.8 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۷) کتلت نرم و کم‌نمک — protein
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'soft-cutlet',
    audience: 'CHILD',
    ageGroup: '12_15',
    ageFromDays: 365,
    ageToDays: 486,
    category: 'protein',
    mealTypes: ['LUNCH'],
    title: 'کتلت نرم و کم‌نمک',
    titleEn: 'Soft Low-Salt Cutlet',
    image: '/images/recipes/cutlet.jpg',
    ingredients: [
      { fa: 'گوشت چرخ‌کرده کم‌چرب', en: 'Lean ground meat', amount: '۱۰۰ گرم' },
      { fa: 'سیب‌زمینی آب‌پز', en: 'Boiled potato', amount: '۱ عدد متوسط' },
      { fa: 'تخم‌مرغ', en: 'Egg', amount: '۱ عدد' },
      { fa: 'پیاز رنده‌شده و آب‌گرفته', en: 'Grated onion, squeezed dry', amount: '۱ قاشق غذاخوری' },
      { fa: 'خرده نان کم‌نمک', en: 'Low-salt breadcrumbs', amount: '۱ قاشق غذاخوری' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق غذاخوری' },
    ],
    steps: [
      { fa: 'سیب‌زمینی آب‌پز را له کنید و با گوشت، تخم‌مرغ، پیاز و خرده نان ورز دهید تا خمیر یکنواخت شود.', en: 'Mash the boiled potato and knead with the meat, egg, onion and breadcrumbs into a uniform mixture.' },
      { fa: 'از خمیر، کتلت‌های کوچک و نازک (به ضخامت حدود ۱ سانتی‌متر) شکل دهید.', en: 'Shape small, thin cutlets (about 1 cm thick).' },
      { fa: 'تابه نچسب را با روغن بسیار کم گرم کنید و کتلت‌ها را بچینید.', en: 'Heat a non-stick pan with very little oil and arrange the cutlets.' },
      { fa: 'روی حرارت متوسط هر طرف ۴ تا ۵ دقیقه بپزید تا وسط کتلت کاملاً پخته و سطح قهوه‌ای شود.', en: 'Cook 4-5 minutes per side over medium heat until fully cooked through and browned.' },
      { fa: 'روی دستمال آشپزخانه بگذارید تا روغن اضافه گرفته شود؛ خنک کنید و به قطعات کوچک برش بزنید.', en: 'Place on a paper towel to absorb excess oil; cool and cut into small pieces.' },
    ],
    prepMinutes: 15,
    cookMinutes: 12,
    servings: '۲ تا ۳ وعده کوچک کودک',
    textureFa: 'کتلت نرم و آبدارِ کاملاً پخته، برش‌خورده به قطعات کوچک قابل جویدن',
    textureEn: 'Fully cooked, juicy-tender cutlets cut into chewable pieces',
    allergens: ['EGG', 'GLUTEN'],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ اسم این دستور «کم‌نمک» است چون اصلاً نمک اضافه نمی‌شود.', en: 'Add no salt or sugar; this recipe is called low-salt because no salt is added at all.' },
      { fa: 'کتلت باید تا وسط کاملاً پخته باشد (هیچ قسمت صورتی یا خام نماند) و تخم‌مرغ داخل آن سفت شود.', en: 'The cutlet must be fully cooked to the center (no pink or raw parts) and the egg inside must be set.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'کتلت‌های اضافی را حداکثر ۲۴ ساعت در یخچال نگه دارید و فقط یک‌بار در تابه یا فر گرم کنید.',
    storageEn: 'Keep extra cutlets up to 24 hours in the fridge and reheat once only in a pan or oven.',
    substitutions: [
      { fa: 'مرغ چرخ‌کرده به جای گوشت قرمز', en: 'Ground chicken instead of red meat' },
      { fa: 'آرد جو دوسر به جای خرده نان', en: 'Oat flour instead of breadcrumbs' },
      { fa: 'عدس پخته چرخ‌شده مخلوط با گوشت', en: 'Blended cooked lentils mixed into the meat' },
    ],
    nutrition: { kcal: 190, proteinG: 12, ironMg: 1.5 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۸) سوپ جو و سبزیجات — soup
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'barley-soup',
    audience: 'CHILD',
    ageGroup: '12_15',
    ageFromDays: 365,
    ageToDays: 486,
    category: 'soup',
    mealTypes: ['DINNER'],
    title: 'سوپ جو و سبزیجات',
    titleEn: 'Barley and Vegetable Soup',
    image: '/images/recipes/barley-soup.jpg',
    ingredients: [
      { fa: 'بلغور جو', en: 'Pearl barley', amount: '۲ قاشق غذاخوری' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد' },
      { fa: 'کدوسبز', en: 'Zucchini', amount: '۱ عدد کوچک' },
      { fa: 'پیاز', en: 'Onion', amount: 'نصف عدد' },
      { fa: 'مرغ پخته ریزشده (اختیاری)', en: 'Cooked shredded chicken (optional)', amount: '۲ قاشق غذاخوری' },
      { fa: 'آب', en: 'Water', amount: '۲.۵ پیمانه' },
    ],
    steps: [
      { fa: 'بلغور جو را بشویید و با پیاز خردشده و آب بگذارید بجوشد.', en: 'Rinse the barley and combine with the chopped onion and water; bring to a boil.' },
      { fa: '۳۰ تا ۴۰ دقیقه روی حرارت ملایم بپزید و گاهی هم بزنید تا جو کاملاً باز و نرم شود.', en: 'Simmer 30-40 minutes over low heat, stirring occasionally, until the barley is fully soft and swollen.' },
      { fa: 'سبزیجات ریزخردشده را اضافه کنید و ۱۵ دقیقه دیگر بپزید.', en: 'Add the finely diced vegetables and cook 15 more minutes.' },
      { fa: 'در صورت تمایل مرغ پخته ریزشده را اضافه کنید و ۵ دقیقه بجوشانید.', en: 'Stir in the shredded cooked chicken if using and simmer 5 minutes.' },
      { fa: 'غلظت را با آب تنظیم کنید، تا دمای بدن خنک کنید و به کودک بدهید.', en: 'Adjust the thickness with water, cool to body temperature and serve.' },
    ],
    prepMinutes: 10,
    cookMinutes: 55,
    servings: '۱ تا ۲ وعده کودک',
    textureFa: 'سوپ غلیظ و کش‌دار با جوی کاملاً پخته و سبزیجات نرم',
    textureEn: 'Thick, silky soup with fully cooked barley and soft vegetables',
    allergens: ['GLUTEN'],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ طعم سوپ باید طبیعی باشد.', en: 'Add no salt or sugar; the soup should taste natural.' },
      { fa: 'جو حاوی گلوتن است و برای کودک مبتلا به سلیاک یا حساسیت به گلوتن مناسب نیست.', en: 'Barley contains gluten and is not suitable for a child with celiac disease or gluten sensitivity.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال؛ فقط یک‌بار گرم کنید و در صورت غلیظ‌شدن کمی آب جوشیده خنک اضافه کنید.',
    storageEn: 'Refrigerate up to 24 hours; reheat once only and thin with a little cooled boiled water if it thickens.',
    substitutions: [
      { fa: 'جو دوسر به جای بلغور جو', en: 'Rolled oats instead of pearl barley' },
      { fa: 'برنج به جای جو (نسخه بدون گلوتن)', en: 'Rice instead of barley (gluten-free version)' },
      { fa: 'عدس به جای جو', en: 'Lentils instead of barley' },
    ],
    nutrition: { kcal: 150, proteinG: 6, fiberG: 3.5 },
    medicalSource: 'AAP — Infant food safety (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/Starting-Solid-Foods.aspx',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۹) املت کاملاً پخته — breakfast
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'fully-cooked-omelette',
    audience: 'CHILD',
    ageGroup: '12_15',
    ageFromDays: 365,
    ageToDays: 486,
    category: 'breakfast',
    mealTypes: ['BREAKFAST'],
    title: 'املت کاملاً پخته',
    titleEn: 'Fully Cooked Omelette',
    image: '/images/recipes/omelette.jpg',
    ingredients: [
      { fa: 'تخم‌مرغ', en: 'Egg', amount: '۱ عدد' },
      { fa: 'شیر کامل پاستوریزه', en: 'Pasteurized whole milk', amount: '۱ قاشق غذاخوری' },
      { fa: 'گوجه رسیده پوست‌کنده و ریزخردشده', en: 'Peeled ripe tomato, finely diced', amount: '۱ قاشق غذاخوری' },
      { fa: 'سبزی خردشده (تره یا اسفناج)', en: 'Chopped leek or spinach', amount: '۱ قاشق غذاخوری' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: 'چند قطره' },
    ],
    steps: [
      { fa: 'تخم‌مرغ را با شیر، گوجه و سبزی ریزخردشده هم بزنید.', en: 'Whisk the egg with the milk, tomato and finely chopped herbs.' },
      { fa: 'تابه نچسب را با چند قطره روغن روی حرارت کم گرم کنید.', en: 'Heat a non-stick pan with a few drops of oil over low heat.' },
      { fa: 'مخلوط را بریزید، درپوش بگذارید و ۴ تا ۵ دقیقه بپزید تا سطح کاملاً سفت شود.', en: 'Pour in the mixture, cover and cook 4-5 minutes until the surface is completely set.' },
      { fa: 'برگردانید و ۲ دقیقه طرف دیگر را بپزید؛ هیچ قسمت آبدار یا مایع نماند.', en: 'Flip and cook 2 more minutes; no part may remain watery or liquid.' },
      { fa: 'به نوارهای نرم برش بزنید، تا دمای بدن خنک کنید و به کودک بدهید.', en: 'Cut into soft strips, cool to body temperature and serve.' },
    ],
    prepMinutes: 5,
    cookMinutes: 8,
    servings: '۱ وعده کودک',
    textureFa: 'املت کاملاً سفت و نرم، برش‌خورده به نوارهای قابل گرفتن',
    textureEn: 'Fully set, soft omelette cut into graspable strips',
    allergens: ['EGG', 'MILK'],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ نمک اضافه برای کلیه کودک ضروری نیست.', en: 'Add no salt or sugar; added salt is unnecessary for a toddler kidneys.' },
      { fa: 'املت باید در همه قسمت‌ها کاملاً سفت شود؛ تخم‌مرغ نیم‌پز برای کودک ممنوع است.', en: 'The omelette must be fully set throughout; undercooked egg is not allowed for toddlers.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'بهترین حالت مصرف تازه است؛ باقی‌مانده حداکثر ۲۴ ساعت در یخچال و فقط یک‌بار گرم‌کردن.',
    storageEn: 'Best served fresh; keep leftovers up to 24 hours in the fridge and reheat once only.',
    substitutions: [
      { fa: 'حذف شیر در صورت حساسیت به پروتئین شیر', en: 'Omit milk if there is a milk-protein sensitivity' },
      { fa: 'اضافه‌کردن پنیر پاستوریزه کم‌نمک رنده‌شده', en: 'Add grated pasteurized low-salt cheese' },
    ],
    nutrition: { kcal: 140, proteinG: 9 },
    medicalSource: 'AAP — Food allergy prevention (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/healthy-living/nutrition/Pages/Food-Allergies.aspx',
    reviewedAt: '2025-10-15',
  },

  // ════════════════════════════════════════════════════════════════════
  // سن ۱۶ تا ۱۸ ماه (487 تا 577 روز) — غذای خانگی با تکه‌های نرم
  // ════════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────────
  // ۲۰) خوراک گوشت و سبزیجات — dinner
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'meat-veg-stew',
    audience: 'CHILD',
    ageGroup: '16_18',
    ageFromDays: 487,
    ageToDays: 577,
    category: 'dinner',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'خوراک گوشت و سبزیجات',
    titleEn: 'Meat and Vegetable Stew',
    image: '/images/recipes/family-stew.jpg',
    ingredients: [
      { fa: 'گوشت گوسفند یا گوساله مکعبی', en: 'Cubed lamb or beef', amount: '۶۰ گرم' },
      { fa: 'سیب‌زمینی', en: 'Potato', amount: '۱ عدد کوچک' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد' },
      { fa: 'لوبیا سبز خردشده', en: 'Trimmed green beans, chopped', amount: '۲ قاشق غذاخوری' },
      { fa: 'گوجه رسیده پوست‌کنده', en: 'Peeled ripe tomato', amount: '۱ عدد کوچک' },
      { fa: 'آب', en: 'Water', amount: '۲ پیمانه' },
    ],
    steps: [
      { fa: 'گوشت را با آب بگذارید بجوشد، کف بگیرید و ۳۰ دقیقه بپزید.', en: 'Bring the meat and water to a boil, skim and simmer 30 minutes.' },
      { fa: 'سیب‌زمینی، هویج و لوبیای سبز خردشده را اضافه کنید و ۲۰ تا ۲۵ دقیقه بپزید تا همه کاملاً نرم شوند.', en: 'Add the potato, carrot and chopped green beans; simmer 20-25 minutes until everything is very soft.' },
      { fa: 'گوجه پوست‌کنده را اواخر پخت اضافه کنید تا کاملاً باز شود.', en: 'Add the peeled tomato near the end so it breaks down completely.' },
      { fa: 'بخشی از تکه‌ها را با قاشق له کنید؛ خوراک باید تکه‌های نرمِ قابل له‌شدن با قاشق و لثه داشته باشد.', en: 'Mash some of the pieces with a spoon; the stew should contain soft pieces that squash easily.' },
      { fa: 'تا دمای بدن خنک کنید؛ کنار برنج نرم یا کمی نان نرم بدهید.', en: 'Cool to body temperature; serve with soft rice or a little soft bread.' },
    ],
    prepMinutes: 15,
    cookMinutes: 55,
    servings: '۱ تا ۲ وعده کودک',
    textureFa: 'خوراک خانگی نرم با تکه‌های کوچک قابل له‌کردن با قاشق',
    textureEn: 'Home-style stew with small fork-mashable pieces',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ خوراک کودک باید از ظرف خانواده جدا و بی‌نمک تهیه شود.', en: 'Add no salt or sugar; cook the childs portion separately from the seasoned family pot.' },
      { fa: 'گوشت را کاملاً بپزید و مطمئن شوید هیچ استخوان یا قطعه سختی در خوراک نیست؛ تکه‌ها را کوچک ببرید.', en: 'Cook the meat fully and make sure no bones or hard pieces remain; cut the pieces small.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال در ظرف دربسته؛ فقط یک‌بار گرم کنید و باقی‌مانده گرم‌شده را دور بریزید.',
    storageEn: 'Refrigerate covered up to 24 hours; reheat once only and discard leftovers of the reheated portion.',
    substitutions: [
      { fa: 'مرغ به جای گوشت قرمز', en: 'Chicken instead of red meat' },
      { fa: 'نخود فرنگی پخته به جای لوبیا سبز', en: 'Cooked green peas instead of green beans' },
    ],
    nutrition: { kcal: 210, proteinG: 13, ironMg: 2 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۲۱) برنج و مرغ نرم — lunch
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'soft-rice-chicken',
    audience: 'CHILD',
    ageGroup: '16_18',
    ageFromDays: 487,
    ageToDays: 577,
    category: 'lunch',
    mealTypes: ['LUNCH'],
    title: 'برنج و مرغ نرم',
    titleEn: 'Soft Rice and Chicken',
    image: '/images/recipes/rice-meat-veg.jpg',
    ingredients: [
      { fa: 'برنج', en: 'Rice', amount: '۳ قاشق غذاخوری' },
      { fa: 'ران مرغ بدون استخوان', en: 'Boneless chicken thigh', amount: '۱ عدد کوچک' },
      { fa: 'پیاز', en: 'Onion', amount: 'نصف عدد' },
      { fa: 'زردچوبه (اختیاری)', en: 'Turmeric (optional)', amount: 'یک‌هشتم قاشق چای‌خوری' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق چای‌خوری' },
    ],
    steps: [
      { fa: 'مرغ را با پیاز و آب بپزید تا کاملاً پخته شود (حدود ۲۵ دقیقه)؛ سپس از آب دربیاورید.', en: 'Simmer the chicken with the onion and water until fully cooked (about 25 minutes), then remove.' },
      { fa: 'استخوان‌ها را جدا کنید و گوشت را ریز بکشید یا خورد کنید.', en: 'Remove all bones and shred or mince the meat finely.' },
      { fa: 'برنج را در همان آب مرغ با زردچوبه بپزید تا نرم شود.', en: 'Cook the rice in the same chicken broth with the turmeric until soft.' },
      { fa: 'مرغ ریش‌شده، برنج نرم و روغن زیتون را مخلوط کنید.', en: 'Combine the shredded chicken, soft rice and olive oil.' },
      { fa: 'تا دمای بدن خنک کنید و بدهید؛ قطعات را برای خودخوری کوچک کنید.', en: 'Cool to body temperature and serve; keep pieces small for self-feeding.' },
    ],
    prepMinutes: 10,
    cookMinutes: 35,
    servings: '۱ وعده کودک',
    textureFa: 'برنج نرم با رشته‌های ریز مرغ؛ تکه‌های نرم قابل جویدن',
    textureEn: 'Soft rice with shredded chicken; tender chewable pieces',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ زردچوبه فقط به مقدار خیلی کم و اختیاری است.', en: 'Add no salt or sugar; use only a tiny optional pinch of turmeric.' },
      { fa: 'مرغ باید کاملاً پخته باشد و هیچ استخوان یا تیغ ریز در گوشت نمانده باشد؛ قبل از دادن دوباره بررسی کنید.', en: 'The chicken must be fully cooked with no bones or tiny cartilage left; check again before serving.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال؛ فقط یک‌بار گرم کنید.',
    storageEn: 'Refrigerate up to 24 hours; reheat once only.',
    substitutions: [
      { fa: 'بوقلمون به جای مرغ', en: 'Turkey instead of chicken' },
      { fa: 'ماهی کم‌جیوه به جای مرغ', en: 'Low-mercury fish instead of chicken' },
      { fa: 'عدس پخته مخلوط با برنج', en: 'Cooked lentils mixed with the rice' },
    ],
    nutrition: { kcal: 200, proteinG: 12, ironMg: 1 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۲۲) خوراک لوبیا نرم — iron
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'bean-stew',
    audience: 'CHILD',
    ageGroup: '16_18',
    ageFromDays: 487,
    ageToDays: 577,
    category: 'iron',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'خوراک لوبیا نرم',
    titleEn: 'Soft Bean Stew',
    image: '/images/recipes/bean-stew.jpg',
    ingredients: [
      { fa: 'لوبیا چیتی یا سفید خیس‌خورده', en: 'Soaked pinto or white beans', amount: '۳ قاشق غذاخوری' },
      { fa: 'گوجه رسیده پوست‌کنده', en: 'Peeled ripe tomato', amount: '۱ عدد' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد' },
      { fa: 'پیاز', en: 'Onion', amount: 'نصف عدد' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق چای‌خوری' },
    ],
    steps: [
      { fa: 'لوبیا را از شب قبل خیس کنید و آب خیساندن را دور بریزید (نفخ کمتر می‌شود).', en: 'Soak the beans overnight and discard the soaking water (less gas).' },
      { fa: 'لوبیا را با پیاز خردشده و آب تازه ۴۰ دقیقه بپزید تا کاملاً نرم شود.', en: 'Simmer the beans with the chopped onion in fresh water for 40 minutes until completely soft.' },
      { fa: 'گوجه پوست‌کنده و هویج خردشده را اضافه کنید و ۱۵ دقیقه دیگر بپزید.', en: 'Add the peeled tomato and diced carrot; cook 15 more minutes.' },
      { fa: 'بخشی از لوبیاها را با پشت قاشق له کنید تا خوراک غلیظ شود؛ چند لوبیای نرم کامل هم بماند.', en: 'Mash some of the beans with the back of a spoon to thicken; leave a few whole soft beans.' },
      { fa: 'روغن زیتون را اضافه کنید، تا دمای بدن خنک کنید و کنار برنج نرم بدهید.', en: 'Stir in the olive oil, cool to body temperature and serve with soft rice.' },
    ],
    prepMinutes: 10,
    cookMinutes: 55,
    servings: '۱ تا ۲ وعده کودک',
    textureFa: 'لوبیای کاملاً پخته و نرم با سس غلیظ؛ پوسته لوبیا باید به‌راحتی له شود',
    textureEn: 'Fully cooked soft beans in a thick sauce; skins mash easily',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ خوراک حبوبات کودک باید ساده باشد.', en: 'Add no salt or sugar; keep the childs bean dish simple.' },
      { fa: 'حبوبات را کاملاً بپزید؛ لوبیای سفت یا نیم‌پز هم خطر خفگی است و هم برای شکم کودک سنگین است.', en: 'Cook the beans completely; firm or undercooked beans are both a choking hazard and hard to digest.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال؛ فقط یک‌بار گرم کنید. می‌توانید در ظرف دربسته تا ۱ ماه فریزر کنید.',
    storageEn: 'Refrigerate up to 24 hours; reheat once only. Freeze covered up to 1 month.',
    substitutions: [
      { fa: 'عدس پخته به جای لوبیا (پخت سریع‌تر)', en: 'Cooked lentils instead of beans (faster cooking)' },
      { fa: 'لوبیا قرمز به جای لوبیا چیتی', en: 'Red kidney beans instead of pinto beans' },
      { fa: 'کدوحلوایی به جای هویج', en: 'Pumpkin instead of carrot' },
    ],
    nutrition: { kcal: 170, proteinG: 8, ironMg: 2.5, fiberG: 5 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۲۳) سوپ عدس — iron
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'lentil-soup',
    audience: 'CHILD',
    ageGroup: '16_18',
    ageFromDays: 487,
    ageToDays: 577,
    category: 'iron',
    mealTypes: ['DINNER'],
    title: 'سوپ عدس',
    titleEn: 'Lentil Soup',
    image: '/images/recipes/lentil-soup.jpg',
    ingredients: [
      { fa: 'عدس قرمز', en: 'Red lentils', amount: '۳ قاشق غذاخوری' },
      { fa: 'پیاز', en: 'Onion', amount: 'نصف عدد' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد' },
      { fa: 'سیب‌زمینی', en: 'Potato', amount: '۱ عدد کوچک' },
      { fa: 'آب', en: 'Water', amount: '۲.۵ پیمانه' },
      { fa: 'روغن زیتون و آب‌لیمو', en: 'Olive oil and a squeeze of lemon', amount: 'هرکدام ۱ قاشق چای‌خوری' },
    ],
    steps: [
      { fa: 'عدس را بشویید؛ با پیاز خردشده و آب بگذارید بجوشد و کف سطح را بگیرید.', en: 'Rinse the lentils; bring to a boil with the chopped onion and water and skim the foam.' },
      { fa: '۲۰ دقیقه بپزید؛ سپس هویج و سیب‌زمینی ریزخردشده را اضافه کنید.', en: 'Simmer 20 minutes; add the finely diced carrot and potato.' },
      { fa: '۱۵ تا ۲۰ دقیقه دیگر بپزید تا همه مواد کاملاً نرم شوند.', en: 'Cook 15-20 more minutes until everything is completely soft.' },
      { fa: 'بخشی از سوپ را با گوشت‌کوب یا بلندر دستی له کنید تا غلیظ شود اما تکه‌های نرم هم بماند.', en: 'Mash part of the soup with a masher or immersion blender so it thickens while soft pieces remain.' },
      { fa: 'روغن زیتون و کمی آب‌لیمو اضافه کنید (ویتامین C جذب آهن عدس را بیشتر می‌کند)، تا دمای بدن خنک کنید و بدهید.', en: 'Stir in the olive oil and a little lemon juice (vitamin C boosts lentil iron absorption), cool to body temperature and serve.' },
    ],
    prepMinutes: 10,
    cookMinutes: 40,
    servings: '۱ تا ۲ وعده کودک',
    textureFa: 'سوپ غلیظ عدس با تکه‌های نرم سبزیجات',
    textureEn: 'Thick lentil soup with soft vegetable pieces',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ آب‌لیمو به‌جای نمک، طعم را بهتر می‌کند.', en: 'Add no salt or sugar; lemon brightens the flavor instead of salt.' },
      { fa: 'عدس باید کاملاً پخته و له‌شونده باشد؛ دانه‌های سفت را جدا کنید.', en: 'The lentils must be fully cooked and mashable; remove any firm seeds.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال؛ فقط یک‌بار گرم کنید. سوپ اضافی را در ظرف دربسته تا ۱ ماه فریزر کنید.',
    storageEn: 'Refrigerate up to 24 hours; reheat once only. Freeze extra soup covered up to 1 month.',
    substitutions: [
      { fa: 'عدس سبز یا پلویی به جای عدس قرمز', en: 'Green or brown lentils instead of red lentils' },
      { fa: 'لوبیا سفید پخته به جای عدس', en: 'Cooked white beans instead of lentils' },
      { fa: 'کدوحلوایی به جای هویج', en: 'Pumpkin instead of carrot' },
    ],
    nutrition: { kcal: 180, proteinG: 9, ironMg: 2.8, fiberG: 4 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ════════════════════════════════════════════════════════════════════
  // سن ۱۹ تا ۲۴ ماه (578 تا 730 روز) — غذای خانواده نسخه کودک
  // ════════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────────
  // ۲۴) خوراک ماهی کاملاً پخته و برنج — protein
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'cooked-fish-rice',
    audience: 'CHILD',
    ageGroup: '19_24',
    ageFromDays: 578,
    ageToDays: 730,
    category: 'protein',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'خوراک ماهی کاملاً پخته و برنج',
    titleEn: 'Fully Cooked Fish and Rice Plate',
    image: '/images/recipes/fish-rice.jpg',
    ingredients: [
      { fa: 'فیله ماهی کم‌جیوه (سول، کفال یا قزل‌آلا)', en: 'Low-mercury fish fillet (sole, mullet or trout)', amount: '۶۰ گرم' },
      { fa: 'برنج پخته نرم', en: 'Soft cooked rice', amount: '۳ قاشق غذاخوری' },
      { fa: 'هویج و کدوسبز رنده‌شده', en: 'Grated carrot and zucchini', amount: '۲ قاشق غذاخوری' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق چای‌خوری' },
      { fa: 'آب‌لیمو', en: 'Lemon juice', amount: 'چند قطره' },
    ],
    steps: [
      { fa: 'فیله را بررسی کنید و هر استخوانی را با پنس بگیرید.', en: 'Inspect the fillet and remove every bone with tweezers.' },
      { fa: 'ماهی و سبزیجات رنده‌شده را با دو سه قاشق آب روی حرارت ملایم ۱۲ دقیقه بپزید تا ماهی کاملاً ورقه‌ورقه شود.', en: 'Poach the fish with the grated vegetables and 2-3 spoons of water over low heat for 12 minutes until the fish flakes completely.' },
      { fa: 'ماهی را با چنگال ریز کنید و یک بار دیگر استخوان‌ها را بررسی کنید.', en: 'Flake the fish finely with a fork and check for bones one more time.' },
      { fa: 'ماهی، سبزیجات و برنج نرم را با روغن زیتون مخلوط کنید.', en: 'Combine the fish, vegetables and soft rice with the olive oil.' },
      { fa: 'چند قطره آب‌لیمو بزنید، تا دمای بدن خنک کنید و به کودک بدهید.', en: 'Add a few drops of lemon juice, cool to body temperature and serve.' },
    ],
    prepMinutes: 10,
    cookMinutes: 15,
    servings: '۱ وعده کودک',
    textureFa: 'ماهی ورقه‌ورقه و ریز با برنج نرم؛ بدون هیچ استخوان',
    textureEn: 'Finely flaked fish with soft rice; completely boneless',
    allergens: ['FISH'],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ چند قطره آب‌لیمو کافی است.', en: 'Add no salt or sugar; a few drops of lemon are enough.' },
      { fa: 'استخوان‌های ماهی را دو بار بررسی کنید؛ فقط از ماهی کم‌جیوه استفاده کنید (کوسه، شیرماهی و ماهی‌های بزرگ شکارچی ممنوع).', en: 'Check for bones twice; use only low-mercury fish (shark, swordfish and other large predatory species are prohibited).' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'باقی‌مانده را حداکثر ۲۴ ساعت در یخچال نگه دارید و فقط یک‌بار گرم کنید؛ ماهی پخته را بیشتر از این نگه ندارید.',
    storageEn: 'Store leftovers up to 24 hours in the fridge and reheat once only; do not keep cooked fish any longer.',
    substitutions: [
      { fa: 'مرغ پخته به جای ماهی', en: 'Cooked chicken instead of fish' },
      { fa: 'عدس پخته به جای ماهی (نسخه گیاهی)', en: 'Cooked lentils instead of fish (plant-based version)' },
      { fa: 'سالمون کم‌جیوه به جای ماهی سفید', en: 'Low-mercury salmon instead of white fish' },
    ],
    nutrition: { kcal: 220, proteinG: 14, ironMg: 0.8 },
    medicalSource: 'AAP — Food allergy prevention (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/healthy-living/nutrition/Pages/Food-Allergies.aspx',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۲۵) خوراک مرغ و برنج — lunch
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'chicken-rice-plate',
    audience: 'CHILD',
    ageGroup: '19_24',
    ageFromDays: 578,
    ageToDays: 730,
    category: 'lunch',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'خوراک مرغ و برنج',
    titleEn: 'Chicken and Rice Plate',
    image: '/images/recipes/rice-meat-veg.jpg',
    ingredients: [
      { fa: 'ران مرغ بدون استخوان', en: 'Boneless chicken thigh', amount: '۶۰ گرم' },
      { fa: 'برنج', en: 'Rice', amount: '۳ قاشق غذاخوری' },
      { fa: 'هویج رنده‌شده', en: 'Grated carrot', amount: '۲ قاشق غذاخوری' },
      { fa: 'نخود فرنگی پخته', en: 'Cooked green peas', amount: '۱ قاشق غذاخوری' },
      { fa: 'پیاز', en: 'Onion', amount: 'نصف عدد' },
    ],
    steps: [
      { fa: 'مرغ را با پیاز و آب بپزید تا کاملاً پخته شود (۲۰ تا ۲۵ دقیقه)؛ استخوان را جدا کنید و گوشت را خورد کنید.', en: 'Simmer the chicken with the onion and water until fully cooked (20-25 minutes); remove bones and mince the meat.' },
      { fa: 'برنج را با کمی آبِ مرغ بپزید تا نرم شود.', en: 'Cook the rice in a little of the chicken broth until soft.' },
      { fa: 'هویج رنده‌شده و نخود فرنگی را بخارپز کنید تا نرم شوند؛ نخود فرنگی‌ها را با چنگال له کنید.', en: 'Steam the grated carrot and green peas until soft; squash the peas with a fork.' },
      { fa: 'همه را مخلوط کنید؛ در صورت تمایل چند قاشق آب مرغ اضافه کنید تا خوراک نرم و مرطوب شود.', en: 'Combine everything; add a few spoons of chicken broth if you want a softer, moister plate.' },
      { fa: 'تا دمای بدن خنک کنید، قطعات را کوچک کنید و اجازه بدهید کودک خودش با قاشق بخورد.', en: 'Cool to body temperature, keep pieces small and let your toddler self-feed with a spoon.' },
    ],
    prepMinutes: 15,
    cookMinutes: 35,
    servings: '۱ وعده کودک',
    textureFa: 'برنج نرم با قطعات ریز مرغ و سبزیجات نرم؛ مناسب خودخوری با قاشق',
    textureEn: 'Soft rice with small chicken pieces and tender vegetables; spoon-self-feeding friendly',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ غذای کودک را جدا از ظرف نمک‌دار خانواده آماده کنید.', en: 'Add no salt or sugar; prepare the childs plate separately from the familys salted food.' },
      { fa: 'نخود فرنگی و هر دانه گرد را قبل از دادن با چنگال له کنید؛ دانه‌های گرد و لغزنده خطر خفگی دارند.', en: 'Squash peas and any round items with a fork before serving; round slippery pieces are a choking hazard.' },
      { fa: 'مرغ کاملاً پخته و بدون استخوان باشد؛ تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها غذا بخورانید.', en: 'The chicken must be fully cooked and boneless; cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال در ظرف دربسته؛ فقط یک‌بار گرم کنید و باقی‌مانده گرم‌شده را دور بریزید.',
    storageEn: 'Refrigerate covered up to 24 hours; reheat once only and discard leftovers of the reheated portion.',
    substitutions: [
      { fa: 'بوقلمون به جای مرغ', en: 'Turkey instead of chicken' },
      { fa: 'لوبیا سبز خردشده نرم به جای نخود فرنگی', en: 'Softly chopped green beans instead of peas' },
      { fa: 'عدس پخته به جای مرغ', en: 'Cooked lentils instead of chicken' },
    ],
    nutrition: { kcal: 230, proteinG: 14, ironMg: 1.2 },
    medicalSource: 'AAP — Infant food safety (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/Starting-Solid-Foods.aspx',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۲۶) خوراک گوشت و عدس — iron
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'meat-lentil-stew',
    audience: 'CHILD',
    ageGroup: '19_24',
    ageFromDays: 578,
    ageToDays: 730,
    category: 'iron',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'خوراک گوشت و عدس',
    titleEn: 'Meat and Lentil Stew',
    image: '/images/recipes/family-stew.jpg',
    ingredients: [
      { fa: 'گوشت مکعبی کم‌چرب', en: 'Lean cubed meat', amount: '۵۰ گرم' },
      { fa: 'عدس', en: 'Lentils', amount: '۲ قاشق غذاخوری' },
      { fa: 'سیب‌زمینی', en: 'Potato', amount: '۱ عدد کوچک' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد' },
      { fa: 'گوجه رسیده پوست‌کنده', en: 'Peeled ripe tomato', amount: '۱ عدد کوچک' },
      { fa: 'آب', en: 'Water', amount: '۲.۵ پیمانه' },
    ],
    steps: [
      { fa: 'گوشت را با آب بپزید (۲۵ دقیقه) و کف سطح را بگیرید.', en: 'Simmer the meat in water for 25 minutes, skimming the foam.' },
      { fa: 'عدس شسته و سبزیجات خردشده را اضافه کنید؛ ۲۵ تا ۳۰ دقیقه دیگر بپزید تا همه کاملاً نرم شوند.', en: 'Add the rinsed lentils and chopped vegetables; simmer 25-30 more minutes until everything is very soft.' },
      { fa: 'گوجه پوست‌کنده را اواخر پخت اضافه کنید تا باز شود.', en: 'Add the peeled tomato near the end so it breaks down.' },
      { fa: 'بخشی از خوراک را با قاشق له کنید تا غلیظ شود؛ تکه‌های نرم بمانند.', en: 'Mash part of the stew with a spoon to thicken it, leaving soft pieces.' },
      { fa: 'تا دمای بدن خنک کنید و به کودک بدهید؛ برای بزرگ‌ترها می‌توانید با کمی برنج نرم سرو کنید.', en: 'Cool to body temperature and serve; for older toddlers pair with a little soft rice.' },
    ],
    prepMinutes: 15,
    cookMinutes: 60,
    servings: '۱ تا ۲ وعده کودک',
    textureFa: 'خوراک غلیظ با تکه‌های نرم گوشت، عدس و سبزیجات',
    textureEn: 'Thick stew with tender pieces of meat, lentils and vegetables',
    allergens: [],
    safety: [
      { fa: 'هیچ نمک و شکری اضافه نکنید؛ طعم غذا باید طبیعی باشد.', en: 'Add no salt or sugar; the flavor should stay natural.' },
      { fa: 'گوشت و عدس باید هر دو کاملاً پخته و نرم باشند؛ تکه‌های سفت یا رشته‌های گوشت را جدا کنید.', en: 'Both the meat and lentils must be fully cooked and tender; remove any firm pieces or meat strings.' },
      { fa: 'تا دمای بدن خنک کنید و همیشه زیر نظر بزرگ‌ترها به کودک غذا بدهید.', en: 'Cool to body temperature and always feed under adult supervision.' },
    ],
    storageFa: 'حداکثر ۲۴ ساعت در یخچال؛ فقط یک‌بار گرم کنید. برای وعده‌های بعدی می‌توانید در ظرف دربسته تا ۱ ماه فریزر کنید.',
    storageEn: 'Refrigerate up to 24 hours; reheat once only. Freeze covered up to 1 month for later meals.',
    substitutions: [
      { fa: 'مرغ به جای گوشت قرمز', en: 'Chicken instead of red meat' },
      { fa: 'لوبیا پخته به جای عدس', en: 'Cooked beans instead of lentils' },
      { fa: 'قزل‌آلای کم‌جیوه به جای گوشت', en: 'Low-mercury trout instead of meat' },
    ],
    nutrition: { kcal: 230, proteinG: 14, ironMg: 3, fiberG: 4 },
    medicalSource: 'WHO — Complementary feeding guideline (2023)',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240081864',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۲۷) میان‌وعده میوه نرم با ماست — snack
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'soft-fruit-snack',
    audience: 'CHILD',
    ageGroup: '19_24',
    ageFromDays: 578,
    ageToDays: 730,
    category: 'snack',
    mealTypes: ['SNACK'],
    title: 'میان‌وعده میوه نرم با ماست',
    titleEn: 'Soft Fruit Snack with Yogurt',
    image: '/images/recipes/fruit-snack.jpg',
    ingredients: [
      { fa: 'موز رسیده', en: 'Ripe banana', amount: 'نصف عدد' },
      { fa: 'گلابی رسیده پوست‌کنده', en: 'Ripe peeled pear', amount: 'نصف عدد' },
      { fa: 'انگور رسیده', en: 'Ripe grapes', amount: '۵ حبه' },
      { fa: 'ماست کامل چرب ساده پاستوریزه', en: 'Plain pasteurized full-fat yogurt', amount: '۲ قاشق غذاخوری' },
    ],
    steps: [
      { fa: 'میوه‌ها را بشویید؛ گلابی را پوست بکنید و به قطعات نرم برش بزنید.', en: 'Wash the fruit; peel the pear and cut into soft pieces.' },
      { fa: 'موز را به قطعات نرم برش بزنید تا کودک بتواند راحت بردارد.', en: 'Slice the banana into soft pieces the toddler can pick up easily.' },
      { fa: 'انگور را پوست بکنید و هر حبه را از طول به چهار قسمت تقسیم کنید.', en: 'Peel the grapes and quarter each one lengthwise.' },
      { fa: 'ماست را در یک کاسه کوچک کنار میوه‌ها بگذارید تا کودک میوه را در آن فرو ببرد.', en: 'Place the yogurt in a small bowl beside the fruit for dipping.' },
      { fa: 'در بشقاب جدا بچینید، کنار کودک بنشینید و اجازه بدهید خودش انتخاب کند.', en: 'Arrange on a plate, sit beside your toddler and let them choose.' },
    ],
    prepMinutes: 10,
    cookMinutes: 0,
    servings: '۱ میان‌وعده کودک',
    textureFa: 'قطعات میوه نرم و آبدار با ماست برای فروبردن',
    textureEn: 'Soft juicy fruit pieces with yogurt for dipping',
    allergens: ['MILK'],
    safety: [
      { fa: 'به میوه و ماست هیچ نمک، شکر یا عسلی اضافه نکنید؛ شیرینی طبیعی میوه کافی است.', en: 'Add no salt, sugar or honey to the fruit and yogurt; the natural sweetness of fruit is enough.' },
      { fa: 'انگور را همیشه پوست‌کنده و از طول به چهار قسمت بدهید؛ انگور درشت از شناخته‌شده‌ترین خطرات خفگی در کودکان است.', en: 'Always serve grapes peeled and quartered lengthwise; whole grapes are among the best-known choking hazards for children.' },
      { fa: 'کودک هنگام خوردن باید نشسته باشد و همیشه زیر نظر بزرگ‌تر؛ در حال راه رفتن یا بازی به او غذای برش‌خورده ندهید.', en: 'The toddler must sit while eating and always be supervised; do not hand cut fruit during walking or play.' },
    ],
    storageFa: 'میوه برش‌خورده را تازه آماده کنید و نگه ندارید؛ ماست باز‌شده حداکثر ۲۴ ساعت در یخچال.',
    storageEn: 'Prepare cut fruit fresh and do not store it; refrigerate opened yogurt up to 24 hours.',
    substitutions: [
      { fa: 'هویج نرم آب‌پز به جای میوه', en: 'Soft boiled carrot instead of fruit' },
      { fa: 'پنیر پاستوریزه نرم به جای ماست', en: 'Soft pasteurized cheese instead of yogurt' },
      { fa: 'سیب پخته به جای گلابی', en: 'Cooked apple instead of pear' },
    ],
    nutrition: { kcal: 110, calciumMg: 60, fiberG: 2 },
    medicalSource: 'AAP — Choking prevention (HealthyChildren.org)',
    sourceUrl: 'https://www.healthychildren.org/English/health-issues/injuries-emergencies/Pages/Choking-Prevention.aspx',
    reviewedAt: '2025-10-15',
  },
];
