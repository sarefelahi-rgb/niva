// NIVA — Task 2-d: Seed data for recipes — غذاهای مادر شیرده (BREASTFEEDING_MOTHER)
// Persian text is primary; English is a natural equivalent. Educational only — no diagnostic claims.
//
// قوانین محتوایی رعایت‌شده در همه دستورها:
//  - هیچ ادعای «شیرزا» وجود ندارد؛ هیچ غذایی به‌تنهایی به‌طور قطعی شیر مادر را افزایش نمی‌دهد.
//  - فقط لبنیات پاستوریزه؛ تخم‌مرغ، گوشت و ماهی کاملاً پخته؛ فقط ماهی‌های کم‌جیوه.
//  - یادداشت حساسیت روی دستورهای لبنی/آجیلی، یادداشت کافئین متعادل و پرهیز از الکل،
//    و یادداشت فیبر ملایم/یبوست روی غذاهای نقاهت پس از سزارین.
//
// IMAGE PATHS: only /images/recipes/mother-*.jpg (exact, pre-registered paths).
// medicalSource: 'WHO — Healthy diet' or 'CDC — Nutrition while breastfeeding' + real URL.

export interface SeedRecipeMother {
  slug: string;
  audience: 'BREASTFEEDING_MOTHER';   // always this value
  category: string;  // one of: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'protein' | 'iron' | 'calcium' | 'fiber' | 'quick' | 'recovery'
  mealTypes: Array<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>;
  title: string;      // فارسی
  titleEn: string;
  image: string;      // one of the registered /images/recipes/mother-*.jpg paths
  ingredients: Array<{ fa: string; en: string; amount: string }>;
  steps: Array<{ fa: string; en: string }>;   // 4-7 concrete steps
  prepMinutes: number;
  cookMinutes: number;
  servings: string;   // e.g. '۲ نفر'
  textureFa?: string; // optional for adult dishes
  textureEn?: string;
  allergens: string[]; // subset of: 'EGG','MILK','GLUTEN','NUTS','PEANUT','FISH','SOY','SESAME' — [] when none
  safety: Array<{ fa: string; en: string }>;
  storageFa?: string;
  storageEn?: string;
  substitutions: Array<{ fa: string; en: string }>;
  nutrition?: { kcal?: number; proteinG?: number; ironMg?: number; calciumMg?: number; fiberG?: number };
  medicalSource: string;   // 'WHO — Healthy diet' / 'CDC — Nutrition while breastfeeding'
  sourceUrl?: string;
  reviewedAt: string;      // '2025-10-15'
}

export const SEED_RECIPES_MOTHER: SeedRecipeMother[] = [

  // ────────────────────────────────────────────────────────────────
  // ۱) اوتمیل با شیر پاستوریزه و میوه — breakfast
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-oatmeal',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'breakfast',
    mealTypes: ['BREAKFAST'],
    title: 'اوتمیل با شیر پاستوریزه و میوه',
    titleEn: 'Oatmeal with Pasteurized Milk and Fruit',
    image: '/images/recipes/mother-oatmeal.jpg',
    ingredients: [
      { fa: 'جو دوسر (اوتمیل)', en: 'Rolled oats', amount: 'نصف پیمانه (حدود ۴۰ گرم)' },
      { fa: 'شیر پاستوریزه', en: 'Pasteurized milk', amount: '۱ پیمانه (۲۴۰ میلی‌لیتر)' },
      { fa: 'موز رسیده', en: 'Ripe banana', amount: '۱ عدد متوسط' },
      { fa: 'خرما', en: 'Dates', amount: '۲ عدد، هسته‌گرفته' },
      { fa: 'دارچین', en: 'Ground cinnamon', amount: 'یک‌چهارم قاشق چای‌خوری' },
    ],
    steps: [
      { fa: 'جو دوسر و شیر پاستوریزه را در یک قابلمه کوچک بریزید.', en: 'Combine the oats and pasteurized milk in a small saucepan.' },
      { fa: 'روی حرارت متوسط حدود ۵ تا ۷ دقیقه بپزید و مرتب هم بزنید تا غلیظ شود.', en: 'Cook over medium heat for 5–7 minutes, stirring often, until thick.' },
      { fa: 'از روی حرارت بردارید و چند دقیقه صبر کنید تا کمی خنک شود.', en: 'Remove from the heat and let it cool for a few minutes.' },
      { fa: 'موز حلقه‌شده و خرمای خردشده را روی آن بچینید.', en: 'Top with the sliced banana and chopped dates.' },
      { fa: 'دارچین بپاشید و گرم سرو کنید.', en: 'Sprinkle with cinnamon and serve warm.' },
    ],
    prepMinutes: 5,
    cookMinutes: 7,
    servings: '۱ نفر',
    allergens: ['MILK', 'GLUTEN'],
    safety: [
      { fa: 'فقط از شیر پاستوریزه استفاده کنید و از مصرف شیر خام خودداری کنید.', en: 'Use pasteurized milk only; avoid raw milk.' },
      { fa: 'هیچ غذایی به‌تنهایی شیر مادر را به‌طور قطعی افزایش نمی‌دهد؛ تغذیه متنوع و متعادل و نوشیدن مایعات بر اساس تشنگی مهم‌تر است.', en: 'No single food definitively increases breast-milk supply on its own; a varied, balanced diet and drinking fluids to thirst matter more.' },
      { fa: 'اگر کودک شما علائم حساسیت نشان می‌دهد یا سابقه خانوادگی دارد، با پزشک خود درباره مصرف لبنیات مشورت کنید.', en: 'If your baby shows signs of allergy or there is a family history, talk to your doctor about dairy consumption.' },
      { fa: 'اگر به گلوتن حساسیت دارید، جو دوسر بدون گلوتن تهیه کنید؛ جو دوسر معمولی ممکن است آلودگی گلوتن داشته باشد.', en: 'If you are gluten-sensitive, choose certified gluten-free oats; regular oats may carry gluten cross-contamination.' },
      { fa: 'کافئین را در حد اعتدال مصرف کنید (حداکثر حدود ۳۰۰ میلی‌گرم در روز، تقریباً دو فنجان قهوه) و الکل مصرف نکنید.', en: 'Keep caffeine moderate (at most about 300 mg per day, roughly two cups of coffee) and avoid alcohol entirely.' },
    ],
    storageFa: 'بهترین حالت مصرف تازه است؛ باقی‌مانده را در ظرف دربسته حداکثر ۲۴ ساعت در یخچال نگه دارید و پیش از مصرف کامل گرم کنید.',
    storageEn: 'Best eaten fresh; store leftovers covered in the fridge up to 24 hours and reheat thoroughly before eating.',
    substitutions: [
      { fa: 'شیر پاستوریزه ← ماست پاستوریزه غلیظ‌شده با کمی آب یا نوشیدنی سویای غنی‌شده با کلسیم', en: 'Pasteurized milk ← pasteurized yogurt thinned with a little water, or calcium-fortified soy drink' },
      { fa: 'موز ← سیب رنده‌شده یا توت‌فرنگی شسته', en: 'Banana ← grated apple or washed strawberries' },
      { fa: 'خرما ← یک قاشق چای‌خوری عسل', en: 'Dates ← one teaspoon of honey' },
    ],
    nutrition: { kcal: 380, proteinG: 14, calciumMg: 280, fiberG: 6 },
    medicalSource: 'CDC — Nutrition while breastfeeding',
    sourceUrl: 'https://www.cdc.gov/breastfeeding/php/faq/faq.html',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۲) تخم‌مرغ کاملاً پخته با نان سبوس‌دار — breakfast
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-egg-toast',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'breakfast',
    mealTypes: ['BREAKFAST'],
    title: 'تخم‌مرغ کاملاً پخته با نان سبوس‌دار',
    titleEn: 'Fully Cooked Eggs with Whole-Wheat Toast',
    image: '/images/recipes/mother-egg-toast.jpg',
    ingredients: [
      { fa: 'تخم‌مرغ تازه', en: 'Fresh eggs', amount: '۲ عدد' },
      { fa: 'نان سبوس‌دار', en: 'Whole-wheat bread', amount: '۲ برش' },
      { fa: 'گوجه‌فرنگی', en: 'Tomato', amount: '۱ عدد متوسط' },
      { fa: 'خیار', en: 'Cucumber', amount: '۱ عدد' },
      { fa: 'کره پاستوریزه', en: 'Pasteurized butter', amount: '۱ قاشق چای‌خوری (اختیاری)' },
      { fa: 'نمک و فلفل سیاه', en: 'Salt and black pepper', amount: 'به میزان خیلی کم' },
    ],
    steps: [
      { fa: 'تخم‌مرغ‌ها را در آب در حال جوش بگذارید و ۱۰ دقیقه بپزید تا زرده و سفیده کاملاً سفت شوند.', en: 'Place the eggs in boiling water and cook for 10 minutes until both yolk and white are fully set.' },
      { fa: 'در همین حین گوجه و خیار را بشویید و برش بزنید.', en: 'Meanwhile wash and slice the tomato and cucumber.' },
      { fa: 'تخم‌مرغ‌ها را زیر آب سرد بگیرید، پوست بکنید و خرد کنید.', en: 'Cool the eggs under cold running water, peel and chop them.' },
      { fa: 'نان‌ها را تست کنید و در صورت تمایل مقدار بسیار کمی کره پاستوریزه بمالید.', en: 'Toast the bread and spread a very small amount of pasteurized butter, if you like.' },
      { fa: 'تخم‌مرغ خردشده را روی نان بگذارید، نمک و فلفل بسیار کم بزنید و کنارش گوجه و خیار سرو کنید.', en: 'Pile the chopped egg on the toast, season very lightly, and serve with the tomato and cucumber.' },
    ],
    prepMinutes: 5,
    cookMinutes: 10,
    servings: '۱ نفر',
    allergens: ['EGG', 'GLUTEN'],
    safety: [
      { fa: 'تخم‌مرغ را کاملاً بپزید؛ زرده و سفیده باید سفت باشد. از تخم‌مرغ عسلی یا نیم‌رو در دوره شیردهی پرهیز کنید.', en: 'Cook eggs all the way through; both yolk and white must be firm. Avoid runny or soft-boiled eggs while breastfeeding.' },
      { fa: 'نان سبوس‌دار فیبر این وعده را بالا می‌برد و به پیشگیری از یبوست کمک می‌کند.', en: 'Whole-wheat bread adds fiber to this meal and helps prevent constipation.' },
      { fa: 'کنار صبحانه آب بنوشید و در طول روز مایعات را بر اساس تشنگی تأمین کنید.', en: 'Drink water with breakfast and keep up fluids through the day, drinking to thirst.' },
    ],
    substitutions: [
      { fa: 'نان سبوس‌دار ← نان جو یا سنگک سبوس‌دار', en: 'Whole-wheat bread ← barley bread or whole-grain sangak' },
      { fa: 'کره پاستوریزه ← پنیر خامه‌ای پاستوریزه', en: 'Pasteurized butter ← pasteurized cream cheese' },
      { fa: 'گوجه و خیار ← سبزی خوردن تازه و شسته', en: 'Tomato and cucumber ← fresh washed herbs' },
    ],
    nutrition: { kcal: 350, proteinG: 18, ironMg: 2.2, fiberG: 5 },
    medicalSource: 'WHO — Healthy diet',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۳) عدسی با نان سبوس‌دار — breakfast / iron
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-lentil-stew',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'iron',
    mealTypes: ['BREAKFAST'],
    title: 'عدسی با نان سبوس‌دار',
    titleEn: 'Lentil Stew with Whole-Wheat Bread',
    image: '/images/recipes/mother-lentil-stew.jpg',
    ingredients: [
      { fa: 'عدس', en: 'Red lentils', amount: '۱ پیمانه' },
      { fa: 'پیاز', en: 'Onion', amount: '۱ عدد متوسط' },
      { fa: 'گوجه‌فرنگی رنده‌شده یا رب گوجه', en: 'Grated tomato or tomato paste', amount: '۱ عدد متوسط یا ۱ قاشق غذاخوری' },
      { fa: 'زردچوبه', en: 'Turmeric', amount: 'نصف قاشق چای‌خوری' },
      { fa: 'آبلیموی تازه', en: 'Fresh lemon juice', amount: '۱ قاشق غذاخوری' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق غذاخوری' },
      { fa: 'نمک', en: 'Salt', amount: 'نصف قاشق چای‌خوری یا کمتر' },
      { fa: 'نان سبوس‌دار', en: 'Whole-wheat bread', amount: 'به تعداد نفرات' },
    ],
    steps: [
      { fa: 'عدس را چند بار بشویید تا آب آن زلال شود.', en: 'Rinse the lentils several times until the water runs clear.' },
      { fa: 'پیاز خردشده را در روغن زیتون روی حرارت متوسط تفت دهید تا سبک شود.', en: 'Sauté the chopped onion in olive oil over medium heat until soft.' },
      { fa: 'عدس، زردچوبه و حدود ۳ پیمانه آب را اضافه کنید و بگذارید به جوش بیاید.', en: 'Add the lentils, turmeric and about 3 cups of water and bring to a boil.' },
      { fa: 'کف روی آن را بگیرید و حدود ۳۰ تا ۴۰ دقیقه با حرارت ملایم بپزید تا عدس کاملاً نرم شود.', en: 'Skim the foam and simmer gently for 30–40 minutes until the lentils are completely soft.' },
      { fa: 'گوجه رنده‌شده را اضافه کنید و ۵ دقیقه دیگر بپزید؛ سپس نمک و آبلیمو را بریزید.', en: 'Stir in the grated tomato and cook 5 more minutes; season with salt and lemon juice.' },
      { fa: 'عدسی را داغ با نان سبوس‌دار تازه سرو کنید.', en: 'Serve the stew hot with fresh whole-wheat bread.' },
    ],
    prepMinutes: 10,
    cookMinutes: 40,
    servings: '۳ نفر',
    allergens: ['GLUTEN'],
    safety: [
      { fa: 'عدس منبع خوبی از آهن گیاهی است؛ آبلیموی تازه (ویتامین C) جذب آهن آن را بهتر می‌کند.', en: 'Lentils are a good plant source of iron; fresh lemon juice (vitamin C) improves its absorption.' },
      { fa: 'چای و قهوه را بلافاصله قبل یا بعد از غذا نخورید؛ آن‌ها جذب آهن را کاهش می‌دهند.', en: 'Avoid tea or coffee right before or after meals; they reduce iron absorption.' },
      { fa: 'عدس باید کاملاً نرم و پخته باشد تا به‌راحتی هضم شود.', en: 'Cook the lentils until completely soft so they digest easily.' },
      { fa: 'هیچ غذایی به‌تنهایی شیر مادر را به‌طور قطعی افزایش نمی‌دهد؛ تغذیه متنوع و متعادل و نوشیدن مایعات بر اساس تشنگی مهم‌تر است.', en: 'No single food definitively increases breast-milk supply on its own; a varied, balanced diet and drinking fluids to thirst matter more.' },
    ],
    storageFa: 'در یخچال حداکثر ۲ روز نگه دارید؛ پیش از مصرف تا داغ شدن کامل گرم کنید.',
    storageEn: 'Refrigerate up to 2 days; reheat until steaming hot before serving.',
    substitutions: [
      { fa: 'عدس ← نخود یا لوبیا قرمز کاملاً پخته', en: 'Lentils ← fully cooked chickpeas or red beans' },
      { fa: 'آبلیمو ← گوجه‌فرنگی بیشتر یا کمی آب‌لیمو', en: 'Lemon juice ← extra tomato or a little bottled lime juice' },
      { fa: 'نان سبوس‌دار ← نان جو', en: 'Whole-wheat bread ← barley bread' },
    ],
    nutrition: { kcal: 380, proteinG: 19, ironMg: 6.5, fiberG: 11 },
    medicalSource: 'WHO — Healthy diet',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۴) ماست پاستوریزه و میوه و جو دوسر — breakfast/snack / calcium / quick
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-yogurt-bowl',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'calcium',
    mealTypes: ['BREAKFAST', 'SNACK'],
    title: 'ماست پاستوریزه و میوه و جو دوسر',
    titleEn: 'Pasteurized Yogurt Bowl with Fruit and Oats',
    image: '/images/recipes/mother-yogurt-bowl.jpg',
    ingredients: [
      { fa: 'ماست پاستوریزه ساده', en: 'Plain pasteurized yogurt', amount: '۱ پیمانه' },
      { fa: 'جو دوسر', en: 'Rolled oats', amount: '۳ قاشق غذاخوری' },
      { fa: 'موز یا توت‌فرنگی', en: 'Banana or strawberries', amount: '۱ موز متوسط یا ۵ تا ۶ عدد توت‌فرنگی' },
      { fa: 'خرما', en: 'Dates', amount: '۲ عدد خردشده' },
      { fa: 'دارچین', en: 'Ground cinnamon', amount: 'کمی (اختیاری)' },
    ],
    steps: [
      { fa: 'اگر بافت نرم‌تر می‌خواهید، جو دوسر را ۵ دقیقه در ماست بخوابانید؛ برای بافت تردتر، آن را در تابه خشک ۲ تا ۳ دقیقه برشته کنید.', en: 'For a softer texture, soak the oats in the yogurt for 5 minutes; for extra crunch, toast them in a dry pan for 2–3 minutes.' },
      { fa: 'ماست پاستوریزه را در یک کاسه بریزید.', en: 'Spoon the pasteurized yogurt into a bowl.' },
      { fa: 'میوه‌های شسته و خردشده و خرمای خردشده را روی ماست بچینید.', en: 'Arrange the washed, chopped fruit and the chopped dates over the yogurt.' },
      { fa: 'جو دوسر و کمی دارچین اضافه کنید و بلافاصله سرو کنید.', en: 'Add the oats and a pinch of cinnamon and serve right away.' },
    ],
    prepMinutes: 5,
    cookMinutes: 0,
    servings: '۱ نفر',
    allergens: ['MILK', 'GLUTEN'],
    safety: [
      { fa: 'فقط از ماست پاستوریزه استفاده کنید؛ ماست تهیه‌شده از شیر خام یا لبنیات خانگی غیرپاستوریزه مناسب نیست.', en: 'Use pasteurized yogurt only; yogurt made from raw or unpasteurized milk is not suitable.' },
      { fa: 'اگر کودک شما علائم حساسیت نشان می‌دهد یا سابقه خانوادگی دارد، با پزشک خود درباره مصرف لبنیات مشورت کنید.', en: 'If your baby shows signs of allergy or there is a family history, talk to your doctor about dairy consumption.' },
      { fa: 'اگر به گلوتن حساسیت دارید، جو دوسر بدون گلوتن انتخاب کنید.', en: 'If you are gluten-sensitive, choose certified gluten-free oats.' },
      { fa: 'در طول روز مایعات را بر اساس تشنگی بنوشید.', en: 'Drink fluids throughout the day according to thirst.' },
    ],
    storageFa: 'تازه سرو کنید؛ در ظرف دربسته حداکثر تا ۲۴ ساعت در یخچال قابل نگهداری است.',
    storageEn: 'Serve fresh; keep covered in the fridge for up to 24 hours.',
    substitutions: [
      { fa: 'ماست ساده ← ماست یونانی پاستوریزه یا پنیر کوتاژ پاستوریزه', en: 'Plain yogurt ← pasteurized Greek yogurt or pasteurized cottage cheese' },
      { fa: 'خرما ← یک قاشق چای‌خوری عسل', en: 'Dates ← one teaspoon of honey' },
      { fa: 'توت‌فرنگی ← انار یا سیب خردشده', en: 'Strawberries ← pomegranate seeds or diced apple' },
    ],
    nutrition: { kcal: 320, proteinG: 16, calciumMg: 350, fiberG: 4 },
    medicalSource: 'CDC — Nutrition while breastfeeding',
    sourceUrl: 'https://www.cdc.gov/breastfeeding/php/faq/faq.html',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۵) نان سبوس‌دار، پنیر پاستوریزه و گردوی خردشده — breakfast
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-walnut-bread',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'breakfast',
    mealTypes: ['BREAKFAST', 'SNACK'],
    title: 'نان سبوس‌دار، پنیر پاستوریزه و گردوی خردشده',
    titleEn: 'Whole-Grain Bread with Pasteurized Cheese and Chopped Walnuts',
    image: '/images/recipes/mother-walnut-bread.jpg',
    ingredients: [
      { fa: 'نان سبوس‌دار', en: 'Whole-grain bread', amount: '۲ برش' },
      { fa: 'پنیر پاستوریزه کم‌نمک (پنیر سفید یا خامه‌ای)', en: 'Pasteurized low-salt cheese (white or cream cheese)', amount: '۵۰ گرم' },
      { fa: 'مغز گردو', en: 'Walnut halves', amount: '۵ تا ۶ مغز، درشت‌خرد' },
      { fa: 'گوجه‌گیلاسی', en: 'Cherry tomatoes', amount: '۴ عدد' },
      { fa: 'خیار', en: 'Cucumber', amount: 'نصف عدد' },
      { fa: 'سبزی خوردن', en: 'Fresh herbs', amount: 'یک مشت کوچک، شسته' },
    ],
    steps: [
      { fa: 'مغزهای گردو را روی تخته درشت خرد کنید.', en: 'Coarsely chop the walnuts on a board.' },
      { fa: 'نان‌ها را در تستر یا تابه خشک کمی گرم کنید.', en: 'Warm the bread briefly in a toaster or dry pan.' },
      { fa: 'پنیر پاستوریزه را روی نان بمالید.', en: 'Spread the pasteurized cheese on the bread.' },
      { fa: 'گردوی خردشده را روی پنیر بپاشید.', en: 'Scatter the chopped walnuts over the cheese.' },
      { fa: 'با گوجه‌گیلاسی، خیار و سبزی خوردن سرو کنید.', en: 'Serve with cherry tomatoes, cucumber and fresh herbs.' },
    ],
    prepMinutes: 8,
    cookMinutes: 0,
    servings: '۱ نفر',
    allergens: ['MILK', 'GLUTEN', 'NUTS'],
    safety: [
      { fa: 'پنیر را از محصولات پاستوریزه انتخاب کنید؛ از پنیرهای نرم غیرپاستوریزه (مانند انواع بلوچیز و کاممبر) پرهیز کنید.', en: 'Choose pasteurized cheese products; avoid soft unpasteurized cheeses (such as blue cheese and Camembert).' },
      { fa: 'اگر کودک شما علائم حساسیت نشان می‌دهد یا سابقه خانوادگی دارد، با پزشک خود درباره مصرف لبنیات و آجیل مشورت کنید.', en: 'If your baby shows signs of allergy or there is a family history, talk to your doctor about consuming dairy and nuts.' },
      { fa: 'گردو کالری بالایی دارد؛ در روز به یک مشت کوچک مغزهای متنوع (حدود ۳۰ گرم) بسنده کنید.', en: 'Walnuts are calorie-dense; a small handful of mixed nuts (about 30 g) per day is enough.' },
    ],
    storageFa: 'تازه سرو شود؛ در صورت نیاز در ظرف دربسته حداکثر ۱ روز در یخچال نگه دارید.',
    storageEn: 'Serve fresh; if needed, keep covered in the fridge up to 1 day.',
    substitutions: [
      { fa: 'گردو ← بادام یا فندق خردشده', en: 'Walnuts ← chopped almonds or hazelnuts' },
      { fa: 'پنیر سفید ← پنیر کوتاژ پاستوریزه', en: 'White cheese ← pasteurized cottage cheese' },
      { fa: 'نان سبوس‌دار ← نان جو', en: 'Whole-grain bread ← barley bread' },
    ],
    nutrition: { kcal: 400, proteinG: 16, calciumMg: 220, fiberG: 5 },
    medicalSource: 'CDC — Nutrition while breastfeeding',
    sourceUrl: 'https://www.cdc.gov/breastfeeding/php/faq/faq.html',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۶) خوراک مرغ و سبزیجات — lunch / protein
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-chicken-veg',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'protein',
    mealTypes: ['LUNCH'],
    title: 'خوراک مرغ و سبزیجات',
    titleEn: 'Chicken and Vegetable Skillet',
    image: '/images/recipes/mother-chicken-veg.jpg',
    ingredients: [
      { fa: 'سینه مرغ', en: 'Chicken breast', amount: '۳۰۰ گرم، مکعبی' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد بزرگ' },
      { fa: 'کدو سبز', en: 'Zucchini', amount: '۱ عدد' },
      { fa: 'فلفل دلمه‌ای', en: 'Bell pepper', amount: '۱ عدد' },
      { fa: 'پیاز', en: 'Onion', amount: '۱ عدد' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق غذاخوری' },
      { fa: 'آب', en: 'Water', amount: 'نصف پیمانه' },
      { fa: 'نمک و زردچوبه', en: 'Salt and turmeric', amount: 'به میزان کم' },
    ],
    steps: [
      { fa: 'مرغ را بشویید و به قطعات مکعبی یک‌اندازه خرد کنید.', en: 'Rinse the chicken and cut it into evenly sized cubes.' },
      { fa: 'پیاز را در روغن زیتون تفت دهید تا شیشه‌ای شود، سپس مرغ را اضافه کنید و ۵ دقیقه تفت دهید.', en: 'Sauté the onion in olive oil until translucent, add the chicken and cook 5 minutes.' },
      { fa: 'هویج و نصف پیمانه آب را اضافه کنید، درب قابلمه را بگذارید و ۱۰ دقیقه بپزید.', en: 'Add the carrot and half a cup of water, cover and cook 10 minutes.' },
      { fa: 'کدو و فلفل دلمه‌ای خردشده را اضافه کنید و حدود ۱۰ دقیقه دیگر بپزید تا سبزیجات نرم و مرغ کاملاً پخته شود.', en: 'Add the chopped zucchini and bell pepper and cook about 10 more minutes, until the vegetables are soft and the chicken fully cooked.' },
      { fa: 'یک قطعه مرغ را برش بزنید؛ داخل آن باید کاملاً سفید و بدون رنگ صورتی باشد.', en: 'Cut into one piece of chicken; the inside should be completely white with no pink.' },
      { fa: 'نمک و زردچوبه را اضافه کنید و با برنج یا نان سبوس‌دار سرو کنید.', en: 'Season with salt and turmeric and serve with rice or whole-wheat bread.' },
    ],
    prepMinutes: 15,
    cookMinutes: 25,
    servings: '۲ نفر',
    allergens: [],
    safety: [
      { fa: 'مرغ باید کاملاً پخته شود؛ داخل تکه‌های مرغ نباید صورتی یا ژله‌ای باشد.', en: 'Cook the chicken thoroughly; the inside of the pieces must not be pink or jelly-like.' },
      { fa: 'برای گوشت خام و سبزیجات تخته و چاقوی جدا استفاده کنید تا آلودگی متقاطع پیش نیاید.', en: 'Use a separate board and knife for raw meat and vegetables to prevent cross-contamination.' },
      { fa: 'پروتئین کافی در دوره شیردهی به حفظ توان و توده عضلانی مادر کمک می‌کند؛ منابع پروتئین را در وعده‌ها متنوع کنید.', en: 'Enough protein while breastfeeding helps maintain the mother\u2019s strength and muscle mass; vary protein sources across meals.' },
      { fa: 'کنار غذا آب بنوشید و در طول روز مایعات را بر اساس تشنگی تأمین کنید.', en: 'Drink water with the meal and keep up fluids through the day, drinking to thirst.' },
    ],
    storageFa: 'در یخچال حداکثر ۲ روز؛ پیش از مصرف تا داغ شدن کامل گرم کنید.',
    storageEn: 'Refrigerate up to 2 days; reheat until piping hot before eating.',
    substitutions: [
      { fa: 'سینه مرغ ← ران مرغ بدون استخوان و بدون پوست', en: 'Chicken breast ← boneless, skinless chicken thigh' },
      { fa: 'کدو سبز ← کلم بروکلی کاملاً پخته', en: 'Zucchini ← fully cooked broccoli' },
      { fa: 'فلفل دلمه‌ای ← قارچ کاملاً پخته', en: 'Bell pepper ← fully cooked mushrooms' },
    ],
    nutrition: { kcal: 380, proteinG: 38, ironMg: 2.4, fiberG: 4 },
    medicalSource: 'WHO — Healthy diet',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۷) عدس‌پلو با منبع پروتئین — lunch / iron + protein
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-lentil-rice',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'iron',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'عدس‌پلو با گوشت چرخ‌کرده کاملاً پخته',
    titleEn: 'Lentil Rice with Fully Cooked Minced Meat',
    image: '/images/recipes/mother-lentil-rice.jpg',
    ingredients: [
      { fa: 'برنج', en: 'Rice', amount: '۱.۵ پیمانه' },
      { fa: 'عدس', en: 'Lentils', amount: 'نصف پیمانه' },
      { fa: 'گوشت چرخ‌کرده گوساله یا گوسفند', en: 'Minced beef or lamb', amount: '۲۰۰ گرم' },
      { fa: 'پیاز', en: 'Onion', amount: '۱ عدد بزرگ' },
      { fa: 'کشمش', en: 'Raisins', amount: '۲ قاشق غذاخوری' },
      { fa: 'زردچوبه و دارچین', en: 'Turmeric and cinnamon', amount: 'هر کدام نصف قاشق چای‌خوری' },
      { fa: 'نمک', en: 'Salt', amount: 'به میزان کم' },
      { fa: 'روغن', en: 'Oil', amount: '۲ قاشق غذاخوری' },
    ],
    steps: [
      { fa: 'عدس را در آب بجوشانید تا نیم‌پز شود، سپس آبکش کنید.', en: 'Boil the lentils until half-cooked, then drain.' },
      { fa: 'برنج را با کمی نمک در آب جوش نیم‌پز و آبکش کنید.', en: 'Parboil the rice in salted boiling water and drain.' },
      { fa: 'پیاز خردشده را تفت دهید، گوشت چرخ‌کرده را اضافه کنید و هم بزنید تا کاملاً قهوه‌ای و پخته شود.', en: 'Sauté the chopped onion, add the minced meat and stir until completely browned and cooked through.' },
      { fa: 'نیمی از برنج، عدس، مخلوط گوشت و کشمش را لایه‌لایه در قابلمه بریزید و بقیه برنج را رویش بدهید.', en: 'Layer half the rice, the lentils, the meat mixture and the raisins in the pot, then cover with the rest of the rice.' },
      { fa: 'کمی روغن و چند قاشق آب روی برنج بدهید، درب را بگذارید و روی حرارت کم حدود ۴۵ دقیقه دم کنید.', en: 'Drizzle a little oil and a few spoons of water over the rice, cover, and steam on low heat for about 45 minutes.' },
      { fa: 'کنارش سالاد شسته با آبلیمو بدهید تا جذب آهن عدس بهتر شود.', en: 'Serve with a washed salad dressed with lemon juice to improve iron absorption from the lentils.' },
    ],
    prepMinutes: 15,
    cookMinutes: 50,
    servings: '۳ نفر',
    allergens: [],
    safety: [
      { fa: 'گوشت چرخ‌کرده باید کاملاً پخته و قهوه‌ای شود؛ گوشت نیم‌پز یا صورتی در دوره شیردهی مناسب نیست.', en: 'Minced meat must be fully cooked and brown throughout; undercooked or pink meat is not suitable while breastfeeding.' },
      { fa: 'برای جذب بهتر آهن عدس، همراه غذا منبع ویتامین C (آبلیمو، گوجه، فلفل دلمه) بخورید.', en: 'Pair the meal with a vitamin-C source (lemon juice, tomato, bell pepper) to absorb the lentils\u2019 iron better.' },
      { fa: 'هیچ غذایی به‌تنهایی شیر مادر را به‌طور قطعی افزایش نمی‌دهد؛ تغذیه متنوع و متعادل و نوشیدن مایعات بر اساس تشنگی مهم‌تر است.', en: 'No single food definitively increases breast-milk supply on its own; a varied, balanced diet and drinking fluids to thirst matter more.' },
    ],
    storageFa: 'در یخچال حداکثر ۲ روز؛ پیش از مصرف تا داغ شدن کامل گرم کنید.',
    storageEn: 'Refrigerate up to 2 days; reheat until piping hot before eating.',
    substitutions: [
      { fa: 'گوشت چرخ‌کرده ← سویای پروتئین‌دار کاملاً پخته یا قارچ', en: 'Minced meat ← fully cooked textured soy protein or mushrooms' },
      { fa: 'کشمش ← خرما خردشده', en: 'Raisins ← chopped dates' },
      { fa: 'عدس ← لوبیا چیتی نیم‌پز', en: 'Lentils ← half-cooked pinto beans' },
    ],
    nutrition: { kcal: 520, proteinG: 26, ironMg: 6.8, fiberG: 8 },
    medicalSource: 'WHO — Healthy diet',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۸) ماهی کم‌جیوه و کاملاً پخته با برنج — lunch/dinner
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-fish-rice',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'lunch',
    mealTypes: ['LUNCH', 'DINNER'],
    title: 'ماهی کم‌جیوه کاملاً پخته با برنج',
    titleEn: 'Fully Cooked Low-Mercury Fish with Rice',
    image: '/images/recipes/mother-fish-rice.jpg',
    ingredients: [
      { fa: 'فیله سالمون یا قزل‌آلای تازه', en: 'Fresh salmon or trout fillet', amount: '۲۰۰ گرم' },
      { fa: 'برنج', en: 'Rice', amount: '۱ پیمانه' },
      { fa: 'آبلیموی تازه', en: 'Fresh lemon juice', amount: '۱ قاشق غذاخوری' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق غذاخوری' },
      { fa: 'سیر', en: 'Garlic', amount: '۱ حبه' },
      { fa: 'جعفری', en: 'Parsley', amount: 'چند شاخه' },
      { fa: 'نمک و فلفل سیاه', en: 'Salt and black pepper', amount: 'به میزان خیلی کم' },
    ],
    steps: [
      { fa: 'برنج را با کمی نمک آبکش و دم کنید.', en: 'Parboil and steam the rice with a little salt.' },
      { fa: 'فیله ماهی را با دستمال خشک کنید و با آبلیمو، سیر رنده‌شده و کمی روغن زیتون مزه‌دار کنید.', en: 'Pat the fillet dry and marinate it with lemon juice, grated garlic and a little olive oil.' },
      { fa: 'تابه را گرم کنید و ماهی را هر طرف ۴ تا ۵ دقیقه روی حرارت متوسط بپزید.', en: 'Heat the pan and cook the fish 4–5 minutes per side over medium heat.' },
      { fa: 'با چنگال گوشت را امتحان کنید: باید راحت ورق شود و کاملاً مات و تکه‌تکه باشد، نه شفاف و ژله‌ای.', en: 'Test with a fork: the flesh should flake easily and look fully opaque, not translucent or jelly-like.' },
      { fa: 'ماهی را با برنج دم‌کشیده، جعفری خردشده و برش لیمو سرو کنید.', en: 'Serve the fish with steamed rice, chopped parsley and a lemon wedge.' },
    ],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: '۲ نفر',
    allergens: ['FISH'],
    safety: [
      { fa: 'فقط ماهی‌های کم‌جیوه مانند سالمون، ساردین و قزل‌آلا بخورید؛ از ماهی‌های پُرجیوه مانند کوسه، شمشیرماهی و ماکرل سلطانی پرهیز کنید.', en: 'Eat only low-mercury fish such as salmon, sardines and trout; avoid high-mercury fish such as shark, swordfish and king mackerel.' },
      { fa: 'ماهی را کاملاً بپزید؛ ماهی خام، ساشیمی یا دودی در دوره شیردهی مناسب نیست.', en: 'Cook fish all the way through; raw, sashimi-style or smoked fish is not suitable while breastfeeding.' },
      { fa: 'حدود ۲ تا ۳ وعده ماهی کم‌جیوه در هفته انتخاب خوبی برای امگا-۳ است.', en: 'About 2–3 servings of low-mercury fish per week are a good omega-3 choice.' },
      { fa: 'در طول روز مایعات را بر اساس تشنگی بنوشید.', en: 'Drink fluids throughout the day according to thirst.' },
    ],
    storageFa: 'ماهی پخته را همان روز مصرف کنید؛ حداکثر ۲۴ ساعت در یخچال نگه دارید و کاملاً گرم کنید.',
    storageEn: 'Eat cooked fish the same day; store at most 24 hours in the fridge and reheat thoroughly.',
    substitutions: [
      { fa: 'سالمون ← قزل‌آلا یا ساردین', en: 'Salmon ← trout or sardines' },
      { fa: 'برنج ← کینوای کاملاً پخته', en: 'Rice ← fully cooked quinoa' },
      { fa: 'جعفری ← شوید تازه', en: 'Parsley ← fresh dill' },
    ],
    nutrition: { kcal: 480, proteinG: 33, ironMg: 1.6 },
    medicalSource: 'CDC — Nutrition while breastfeeding',
    sourceUrl: 'https://www.cdc.gov/breastfeeding/php/faq/faq.html',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۹) خوراک لوبیا و سبزیجات — lunch / fiber + iron
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-bean-stew',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'fiber',
    mealTypes: ['LUNCH'],
    title: 'خوراک لوبیا و سبزیجات',
    titleEn: 'Bean and Vegetable Stew',
    image: '/images/recipes/mother-bean-stew.jpg',
    ingredients: [
      { fa: 'لوبیا چیتی خیس‌خورده', en: 'Soaked pinto beans', amount: '۱.۵ پیمانه' },
      { fa: 'گوجه‌فرنگی', en: 'Tomatoes', amount: '۲ عدد' },
      { fa: 'رب گوجه', en: 'Tomato paste', amount: '۱ قاشق غذاخوری' },
      { fa: 'پیاز', en: 'Onion', amount: '۱ عدد' },
      { fa: 'سیر', en: 'Garlic', amount: '۲ حبه' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق غذاخوری' },
      { fa: 'زردچوبه و نمک', en: 'Turmeric and salt', amount: 'به میزان کم' },
      { fa: 'آبلیموی تازه', en: 'Fresh lemon juice', amount: '۱ قاشق غذاخوری' },
    ],
    steps: [
      { fa: 'لوبیا را از شب قبل در آب بخیسانید و آب آن را دور بریزید تا نفخ آن کمتر شود.', en: 'Soak the beans overnight, then discard the soaking water to reduce gas.' },
      { fa: 'لوبیا را در آب تازه بجوشانید تا نیم‌پز شود.', en: 'Boil the beans in fresh water until half-cooked.' },
      { fa: 'پیاز و سیر را در روغن زیتون تفت دهید، رب و گوجه خردشده را اضافه کنید و کمی تفت بدهید.', en: 'Sauté the onion and garlic in olive oil, add the paste and chopped tomatoes and cook briefly.' },
      { fa: 'هویج خردشده، لوبیای نیم‌پز و ۲ پیمانه آب را اضافه کنید.', en: 'Add the diced carrot, the half-cooked beans and 2 cups of water.' },
      { fa: 'حدود ۳۰ تا ۴۰ دقیقه با حرارت ملایم بپزید تا لوبیا کاملاً نرم شود؛ نمک را آخر اضافه کنید.', en: 'Simmer gently for 30–40 minutes until the beans are completely soft; add salt at the end.' },
      { fa: 'با آبلیموی تازه و نان یا برنج سرو کنید.', en: 'Finish with fresh lemon juice and serve with bread or rice.' },
    ],
    prepMinutes: 15,
    cookMinutes: 45,
    servings: '۴ نفر',
    allergens: [],
    safety: [
      { fa: 'لوبیا را کاملاً بپزید؛ لوبیای نیم‌پز سخت هضم می‌شود.', en: 'Cook the beans completely; undercooked beans are hard to digest.' },
      { fa: 'فیبر حبوبات به پیشگیری از یبوست — که پس از زایمان شایع است — کمک می‌کند؛ اگر نفخ گرفتید، مقدار را کم‌کم زیاد کنید.', en: 'Legume fiber helps prevent constipation, which is common after childbirth; if you feel gassy, increase the amount gradually.' },
      { fa: 'با آبلیمو یا گوجه (ویتامین C) مصرف کنید تا جذب آهن حبوبات بهتر شود.', en: 'Pair with lemon juice or tomato (vitamin C) to improve iron absorption from the beans.' },
      { fa: 'در طول روز مایعات کافی بنوشید.', en: 'Drink enough fluids throughout the day.' },
    ],
    storageFa: 'در یخچال حداکثر ۳ روز؛ برای نگهداری طولانی‌تر فریز کنید (تا ۱ ماه) و پیش از مصرف کامل گرم کنید.',
    storageEn: 'Refrigerate up to 3 days; freeze up to 1 month and reheat thoroughly before eating.',
    substitutions: [
      { fa: 'لوبیا چیتی ← لوبیا قرمز یا عدس', en: 'Pinto beans ← red beans or lentils' },
      { fa: 'هویج ← کدو سبز', en: 'Carrot ← zucchini' },
      { fa: 'آبلیمو ← گوجه‌فرنگی بیشتر', en: 'Lemon juice ← extra tomato' },
    ],
    nutrition: { kcal: 350, proteinG: 15, ironMg: 5, fiberG: 12 },
    medicalSource: 'WHO — Healthy diet',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۰) سوپ جو و مرغ — dinner / recovery
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-barley-soup',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'recovery',
    mealTypes: ['DINNER'],
    title: 'سوپ جو و مرغ',
    titleEn: 'Barley and Chicken Soup',
    image: '/images/recipes/mother-barley-soup.jpg',
    ingredients: [
      { fa: 'سینه مرغ', en: 'Chicken breast', amount: '۲۰۰ گرم' },
      { fa: 'جو پرک یا جو سوپی', en: 'Barley flakes or pearl barley', amount: 'نصف پیمانه' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد' },
      { fa: 'کرفس', en: 'Celery', amount: '۱ ساقه' },
      { fa: 'پیاز', en: 'Onion', amount: '۱ عدد کوچک' },
      { fa: 'جعفری', en: 'Parsley', amount: 'چند شاخه' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق غذاخوری' },
      { fa: 'آب', en: 'Water', amount: '۵ پیمانه' },
      { fa: 'نمک و زردچوبه', en: 'Salt and turmeric', amount: 'به میزان کم' },
    ],
    steps: [
      { fa: 'مرغ را با پیاز خردشده و آب در قابلمه بجوشانید و کف روی آن را بگیرید.', en: 'Simmer the chicken with the chopped onion and water, skimming the foam.' },
      { fa: 'حدود ۲۰ دقیقه بپزید، سپس مرغ را بیرون آورده و ریش‌ریش کنید.', en: 'Cook about 20 minutes, then remove the chicken and shred it.' },
      { fa: 'جو، هویج و کرفس خردشده را به آب مرغ اضافه کنید و ۳۰ تا ۴۰ دقیقه با حرارت ملایم بپزید تا جو نرم شود.', en: 'Add the barley, diced carrot and celery to the broth and simmer gently 30–40 minutes until the barley is soft.' },
      { fa: 'مرغ ریش‌شده را برگردانید و ۵ دقیقه دیگر بجوشانید.', en: 'Return the shredded chicken and simmer 5 more minutes.' },
      { fa: 'جعفری خردشده و نمک را اضافه کنید و گرم سرو کنید.', en: 'Stir in the chopped parsley and salt and serve warm.' },
    ],
    prepMinutes: 10,
    cookMinutes: 50,
    servings: '۴ نفر',
    textureFa: 'گرم و نرم؛ مناسب روزهای نخست پس از زایمان',
    textureEn: 'Warm and soft; suitable for the first days after childbirth',
    allergens: ['GLUTEN'],
    safety: [
      { fa: 'اگر سزارین کرده‌اید، یبوست در روزهای نخست شایع است؛ فیبر ملایم جو و سبزیجات پخته همراه با نوشیدن آب کافی به حرکت روده کمک می‌کند.', en: 'If you had a cesarean, constipation is common in the first days; the gentle fiber of barley and cooked vegetables plus plenty of water supports bowel movement.' },
      { fa: 'هیچ غذایی به‌تنهایی شیر مادر را به‌طور قطعی افزایش نمی‌دهد؛ تغذیه متنوع و متعادل و نوشیدن مایعات بر اساس تشنگی مهم‌تر است.', en: 'No single food definitively increases breast-milk supply on its own; a varied, balanced diet and drinking fluids to thirst matter more.' },
      { fa: 'مرغ را کاملاً بپزید تا وسط آن سفید و بدون صورتی باشد.', en: 'Cook the chicken thoroughly until the center is white with no pink.' },
      { fa: 'جو حاوی گلوتن است؛ اگر سلیاک دارید، جایگزین برنج را انتخاب کنید.', en: 'Barley contains gluten; if you have celiac disease, choose the rice alternative.' },
    ],
    storageFa: 'در یخچال حداکثر ۳ روز؛ هنگام گرم‌کردن مجدد کمی آب اضافه کنید تا قوامش تنظیم شود.',
    storageEn: 'Refrigerate up to 3 days; add a little water when reheating to adjust the consistency.',
    substitutions: [
      { fa: 'جو سوپی ← برنج یا بلغور گندم (برای رژیم بدون گلوتن برنج)', en: 'Pearl barley ← rice or cracked wheat (use rice for a gluten-free version)' },
      { fa: 'مرغ ← عدس کاملاً پخته (نسخه گیاهی)', en: 'Chicken ← fully cooked lentils (plant-based version)' },
      { fa: 'کرفس ← کدو سبز', en: 'Celery ← zucchini' },
    ],
    nutrition: { kcal: 300, proteinG: 22, ironMg: 3, fiberG: 6 },
    medicalSource: 'CDC — Nutrition while breastfeeding',
    sourceUrl: 'https://www.cdc.gov/breastfeeding/php/faq/faq.html',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۱) املت کاملاً پخته با سبزیجات — dinner
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-omelette',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'dinner',
    mealTypes: ['DINNER'],
    title: 'املت کاملاً پخته با سبزیجات',
    titleEn: 'Fully Cooked Vegetable Omelette',
    image: '/images/recipes/mother-omelette.jpg',
    ingredients: [
      { fa: 'تخم‌مرغ', en: 'Eggs', amount: '۳ عدد' },
      { fa: 'گوجه‌فرنگی', en: 'Tomato', amount: '۱ عدد' },
      { fa: 'پیاز', en: 'Onion', amount: 'نصف عدد' },
      { fa: 'فلفل دلمه‌ای', en: 'Bell pepper', amount: 'نصف عدد' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق غذاخوری' },
      { fa: 'نمک و فلفل سیاه', en: 'Salt and black pepper', amount: 'به میزان خیلی کم' },
    ],
    steps: [
      { fa: 'پیاز و فلفل دلمه‌ای را خرد کنید و در روغن زیتون تفت دهید.', en: 'Chop the onion and bell pepper and sauté them in olive oil.' },
      { fa: 'گوجه خردشده را اضافه کنید و بگذارید آب آن کشیده شود.', en: 'Add the chopped tomato and let its liquid cook off.' },
      { fa: 'تخم‌مرغ‌ها را در کاسه بزنید و روی سبزیجات پخته بریزید.', en: 'Beat the eggs in a bowl and pour them over the cooked vegetables.' },
      { fa: 'حرارت را کم کنید، درب تابه را بگذارید و ۵ تا ۷ دقیقه صبر کنید تا تخم‌مرغ کاملاً سفت شود.', en: 'Lower the heat, cover the pan and wait 5–7 minutes until the eggs are fully set.' },
      { fa: 'مطمئن شوید هیچ بخش آبدار یا مایعی باقی نمانده؛ سپس املت را تا کنید و سرو کنید.', en: 'Make sure no watery or runny part remains; then fold the omelette and serve.' },
    ],
    prepMinutes: 10,
    cookMinutes: 10,
    servings: '۱ نفر',
    allergens: ['EGG'],
    safety: [
      { fa: 'املت را کاملاً بپزید؛ تخم‌مرغ عسلی یا املت آب‌دار در دوره شیردهی توصیه نمی‌شود.', en: 'Cook the omelette all the way through; runny or soft-set eggs are not recommended while breastfeeding.' },
      { fa: 'تخم‌مرغ منبع پروتئین کامل، کولین و ویتامین B12 است.', en: 'Eggs provide complete protein, choline and vitamin B12.' },
      { fa: 'اگر کودک شما علائم حساسیت نشان می‌دهد یا سابقه خانوادگی حساسیت به تخم‌مرغ دارد، با پزشک خود مشورت کنید.', en: 'If your baby shows signs of allergy or there is a family history of egg allergy, consult your doctor.' },
      { fa: 'شام را نه خیلی دیر بخورید و کنارش آب بنوشید.', en: 'Have dinner not too late and drink water alongside it.' },
    ],
    substitutions: [
      { fa: 'گوجه ← اسفناج کاملاً پخته', en: 'Tomato ← fully cooked spinach' },
      { fa: 'فلفل دلمه‌ای ← قارچ کاملاً پخته', en: 'Bell pepper ← fully cooked mushrooms' },
      { fa: 'روغن زیتون ← کره پاستوریزه', en: 'Olive oil ← pasteurized butter' },
    ],
    nutrition: { kcal: 320, proteinG: 20, ironMg: 2.4 },
    medicalSource: 'WHO — Healthy diet',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۲) خوراک مرغ و کدو — dinner / recovery
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-squash-stew',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'recovery',
    mealTypes: ['DINNER'],
    title: 'خوراک مرغ و کدو',
    titleEn: 'Chicken and Squash Stew',
    image: '/images/recipes/mother-squash-stew.jpg',
    ingredients: [
      { fa: 'مرغ بدون استخوان', en: 'Boneless chicken', amount: '۲۵۰ گرم' },
      { fa: 'کدو حلوایی', en: 'Butternut squash', amount: '۳۰۰ گرم' },
      { fa: 'کدو سبز', en: 'Zucchini', amount: '۱ عدد' },
      { fa: 'پیاز', en: 'Onion', amount: '۱ عدد' },
      { fa: 'زردچوبه', en: 'Turmeric', amount: 'نصف قاشق چای‌خوری' },
      { fa: 'آبلیموی تازه', en: 'Fresh lemon juice', amount: '۱ قاشق غذاخوری' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق غذاخوری' },
      { fa: 'آب', en: 'Water', amount: '۱.۵ پیمانه' },
    ],
    steps: [
      { fa: 'مرغ را به قطعات متوسط خرد کنید و با پیاز خردشده در روغن زیتون تفت دهید.', en: 'Cut the chicken into medium pieces and sauté with the chopped onion in olive oil.' },
      { fa: 'زردچوبه را اضافه کنید و ۲ دقیقه دیگر تفت بدهید.', en: 'Add the turmeric and cook 2 more minutes.' },
      { fa: 'کدو حلوایی مکعبی و آب را اضافه کنید، درب را بگذارید و ۲۰ دقیقه بپزید.', en: 'Add the cubed squash and water, cover and cook 20 minutes.' },
      { fa: 'کدو سبز خردشده را اضافه کنید و ۱۰ دقیقه دیگر بپزید تا همه اجزا کاملاً نرم شوند.', en: 'Add the chopped zucchini and cook 10 more minutes until everything is completely soft.' },
      { fa: 'با آبلیمو و کمی نمک مزه‌دار کنید و با برنج یا نان سرو کنید.', en: 'Season with lemon juice and a little salt and serve with rice or bread.' },
    ],
    prepMinutes: 15,
    cookMinutes: 35,
    servings: '۳ نفر',
    textureFa: 'نرم و لطیف؛ مناسب دوره نقاهت پس از زایمان یا سزارین',
    textureEn: 'Soft and gentle; suitable for postpartum or cesarean recovery',
    allergens: [],
    safety: [
      { fa: 'اگر سزارین کرده‌اید، یبوست در روزهای نخست شایع است؛ سبزیجات پخته نرم و مایعات کافی به روده‌ها کمک می‌کند.', en: 'If you had a cesarean, constipation is common in the first days; soft cooked vegetables and enough fluids support your bowels.' },
      { fa: 'مرغ را کاملاً بپزید تا وسط آن هیچ بخش صورتی باقی نماند.', en: 'Cook the chicken thoroughly until no pink remains in the center.' },
      { fa: 'مایعات را در طول روز بر اساس تشنگی بنوشید؛ خوراک‌های آبدار هم به تأمین مایعات کمک می‌کنند.', en: 'Drink fluids through the day to thirst; brothy dishes contribute to fluid intake too.' },
    ],
    storageFa: 'در یخچال حداکثر ۲ روز؛ پیش از مصرف تا داغ شدن کامل گرم کنید.',
    storageEn: 'Refrigerate up to 2 days; reheat until piping hot before eating.',
    substitutions: [
      { fa: 'کدو حلوایی ← هویج یا سیب‌زمینی شیرین کاملاً پخته', en: 'Butternut squash ← fully cooked carrot or sweet potato' },
      { fa: 'مرغ ← بوقلمون بدون استخوان', en: 'Chicken ← boneless turkey' },
      { fa: 'آبلیمو ← کمی گوجه‌فرنگی', en: 'Lemon juice ← a little tomato' },
    ],
    nutrition: { kcal: 340, proteinG: 30, ironMg: 2, fiberG: 5 },
    medicalSource: 'CDC — Nutrition while breastfeeding',
    sourceUrl: 'https://www.cdc.gov/breastfeeding/php/faq/faq.html',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۳) سوپ سبزیجات و عدس — dinner / fiber
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-lentil-soup',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'fiber',
    mealTypes: ['DINNER'],
    title: 'سوپ سبزیجات و عدس',
    titleEn: 'Vegetable and Lentil Soup',
    image: '/images/recipes/mother-lentil-soup.jpg',
    ingredients: [
      { fa: 'عدس', en: 'Red lentils', amount: 'نصف پیمانه' },
      { fa: 'هویج', en: 'Carrot', amount: '۱ عدد' },
      { fa: 'سیب‌زمینی', en: 'Potato', amount: '۱ عدد کوچک' },
      { fa: 'کرفس یا کدو سبز', en: 'Celery or zucchini', amount: '۱ ساقه یا ۱ عدد' },
      { fa: 'پیاز', en: 'Onion', amount: '۱ عدد' },
      { fa: 'سیر', en: 'Garlic', amount: '۱ حبه' },
      { fa: 'آب', en: 'Water', amount: '۴ پیمانه' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق غذاخوری' },
      { fa: 'آبلیموی تازه و جعفری', en: 'Fresh lemon juice and parsley', amount: 'برای سرو' },
    ],
    steps: [
      { fa: 'پیاز و سیر را در روغن زیتون تفت دهید تا سبک شوند.', en: 'Sauté the onion and garlic in olive oil until soft.' },
      { fa: 'عدس شسته‌شده، هویج، سیب‌زمینی و کرفس خردشده و آب را اضافه کنید.', en: 'Add the rinsed lentils, diced carrot, potato and celery, and the water.' },
      { fa: 'بگذارید با حرارت ملایم حدود ۳۰ دقیقه بجوشد تا عدس و سبزیجات کاملاً نرم شوند.', en: 'Simmer gently for about 30 minutes until the lentils and vegetables are completely soft.' },
      { fa: 'در صورت تمایل با همزن دستی کمی نرم و یکدست کنید.', en: 'If you like, blend partially with an immersion blender for a smoother texture.' },
      { fa: 'با آبلیموی تازه و جعفری خردشده سرو کنید.', en: 'Serve with fresh lemon juice and chopped parsley.' },
    ],
    prepMinutes: 10,
    cookMinutes: 35,
    servings: '۴ نفر',
    allergens: [],
    safety: [
      { fa: 'فیبر عدس و سبزیجات به پیشگیری از یبوست پس از زایمان کمک می‌کند.', en: 'The fiber in lentils and vegetables helps prevent postpartum constipation.' },
      { fa: 'آبلیموی تازه (ویتامین C) جذب آهن عدس را بهتر می‌کند.', en: 'Fresh lemon juice (vitamin C) improves iron absorption from the lentils.' },
      { fa: 'هیچ غذایی به‌تنهایی شیر مادر را به‌طور قطعی افزایش نمی‌دهد؛ تغذیه متنوع و متعادل و نوشیدن مایعات بر اساس تشنگی مهم‌تر است.', en: 'No single food definitively increases breast-milk supply on its own; a varied, balanced diet and drinking fluids to thirst matter more.' },
    ],
    storageFa: 'در یخچال حداکثر ۳ روز؛ پیش از مصرف تا داغ شدن کامل گرم کنید.',
    storageEn: 'Refrigerate up to 3 days; reheat until steaming hot before serving.',
    substitutions: [
      { fa: 'عدس ← نخود کاملاً پخته', en: 'Lentils ← fully cooked chickpeas' },
      { fa: 'سیب‌زمینی ← کدو حلوایی', en: 'Potato ← butternut squash' },
      { fa: 'کرفس ← کلم بروکلی کاملاً پخته', en: 'Celery ← fully cooked broccoli' },
    ],
    nutrition: { kcal: 260, proteinG: 13, ironMg: 4.2, fiberG: 9 },
    medicalSource: 'WHO — Healthy diet',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۴) میان‌وعده: ترکیب میوه و لبنیات پاستوریزه — snack / calcium / quick
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-fruit-yogurt',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'calcium',
    mealTypes: ['SNACK'],
    title: 'میان‌وعده میوه و لبنیات پاستوریزه',
    titleEn: 'Fruit with Pasteurized Dairy Snack',
    image: '/images/recipes/mother-fruit-yogurt.jpg',
    ingredients: [
      { fa: 'ماست پاستوریزه ساده یا یونانی', en: 'Plain or Greek pasteurized yogurt', amount: '۱ پیمانه' },
      { fa: 'میوه فصل (سیب، پرتقال، انار یا انگور)', en: 'Seasonal fruit (apple, orange, pomegranate or grapes)', amount: '۱ کف دست' },
      { fa: 'خرما', en: 'Dates', amount: '۲ عدد خردشده' },
      { fa: 'پودر دارچین', en: 'Ground cinnamon', amount: 'کمی (اختیاری)' },
    ],
    steps: [
      { fa: 'میوه را زیر آب جاری خوب بشویید و به تکه‌های کوچک خرد کنید.', en: 'Wash the fruit well under running water and cut into small pieces.' },
      { fa: 'ماست پاستوریزه را در یک کاسه بریزید.', en: 'Spoon the pasteurized yogurt into a bowl.' },
      { fa: 'میوه‌ها و خرمای خردشده را روی ماست بچینید.', en: 'Arrange the fruit and chopped dates over the yogurt.' },
      { fa: 'در صورت تمایل کمی دارچین بپاشید و بلافاصله میل کنید.', en: 'Sprinkle a little cinnamon if you like and eat right away.' },
    ],
    prepMinutes: 5,
    cookMinutes: 0,
    servings: '۱ نفر',
    allergens: ['MILK'],
    safety: [
      { fa: 'فقط لبنیات پاستوریزه مصرف کنید؛ از لبنیات خام یا خانگیِ غیرپاستوریزه پرهیز کنید.', en: 'Consume pasteurized dairy only; avoid raw or unpasteurized homemade dairy.' },
      { fa: 'اگر کودک شما علائم حساسیت نشان می‌دهد یا سابقه خانوادگی دارد، با پزشک خود درباره مصرف لبنیات مشورت کنید.', en: 'If your baby shows signs of allergy or there is a family history, talk to your doctor about dairy consumption.' },
      { fa: 'کلسیم لبنیات به سلامت استخوان مادر کمک می‌کند؛ مایعات را هم در طول روز بر اساس تشنگی بنوشید.', en: 'Dairy calcium supports the mother\u2019s bone health; also drink fluids through the day to thirst.' },
    ],
    storageFa: 'تازه میل کنید؛ در ظرف دربسته حداکثر ۲۴ ساعت در یخچال قابل نگهداری است.',
    storageEn: 'Eat fresh; keep covered in the fridge up to 24 hours.',
    substitutions: [
      { fa: 'ماست ← پنیر کوتاژ پاستوریزه', en: 'Yogurt ← pasteurized cottage cheese' },
      { fa: 'خرما ← یک قاشق چای‌خوری عسل', en: 'Dates ← one teaspoon of honey' },
      { fa: 'انار ← توت‌فرنگی یا انگور شسته', en: 'Pomegranate ← washed strawberries or grapes' },
    ],
    nutrition: { kcal: 250, proteinG: 15, calciumMg: 320 },
    medicalSource: 'CDC — Nutrition while breastfeeding',
    sourceUrl: 'https://www.cdc.gov/breastfeeding/php/faq/faq.html',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۵) حمص خانگی با سبزیجات — snack / fiber
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-hummus',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'snack',
    mealTypes: ['SNACK'],
    title: 'حمص خانگی با سبزیجات',
    titleEn: 'Homemade Hummus with Vegetable Sticks',
    image: '/images/recipes/mother-hummus.jpg',
    ingredients: [
      { fa: 'نخود پخته', en: 'Cooked chickpeas', amount: '۱ پیمانه' },
      { fa: 'ارده (کنجد)', en: 'Tahini (sesame paste)', amount: '۲ قاشق غذاخوری' },
      { fa: 'آبلیموی تازه', en: 'Fresh lemon juice', amount: '۲ قاشق غذاخوری' },
      { fa: 'سیر', en: 'Garlic', amount: '۱ حبه کوچک' },
      { fa: 'روغن زیتون', en: 'Olive oil', amount: '۱ قاشق غذاخوری' },
      { fa: 'آب نخود', en: 'Chickpea cooking water', amount: '۲ تا ۳ قاشق غذاخوری' },
      { fa: 'هویج، خیار و کرفس', en: 'Carrot, cucumber and celery', amount: 'برای دیپ کردن' },
    ],
    steps: [
      { fa: 'اگر نخود خشک استفاده می‌کنید، آن را از شب قبل خیس کنید و کاملاً بپزید تا له شود؛ نخود پخته آماده هم قابل استفاده است.', en: 'If using dried chickpeas, soak them overnight and cook until completely mushy; pre-cooked chickpeas work too.' },
      { fa: 'نخود پخته، ارده، آبلیمو، سیر و آب نخود را در مخلوط‌کن تا نرم و یکدست بزنید.', en: 'Blend the cooked chickpeas, tahini, lemon juice, garlic and chickpea water until smooth.' },
      { fa: 'غلظت را با کمی آب نخود تنظیم کنید.', en: 'Adjust the consistency with a little more chickpea water.' },
      { fa: 'حمص را در ظرف بکشید و روغن زیتون روی آن بدهید.', en: 'Spread the hummus in a dish and drizzle with olive oil.' },
      { fa: 'سبزیجات را بشویید، به شکل لایه‌های بلند خرد کنید و برای دیپ کردن کنارش بگذارید.', en: 'Wash the vegetables, cut them into sticks and serve alongside for dipping.' },
    ],
    prepMinutes: 10,
    cookMinutes: 0,
    servings: '۴ نفر (به‌عنوان دیپ)',
    allergens: ['SESAME'],
    safety: [
      { fa: 'کنجد و ارده از آلرژن‌های شایع است؛ اگر کودک شما علائم حساسیت نشان می‌دهد یا سابقه خانوادگی دارد، با پزشک خود مشورت کنید.', en: 'Sesame and tahini are common allergens; if your baby shows signs of allergy or there is a family history, consult your doctor.' },
      { fa: 'نخود را کاملاً بپزید تا حمص نرم و به‌راحتی هضم شود.', en: 'Cook the chickpeas fully so the hummus is soft and easy to digest.' },
      { fa: 'هیچ غذایی به‌تنهایی شیر مادر را به‌طور قطعی افزایش نمی‌دهد؛ تغذیه متنوع و متعادل و نوشیدن مایعات بر اساس تشنگی مهم‌تر است.', en: 'No single food definitively increases breast-milk supply on its own; a varied, balanced diet and drinking fluids to thirst matter more.' },
    ],
    storageFa: 'در ظرف دربسته حداکثر ۳ روز در یخچال نگه دارید.',
    storageEn: 'Keep covered in the fridge up to 3 days.',
    substitutions: [
      { fa: 'ارده ← ماست پاستوریزه (نسخه بدون کنجد)', en: 'Tahini ← pasteurized yogurt (sesame-free version)' },
      { fa: 'نخود ← لوبیا سفید کاملاً پخته', en: 'Chickpeas ← fully cooked white beans' },
      { fa: 'سیر ← بدون سیر (ملایم‌تر)', en: 'Garlic ← omit for a milder taste' },
    ],
    nutrition: { kcal: 270, proteinG: 11, ironMg: 3.2, fiberG: 8 },
    medicalSource: 'WHO — Healthy diet',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    reviewedAt: '2025-10-15',
  },

  // ────────────────────────────────────────────────────────────────
  // ۱۶) مغزها و میوه تازه — snack / quick
  // ────────────────────────────────────────────────────────────────
  {
    slug: 'mother-nut-fruit',
    audience: 'BREASTFEEDING_MOTHER',
    category: 'quick',
    mealTypes: ['SNACK'],
    title: 'مغزها و میوه تازه',
    titleEn: 'Mixed Nuts with Fresh Fruit',
    image: '/images/recipes/mother-nut-fruit.jpg',
    ingredients: [
      { fa: 'مغزهای خام (بادام، گردو، فندق)', en: 'Raw nuts (almonds, walnuts, hazelnuts)', amount: 'یک مشت کوچک (حدود ۳۰ گرم)' },
      { fa: 'میوه تازه (سیب، موز یا پرتقال)', en: 'Fresh fruit (apple, banana or orange)', amount: '۱ عدد' },
    ],
    steps: [
      { fa: 'مغزها را پیش از خوردن درشت خرد کنید و خوب بجوید تا هضمشان آسان‌تر شود.', en: 'Coarsely chop the nuts before eating and chew them well for easier digestion.' },
      { fa: 'میوه را زیر آب جاری خوب بشویید.', en: 'Wash the fruit well under running water.' },
      { fa: 'حدود یک مشت کوچک مغز (۳۰ گرم) را در یک ظرف کوچک بریزید.', en: 'Place about a small handful of nuts (30 g) in a small bowl.' },
      { fa: 'مغزها و میوه را با هم به‌عنوان میان‌وعده میل کنید.', en: 'Enjoy the nuts and fruit together as a snack.' },
    ],
    prepMinutes: 5,
    cookMinutes: 0,
    servings: '۱ نفر',
    allergens: ['NUTS'],
    safety: [
      { fa: 'اگر کودک شما علائم حساسیت نشان می‌دهد یا سابقه خانوادگی دارد، با پزشک خود درباره مصرف آجیل و مغزها مشورت کنید.', en: 'If your baby shows signs of allergy or there is a family history, talk to your doctor about eating nuts.' },
      { fa: 'مغزها کالری بالایی دارند؛ در روز به یک مشت کوچک بسنده کنید.', en: 'Nuts are calorie-dense; stick to one small handful per day.' },
      { fa: 'مغزهای شور یا شیرین‌شده انتخاب خوبی نیستند؛ مغز خام یا بوداده بدون نمک بخورید.', en: 'Salted or sweetened nuts are a poor choice; prefer raw or unsalted roasted nuts.' },
      { fa: 'در طول روز مایعات کافی بنوشید.', en: 'Drink enough fluids throughout the day.' },
    ],
    storageFa: 'مغزها را در ظرف دربسته و جای خنک نگه دارید؛ میوه را تازه بخورید.',
    storageEn: 'Store nuts in a sealed container in a cool place; eat the fruit fresh.',
    substitutions: [
      { fa: 'مخلوط مغزها ← یک نوع مغز (مثلاً فقط بادام)', en: 'Mixed nuts ← a single kind (for example almonds only)' },
      { fa: 'بادام ← تخمه آفتاب‌گردان بدون نمک', en: 'Almonds ← unsalted sunflower seeds' },
      { fa: 'میوه ← هویج تازه', en: 'Fruit ← fresh carrot' },
    ],
    nutrition: { kcal: 270, proteinG: 7, fiberG: 4 },
    medicalSource: 'CDC — Nutrition while breastfeeding',
    sourceUrl: 'https://www.cdc.gov/breastfeeding/php/faq/faq.html',
    reviewedAt: '2025-10-15',
  },
];
