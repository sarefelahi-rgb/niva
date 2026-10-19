// NIVA Pregnancy Intelligence Platform
// Bilingual (English + Persian) medical knowledge base for retrieval / RAG seeding.
// Conservative, widely accepted patient education based on WHO Antenatal Care
// Recommendations (2016), ACOG patient education, CDC and NHS pregnancy guidance.
// Seeded into the database with reviewStatus "IN_REVIEW" — clinician review required.

export type KnowledgeCategory =
  | 'nutrition' | 'safety' | 'symptoms' | 'development'
  | 'lifestyle' | 'postpartum' | 'screening' | 'mental-health';

export interface KnowledgeEntry {
  id: string;                       // kebab-case stable id
  category: KnowledgeCategory;
  topicsEn: string[];               // 3-6 topical tags in English
  keywordsEn: string[];             // retrieval keywords (lowercase, 6-12)
  keywordsFa: string[];             // Persian retrieval keywords (6-12)
  titleEn: string;
  titleFa: string;
  bodyEn: string;                   // 90-150 words, plain text, no markdown
  bodyFa: string;                   // 90-150 words Persian equivalent
  citation: string;                 // e.g. "WHO Antenatal Care Recommendations (2016), Recommendation X"
  sourceUrl?: string;
  year?: number;
  redFlagRelated?: boolean;         // true if topic relates to emergency warning signs
}

export const MEDICAL_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'folic-acid',
    category: 'nutrition',
    topicsEn: ['folic acid', 'neural tube', 'supplements', 'preconception', 'first trimester'],
    keywordsEn: [
      'folic acid', 'folate', 'neural tube defects', 'supplement', '400 micrograms',
      'leafy greens', 'spinach', 'preconception', 'first trimester', 'prenatal vitamin',
      'spina bifida', 'b vitamin',
    ],
    keywordsFa: [
      'اسید فولیک', 'فولات', 'نقص لوله عصبی', 'مکمل', '400 میکروگرم',
      'سبزیجات برگ‌دار', 'اسفناج', 'پیش از بارداری', 'سه‌ماهه اول', 'ویتامین بارداری',
      'اسپینا بیفیدا', 'ویتامین ب',
    ],
    titleEn: 'Folic Acid: Why It Matters Before and During Early Pregnancy',
    titleFa: 'اسید فولیک؛ چرا پیش و در اوایل بارداری اهمیت دارد',
    bodyEn:
      'Folic acid is a B vitamin that helps the baby’s brain and spinal cord form normally. The neural tube, which becomes the brain and spine, closes very early, often before a woman knows she is pregnant. For this reason, health authorities advise taking a 400 microgram folic acid tablet daily from before conception and at least through the first 12 weeks of pregnancy. Women who have previously had a pregnancy affected by a neural tube defect, or who take certain medicines such as some anti-epileptic drugs, may need a higher dose prescribed by their clinician. Folic acid also appears naturally in dark leafy greens, beans, and fortified cereals, but a daily supplement is still advised because diet alone rarely provides enough.',
    bodyFa:
      'اسید فولیک یک ویتامین از گروه ب است که به شکل‌گیری طبیعی مغز و نخاع جنین کمک می‌کند. لوله‌ی عصبی، که بعدها مغز و ستون فقرات را می‌سازد، در هفته‌های نخست و اغلب پیش از آنکه مادر از بارداری خود باخبر شود بسته می‌شود. به همین دلیل توصیه می‌شود از پیش از بارداری و دست‌کم تا پایان هفته‌ی دوازدهم، روزانه یک قرص 400 میکروگرمی اسید فولیک مصرف شود. زنانی که پیش‌تر فرزندی با نقص لوله‌ی عصبی داشته‌اند یا برخی داروها مانند داروهای ضدتشنج مصرف می‌کنند، ممکن است به دوز بالاتری نیاز داشته باشند که پزشک تعیین می‌کند. اسید فولیک در سبزی‌های برگ‌دار تیره، حبوبات و غلات غنی‌شده هم وجود دارد، اما رژیم غذایی به‌تنهایی معمولاً کافی نیست و مصرف مکمل روزانه توصیه می‌شود.',
    citation: 'WHO Antenatal Care Recommendations (2016), Recommendation 1.1: Iron and folic acid supplementation',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241549912',
    year: 2016,
  },
  {
    id: 'iron-anemia',
    category: 'nutrition',
    topicsEn: ['iron', 'anemia', 'supplements', 'fatigue', 'blood health'],
    keywordsEn: [
      'iron', 'anemia', 'hemoglobin', 'fatigue', 'red meat', 'legumes',
      'vitamin c absorption', 'iron supplement', 'pale', 'dizziness', 'prenatal iron', 'low iron',
    ],
    keywordsFa: [
      'آهن', 'کم‌خونی', 'هموگلوبین', 'خستگی', 'گوشت قرمز', 'حبوبات',
      'ویتامین ث', 'قرص آهن', 'رنگ‌پریدگی', 'سرگیجه', 'فقر آهن', 'جذب آهن',
    ],
    titleEn: 'Iron and Anemia in Pregnancy',
    titleFa: 'آهن و کم‌خونی در بارداری',
    bodyEn:
      'During pregnancy your body needs more iron to make extra blood for the growing baby and the placenta. When iron stores run low, anemia can develop, often causing tiredness, breathlessness, dizziness, a racing heart, or looking pale. Routine antenatal care usually includes a hemoglobin test, and your clinician may prescribe an iron supplement if levels are low. Iron from red meat and poultry is absorbed best; plant sources such as lentils, beans, and leafy greens are absorbed better when eaten with vitamin C rich foods like citrus, tomato, or bell pepper. Tea, coffee, and calcium-rich foods can block absorption, so keep them away from your iron dose. If a supplement causes constipation or stomach upset, tell your clinician rather than stopping it on your own.',
    bodyFa:
      'در بارداری بدن به آهن بیشتری نیاز دارد تا خون اضافی لازم برای رشد جنین و جفت را بسازد. اگر ذخایر آهن کاهش یابد، کم‌خونی بروز می‌کند که با نشانه‌هایی مانند خستگی، تنگی نفس، سرگیجه، تندشدن ضربان قلب و رنگ‌پریدگی همراه است. در مراقبت‌های بارداری معمولاً آزمایش هموگلوبین انجام می‌شود و در صورت پایین بودن آهن، پزشک مکمل آهن تجویز می‌کند. آهن موجود در گوشت قرمز و پرندگان بهتر جذب می‌شود؛ جذب آهن منابع گیاهی مثل عدس، لوبیا و سبزی‌های برگ‌دار همراه با غذاهای سرشار از ویتامین ث مانند مرکبات، گوجه‌فرنگی و فلفل دلمه‌ای بیشتر می‌شود. چای، قهوه و لبنیات مانع جذب آهن می‌شوند، پس مصرف آن‌ها را با قرص آهن فاصله بدهید. اگر مکمل باعث یبوست یا ناراحتی معده شد، بدون مشورت با پزشک آن را قطع نکنید.',
    citation: 'WHO Antenatal Care Recommendations (2016), Recommendation 1.1; NHS, Vitamins, supplements and nutrition in pregnancy',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241549912',
    year: 2016,
  },
  {
    id: 'vitamin-d',
    category: 'nutrition',
    topicsEn: ['vitamin D', 'sunlight', 'bones', 'supplements'],
    keywordsEn: [
      'vitamin d', 'sunlight', 'sunshine', 'bones', 'calcium absorption', 'supplement',
      'deficiency', 'rickets', 'osteomalacia', 'sardines', 'eggs', '10 micrograms',
    ],
    keywordsFa: [
      'ویتامین دی', 'آفتاب', 'استخوان', 'جذب کلسیم', 'مکمل', 'کمبود ویتامین دی',
      'ریکاژیت', 'نرمی استخوان', 'ساردین', 'تخم‌مرغ', 'مکمل روزانه', 'پوستی',
    ],
    titleEn: 'Vitamin D for You and Your Baby',
    titleFa: 'ویتامین دی برای مادر و جنین',
    bodyEn:
      'Vitamin D helps your body absorb calcium and supports the baby’s developing bones and teeth. Most vitamin D is made in the skin through sensible exposure to sunlight, and a smaller amount comes from foods such as oily fish, eggs, and fortified products. Many women have low vitamin D levels, especially those who cover their skin, live in northern climates, or have darker skin tones, so many national guidelines advise a daily supplement of 10 micrograms (400 international units) throughout pregnancy. Very high doses are not recommended unless prescribed for a proven deficiency. Taking the standard daily amount with a meal is generally well tolerated. If you have questions about your own levels, ask your clinician whether a blood test is appropriate for you.',
    bodyFa:
      'ویتامین دی به جذب کلسیم کمک می‌کند و برای رشد استخوان‌ها و دندان‌های جنین ضروری است. بخش عمده‌ی ویتامین دی در پوست، با قرار گرفتن معقول در معرض آفتاب ساخته می‌شود و مقدار کمی از غذاهایی مانند ماهی‌های چرب، تخم‌مرغ و محصولات غنی‌شده به دست می‌آید. کمبود ویتامین دی در بسیاری از زنان شایع است، به‌ویژه در کسانی که پوست خود را می‌پوشانند، در مناطق کم‌آفتاب زندگی می‌کنند یا پوست تیره‌تری دارند؛ به همین دلیل بسیاری از راهنماهای ملی، مصرف روزانه‌ی 10 میکروگرم (400 واحد بین‌المللی) مکمل در طول بارداری را توصیه می‌کنند. دوزهای بسیار بالا توصیه نمی‌شود مگر آنکه پزشک برای کمبود اثبات‌شده تجویز کند. مصرف مقدار استاندارد روزانه همراه با غذا معمولاً به‌خوبی تحمل می‌شود. اگر درباره‌ی سطح ویتامین دی خود پرسشی دارید، از پزشک بپرسید آیا آزمایش خون برای شما مناسب است یا نه.',
    citation: 'WHO Antenatal Care Recommendations (2016), Recommendation 1.4: Vitamin D supplementation; NHS, Vitamins, supplements and nutrition in pregnancy',
    sourceUrl: 'https://www.nhs.uk/pregnancy/keeping-well/vitamins-supplements-and-nutrition/',
    year: 2016,
  },
  {
    id: 'calcium-intake',
    category: 'nutrition',
    topicsEn: ['calcium', 'bones', 'dairy', 'diet'],
    keywordsEn: [
      'calcium', 'dairy', 'milk', 'yogurt', 'cheese', 'bones',
      'teeth', 'tofu', 'almonds', 'broccoli', '1000 mg', 'pasteurized',
    ],
    keywordsFa: [
      'کلسیم', 'لبنیات', 'شیر', 'ماست', 'پنیر', 'استخوان',
      'دندان', 'پنیر پاستوریزه', 'بادام', 'بروکلی', 'میلی‌گرم کلسیم', 'فقر کلسیم',
    ],
    titleEn: 'Calcium: Building Your Baby’s Bones',
    titleFa: 'کلسیم؛ ساخت استخوان‌های جنین',
    bodyEn:
      'Calcium builds your baby’s bones and teeth and keeps your own skeleton strong, because the baby will draw what he or she needs from your body. Most adults are advised to get about 1000 milligrams of calcium daily during pregnancy, ideally from food. Good sources include milk, yogurt, and pasteurized cheese, as well as fortified plant drinks, tofu, almonds, sesame paste, and green vegetables such as broccoli. WHO recommends calcium supplementation for pregnant women whose dietary intake is low, particularly where dairy consumption is limited, so ask your clinician whether a supplement makes sense for you. If you cannot tolerate lactose, choose lactose-free or fortified options. Pair calcium-rich foods with vitamin D, which helps the calcium you eat actually get absorbed.',
    bodyFa:
      'کلسیم استخوان‌ها و دندان‌های جنین را می‌سازد و اسکلت خود شما را هم محکم نگه می‌دارد، چون جنین نیاز خود را از بدن مادر تأمین می‌کند. در بارداری معمولاً توصیه می‌شود روزانه حدود 1000 میلی‌گرم کلسیم، ترجیحاً از راه غذا، دریافت شود. منابع خوب آن شامل شیر، ماست و پنیر پاستوریزه و همچنین نوشیدنی‌های گیاهی غنی‌شده، توفو، بادام، ارده و سبزیجاتی مانند بروکلی است. سازمان جهانی بهداشت برای زنانی که دریافت غذایی آن‌ها پایین است، به‌ویژه در مناطقی که مصرف لبنیات محدود است، مصرف مکمل کلسیم را توصیه می‌کند؛ با پزشک خود درباره‌ی لزوم مکمل مشورت کنید. اگر تحمل لاکتوز ندارید، محصولات بدون لاکتوز یا غنی‌شده را انتخاب کنید. غذاهای پُر از کلسیم را همراه با ویتامین دی مصرف کنید تا جذب آن بهتر انجام شود.',
    citation: 'WHO Antenatal Care Recommendations (2016), Recommendation 1.2: Calcium supplementation',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241549912',
    year: 2016,
  },
  {
    id: 'caffeine-limits',
    category: 'nutrition',
    topicsEn: ['caffeine', 'coffee', 'tea', 'limits'],
    keywordsEn: [
      'caffeine', 'coffee', 'tea', 'chocolate', 'energy drinks', '300 mg',
      'limit', 'cola', 'low birth weight', 'decaf', 'soda', 'daily intake',
    ],
    keywordsFa: [
      'کافئین', 'قهوه', 'چای', 'شکلات', 'نوشیدنی‌های انرژی‌زا', '300 میلی‌گرم',
      'محدودیت', 'نوشابه', 'وزن کم هنگام تولد', 'قهوه بدون کافئین', 'نوشیدنی گازدار', 'مصرف روزانه',
    ],
    titleEn: 'Caffeine: Keeping Intake Moderate',
    titleFa: 'کافئین؛ مصرف اعتدالی',
    bodyEn:
      'Caffeine crosses the placenta, and the baby’s body breaks it down slowly. WHO guidance advises keeping caffeine below 300 milligrams per day during pregnancy, and some countries suggest an even lower limit of about 200 milligrams. As a rough guide, one small cup of brewed coffee contains around 80 to 100 milligrams, a cup of black tea about 40 to 50, and cola or energy drinks also count, as does chocolate. High intake has been linked in studies with lower birth weight, so trimming portion sizes is a simple way to reduce exposure. Try decaffeinated coffee, weaker tea, or caffeine-free herbal options that are safe in pregnancy. If you feel shaky, have trouble sleeping, or notice a racing heartbeat, your current intake may be too high.',
    bodyFa:
      'کافئین از جفت عبور می‌کند و بدن جنین آن را به‌کندی تجزیه می‌کند. توصیه‌ی سازمان جهانی بهداشت آن است که در بارداری مصرف کافئین کمتر از 300 میلی‌گرم در روز بماند و برخی کشورها حد پایین‌تری، حدود 200 میلی‌گرم، پیشنهاد می‌کنند. به‌طور تقریبی، یک فنجان کوچک قهوه‌ی دم‌کرده حدود 80 تا 100 میلی‌گرم و یک فنجان چای سیاه حدود 40 تا 50 میلی‌گرم کافئین دارد؛ نوشابه و نوشیدنی‌های انرژی‌زا و شکلات هم در این محاسبه حساب می‌شوند. در مطالعات، مصرف زیاد با وزن کمتر هنگام تولد همراه بوده است، پس کوچک‌کردن اندازه‌ی سرو راه ساده‌ای برای کاهش مواجهه است. قهوه‌ی بدون کافئین، چای رقیق‌تر یا دمنوش‌های مجاز در بارداری را امتحان کنید. اگر دچار لرزش، بی‌خوابی یا تپش قلب می‌شوید، احتمالاً مصرف فعلی شما زیاد است.',
    citation: 'WHO Antenatal Care Recommendations (2016), Recommendation 1.5: Reduction of caffeine intake',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241549912',
    year: 2016,
  },
  {
    id: 'fish-mercury',
    category: 'nutrition',
    topicsEn: ['fish', 'mercury', 'omega-3', 'seafood'],
    keywordsEn: [
      'fish', 'seafood', 'mercury', 'omega-3', 'salmon', 'sardines',
      'tuna', 'shark', 'swordfish', 'raw fish', 'sushi', 'servings',
    ],
    keywordsFa: [
      'ماهی', 'آبزیان', 'جیوه', 'امگا 3', 'سالمون', 'ساردین',
      'تن', 'کوسه', 'شمشیرماهی', 'ماهی خام', 'سوشی', 'وعده ماهی',
    ],
    titleEn: 'Fish and Mercury: Choose Wisely',
    titleFa: 'ماهی و جیوه؛ انتخاب آگاهانه',
    bodyEn:
      'Fish is an excellent source of protein and omega-3 fats that support the baby’s brain and eye development, so eating some fish each week is encouraged. The key is choosing low-mercury species. Safe, widely recommended choices include salmon, sardines, trout, and herring, about two to three servings weekly. Limit albacore or white tuna to roughly one serving per week. Avoid shark, swordfish, king mackerel, and tilefish, which accumulate more mercury, a metal that can affect the baby’s developing nervous system. Avoid raw fish and shellfish, including sushi made with raw fish and raw oysters, because of infection risk. Cook fish thoroughly until it flakes, and choose well-cooked smoked fish. If you do not eat fish, ask your clinician about other ways to obtain omega-3 fats.',
    bodyFa:
      'ماهی منبع عالی پروتئین و چربی‌های امگا 3 است که به رشد مغز و چشم جنین کمک می‌کند، پس خوردن مقداری ماهی در هر هفته توصیه می‌شود. نکته‌ی مهم، انتخاب گونه‌های کم‌جیوه است. سالمون، ساردین، قزل‌آلا و شاهماهی از انتخاب‌های امن و پرتوصیه‌اند، حدود دو تا سه وعده در هفته. مصرف ماهی تن سفید (آلباکور) را به حدود یک وعده در هفته محدود کنید. از خوردن کوسه، شمشیرماهی و ماهی‌های پرجیوه پرهیز کنید، چون جیوه می‌تواند به دستگاه عصبی در حال رشد جنین آسیب بزند. ماهی و میگوی خام، از جمله سوشی با ماهی خام و صدف خام، به دلیل خطر عفونت ممنوع است. ماهی را کاملاً بپزید تا مغز آن پخته شود و ماهی دودی را تنها در حالت کاملاً پخته مصرف کنید. اگر ماهی نمی‌خورید، درباره‌ی راه‌های دیگر تأمین امگا 3 با پزشک مشورت کنید.',
    citation: 'US FDA/EPA Advice About Eating Fish (2021); NHS, Foods to avoid in pregnancy',
    sourceUrl: 'https://www.fda.gov/food/consumers/advice-about-eating-fish',
    year: 2021,
  },
  {
    id: 'foods-to-avoid',
    category: 'safety',
    topicsEn: ['food safety', 'listeriosis', 'toxoplasmosis', 'infection prevention'],
    keywordsEn: [
      'foods to avoid', 'listeria', 'listeriosis', 'toxoplasmosis', 'unpasteurized', 'soft cheese',
      'raw eggs', 'undercooked meat', 'pate', 'deli meat', 'washing', 'food poisoning',
    ],
    keywordsFa: [
      'مواد غذایی ممنوعه', 'لیستریا', 'لیستریوز', 'توکسوپلاسموز', 'پاستوریزه نشده', 'پنیر نرم کپک‌دار',
      'تخم‌مرغ خام', 'گوشت نیم‌پز', 'پاته', 'سوسیس و کالباس', 'شستن سبزیجات', 'مسومیت غذایی',
    ],
    titleEn: 'Foods to Avoid During Pregnancy',
    titleFa: 'غذاهایی که در بارداری باید از آن‌ها پرهیز کرد',
    bodyEn:
      'A few infections that food can carry are particularly risky in pregnancy. Listeria grows even in chilled foods, so avoid unpasteurized milk and soft cheeses made from it, chilled ready-to-eat meats and pate, and pre-prepared salads eaten cold, unless they are reheated until steaming hot. To prevent toxoplasmosis, cook all meat thoroughly, wash fruits and vegetables, wear gloves when gardening or changing cat litter, and if possible have someone else handle the litter box. Avoid raw or partially cooked eggs, undercooked meat and poultry, raw shellfish, and unwashed produce. Wash hands, knives, and boards after handling raw meat, and keep chilled foods properly refrigerated. These simple kitchen habits greatly reduce risk while still allowing a varied, healthy diet.',
    bodyFa:
      'برخی عفونت‌های قابل‌انتقال از راه غذا در بارداری خطر ویژه‌ای دارند. باکتری لیستریا حتی در مواد غذایی سرد هم رشد می‌کند؛ بنابراین از شیر پاستوریزه‌نشده و پنیرهای نرمِ تهیه‌شده از آن، گوشت‌های سرد آماده‌مصرف، پاته و سالادهای از پیش آماده که سرد خورده می‌شوند پرهیز کنید، مگر آنکه تا زمان داغ‌شدنِ کامل دوباره گرم شوند. برای پیشگیری از توکسوپلاسموز، همه‌ی گوشت‌ها را کاملاً بپزید، میوه و سبزی را بشویید، هنگام باغبانی یا تعویض شن‌گربه دستکش بزنید و در صورت امکان این کار را به فرد دیگری بسپارید. از تخم‌مرغ خام یا نیم‌پز، گوشت و مرغ نپخته‌ی کامل، صدف خام و میوه‌ی نشسته پرهیز کنید. پس از تماس با گوشت خام، دست‌ها، چاقو و تخته‌ی خردکن را بشویید و مواد سرد را در دمای مناسب یخچال نگه دارید. همین عادت‌های ساده‌ی آشپزخانه، خطر را به‌شدت کم می‌کند و تنوع غذایی سالم شما حفظ می‌شود.',
    citation: 'NHS, Foods to avoid in pregnancy',
    sourceUrl: 'https://www.nhs.uk/pregnancy/keeping-well/foods-to-avoid/',
  },
  {
    id: 'alcohol-and-tobacco',
    category: 'safety',
    topicsEn: ['alcohol', 'smoking', 'secondhand smoke', 'prevention'],
    keywordsEn: [
      'alcohol', 'no safe amount', 'fetal alcohol spectrum', 'smoking', 'cigarettes', 'secondhand smoke',
      'quitting', 'preterm birth', 'low birth weight', 'e-cigarettes', 'shisha', 'support',
    ],
    keywordsFa: [
      'الکل', 'مقدار بی‌خطر', 'سندرم الکلی جنین', 'سیگار کشیدن', 'دود دست دوم', 'ترک سیگار',
      'زایمان زودرس', 'وزن کم هنگام تولد', 'سیگار الکترونیکی', 'قلیان', 'آسیب جنین', 'مشاوره ترک',
    ],
    titleEn: 'Alcohol, Smoking and Pregnancy',
    titleFa: 'الکل و دخانیات در بارداری',
    bodyEn:
      'Health authorities are united on this point: no amount of alcohol is known to be safe in pregnancy. Alcohol passes directly to the baby and can affect brain development, which is why complete avoidance is advised from conception onward, including in the weeks before a pregnancy is recognized. Tobacco smoke reduces oxygen supply to the baby and increases the risk of miscarriage, preterm birth, low birth weight, and stillbirth. Quitting at any point in pregnancy still brings real benefit, and support programs, counseling, and nicotine-replacement options can be discussed with your clinician. Secondhand smoke and waterpipe (shisha) use carry similar harms, and electronic cigarettes are not considered a safe alternative. If stopping feels hard, tell your clinician early so a supportive plan can be made.',
    bodyFa:
      'همه‌ی مراجع سلامت در این نکته هم‌نظرند: هیچ مقداری از الکل در بارداری بی‌خطر شناخته نشده است. الکل مستقیماً به جنین می‌رسد و می‌تواند رشد مغز را تحت تأثیر قرار دهد؛ به همین دلیل پرهیز کامل از ابتدای بارداری و حتی هفته‌هایی که هنوز بارداری شناخته نشده، توصیه می‌شود. دود سیگار اکسیژن‌رسانی به جنین را کاهش می‌دهد و خطر سقط، زایمان زودرس، وزن کم هنگام تولد و مرده‌زایی را افزایش می‌دهد. ترک سیگار در هر مرحله از بارداری همچنان سود واقعی دارد و می‌توانید درباره‌ی برنامه‌های حمایتی، مشاوره و گزینه‌های جایگزین نیکوتین با پزشک خود صحبت کنید. دود سیگار دیگران و مصرف قلیان نیز آسیب‌های مشابهی دارد و سیگار الکترونیکی هم جایگزین بی‌خطری به شمار نمی‌رود. اگر ترک کردن برایتان دشوار است، همین ابتدا به پزشک بگویید تا یک برنامه‌ی حمایتی برایتان تنظیم شود.',
    citation: 'CDC, Alcohol and Pregnancy; WHO Antenatal Care Recommendations (2016), alcohol and tobacco guidance',
    sourceUrl: 'https://www.cdc.gov/ncbddd/fasd/alcohol-pregnancy.html',
  },
  {
    id: 'nausea-vomiting',
    category: 'symptoms',
    topicsEn: ['morning sickness', 'nausea', 'vomiting', 'hydration'],
    keywordsEn: [
      'nausea', 'vomiting', 'morning sickness', 'ginger', 'small meals', 'vitamin b6',
      'hydration', 'food aversion', 'smell sensitivity', 'hyperemesis', 'acupressure', 'first trimester',
    ],
    keywordsFa: [
      'تهوع', 'استفراغ', 'تهوع صبحگاهی', 'زنجبیل', 'وعده‌های کوچک', 'ویتامین ب 6',
      'آب‌رسانی', 'بی‌اشتهایی', 'حساسیت به بو', 'استفراغ شدید بارداری', 'بند اکوپرسور', 'سه‌ماهه اول',
    ],
    titleEn: 'Coping with Nausea and Vomiting',
    titleFa: 'کنار آمدن با تهوع و استفراغ بارداری',
    bodyEn:
      'Nausea and vomiting affect many pregnant women, most often between weeks 6 and 16, and can strike at any time of day. Helpful measures include eating small frequent meals rather than three large ones, keeping dry plain snacks like crackers by the bed to eat before rising, avoiding strong smells and greasy foods, and sipping fluids steadily through the day. Ginger in food or tea and acupressure wrist bands help some women, and vitamin B6 is a commonly recommended first medicine; always check doses with your clinician. Contact your clinician if you cannot keep fluids down for 24 hours, you are losing weight, you feel dizzy or faint, or you vomit blood, as these signs need assessment for a more severe condition requiring treatment.',
    bodyFa:
      'تهوع و استفراغ بسیاری از زنان باردار را درگیر می‌کند، بیشترین شدت آن میان هفته‌های 6 تا 16 است و در هر ساعتی از شبانه‌روز هم ممکن است رخ دهد. اقدامات مفید شامل این‌هاست: به‌جای سه وعده‌ی حجیم، وعده‌های کوچک و مکرر بخورید؛ بیسکویت ساده‌ی نمکی کنار تخت بگذارید و پیش از بلندشدن بخورید؛ از بوهای تند و غذاهای چرب دوری کنید و در طول روز به‌تدریج مایعات بنوشید. زنجبیل در غذا یا دمنوش و بند اکوپرسور مچ برای برخی زنان مفید است و ویتامین ب 6 معمولاً نخستین داروی توصیه‌شده است؛ مقدار مصرف را حتماً با پزشک خود چک کنید. اگر بیش از 24 ساعت نتوانستید مایعات را نگه دارید، وزن کم می‌کنید، سرتان گیج می‌رود یا در استفراغ خود خون می‌بینید، حتماً به پزشک مراجعه کنید، چون این نشانه‌ها نیاز به بررسی یک حالت شدیدترِ قابل‌درمان دارد.',
    citation: 'ACOG Patient FAQ: Morning Sickness, Nausea and Vomiting of Pregnancy',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/morning-sickness-nausea-and-vomiting-of-pregnancy',
  },
  {
    id: 'heartburn',
    category: 'symptoms',
    topicsEn: ['heartburn', 'indigestion', 'reflux', 'digestion'],
    keywordsEn: [
      'heartburn', 'indigestion', 'acid reflux', 'burning chest', 'small meals', 'avoid lying down',
      'antacids', 'late night eating', 'spicy food', 'fatty food', 'third trimester', 'posture',
    ],
    keywordsFa: [
      'سوزش سردل', 'سوءهاضمه', 'بازگشت اسید', 'سوزش قفسه سینه', 'وعده‌های کوچک', 'دراز نکشیدن پس از غذا',
      'آنتی‌اسید', 'شام دیرهنگام', 'غذای تند', 'غذای چرب', 'سه‌ماهه سوم', 'وضعیت بدن',
    ],
    titleEn: 'Heartburn and Indigestion in Pregnancy',
    titleFa: 'سوزش سردل و سوءهاضمه در بارداری',
    bodyEn:
      'Heartburn, a burning feeling behind the breastbone, is common in pregnancy because pregnancy hormones relax the valve at the top of the stomach and the growing baby presses on your digestive organs. It often worsens in the second and third trimesters. Practical steps include eating smaller meals more often, eating slowly, avoiding very fatty, spicy, or acidic foods, and cutting back on coffee and fizzy drinks. Try not to lie down for at least an hour after eating, keep the head of the bed slightly raised, and avoid eating large meals close to bedtime. Loose clothing around the waist helps too. Simple antacids are often suitable in pregnancy, but check with your pharmacist or clinician first, and mention persistent severe symptoms, difficulty swallowing, or vomiting blood.',
    bodyFa:
      'سوزش سردل، یعنی احساس سوزش پشت جناغ سینه، در بارداری شایع است؛ چون هورمون‌های بارداری دریچه‌ی بالای معده را شل می‌کنند و رشد جنین هم بر اندام‌های گوارشی فشار می‌آورد. این حالت در سه‌ماهه‌ی دوم و سوم معمولاً بدتر می‌شود. اقدامات عملی: وعده‌های کوچک‌تر و بیشتر بخورید، آرام غذا میل کنید، از غذاهای خیلی چرب، تند یا ترش‌دودی بپرهیزید و قهوه و نوشابه‌های گازدار را کم کنید. دست‌کم یک ساعت پس از غذا دراز نکشید، سر تخت را کمی بالاتر بگذارید و شام حجیم را نزدیک به زمان خواب نخورید. پوشیدن لباس گشاد دور شکم هم کمک می‌کند. آنتی‌اسیدهای ساده معمولاً در بارداری مجازند، اما پیش از مصرف با پزشک یا داروساز مشورت کنید. اگر نشانه‌ها شدید و مداوم است، بلع دشوار دارید یا خون استفراغ می‌کنید، حتماً به پزشک اطلاع دهید.',
    citation: 'NHS, Indigestion and heartburn in pregnancy',
    sourceUrl: 'https://www.nhs.uk/pregnancy/related-conditions/common-symptoms/indigestion-and-heartburn/',
  },
  {
    id: 'constipation',
    category: 'symptoms',
    topicsEn: ['constipation', 'fiber', 'hydration', 'digestion'],
    keywordsEn: [
      'constipation', 'fiber', 'whole grains', 'prunes', 'water intake', 'exercise',
      'iron supplement', 'hemorrhoids', 'stool softener', 'gut health', 'straining', 'regularity',
    ],
    keywordsFa: [
      'یبوست', 'فیبر', 'نان سبوس‌دار', 'آلو', 'نوشیدن آب', 'ورزش',
      'قرص آهن', 'بواسیر', 'نرم‌کننده مدفوع', 'سلامت روده', 'فشار هنگام اجابت مزاج', 'کارکرد روده',
    ],
    titleEn: 'Preventing and Easing Constipation',
    titleFa: 'پیشگیری و تسکین یبوست',
    bodyEn:
      'Constipation is very common in pregnancy because hormones slow the movement of the bowel and iron supplements add to the effect. It can also contribute to hemorrhoids. Simple measures usually help: drink plenty of water through the day, choose high-fiber foods such as whole grains, oats, legumes, fruits especially prunes, pears, and figs, and vegetables, and keep physically active with walking or approved exercise. Establishing a regular toilet routine and not delaying the urge to pass stool also matters. If these steps are not enough, your clinician may suggest a gentle fiber supplement or a laxative that is considered safe in pregnancy; avoid self-prescribing stimulant laxatives. Contact your clinician if you have severe pain, no bowel movement for several days despite measures, or you notice bleeding from the back passage.',
    bodyFa:
      'یبوست در بارداری بسیار شایع است، چون هورمون‌های بارداری حرکت روده را کند می‌کنند و قرص آهن هم این اثر را تشدید می‌کند. یبوست می‌تواند به بواسیر هم منجر شود. اقدامات ساده معمولاً کمک می‌کند: در طول روز آب کافی بنوشید، غذاهای پرفایبر مانند غلات کامل، جو، حبوبات، میوه‌ها به‌ویژه آلو، گلابی و انجیر و سبزیجات را در برنامه‌ی غذایی بگنجانید و با پیاده‌روی یا ورزش‌های مجاز فعال بمانید. داشتن برنامه‌ی منظم برای اجابت مزاج و به‌تعویق نینداختن نیاز به دستشویی نیز اهمیت دارد. اگر این اقدامات کافی نبود، پزشک ممکن است مکمل فیبر ملایم یا ملینی که در بارداری بی‌خطر شناخته شده را پیشنهاد دهد؛ از تجویز خودسرانه‌ی ملین‌های محرک خودداری کنید. اگر درد شدید دارید، با وجود رعایت اقدامات چند روز اجابت مزاج نداشته‌اید یا خونریزی از مقعد می‌بینید، به پزشک مراجعه کنید.',
    citation: 'NHS, Constipation in pregnancy',
    sourceUrl: 'https://www.nhs.uk/pregnancy/related-conditions/common-symptoms/constipation/',
  },
  {
    id: 'back-pain',
    category: 'symptoms',
    topicsEn: ['back pain', 'posture', 'pelvis', 'comfort'],
    keywordsEn: [
      'back pain', 'low back ache', 'posture', 'lifting', 'maternity support', 'pelvic tilt',
      'warm compress', 'massage', 'shoes', 'sleep position', 'sciatica', 'physiotherapy',
    ],
    keywordsFa: [
      'کمردرد', 'درد پایین کمر', 'وضعیت بدن', 'بلند کردن اجسام', 'حمایت شکمی', 'ورزش لگن',
      'کمپرس گرم', 'ماساژ', 'کفش مناسب', 'وضعیت خواب', 'درد عصب سیاتیک', 'فیزیوتراپی',
    ],
    titleEn: 'Managing Back Pain in Pregnancy',
    titleFa: 'کنترل کمردرد در بارداری',
    bodyEn:
      'Back pain affects a large share of pregnant women, especially in later months, as weight increases, posture changes, and ligaments loosen to prepare the pelvis for birth. Preventive habits include standing tall without arching the back, bending at the knees when lifting, avoiding heavy loads, wearing flat supportive shoes, and sleeping on your side with a pillow between the knees. Gentle exercises such as pelvic tilts, prenatal yoga, or swimming can strengthen supporting muscles, and warm compresses or a pregnancy massage may bring relief. Avoid prolonged standing or sitting, and use a chair with good back support. Tell your clinician if pain is severe or one-sided, travels down the leg, comes with fever, numbness, or bladder problems, or follows a fall, since these need proper assessment.',
    bodyFa:
      'کمردرد بخش بزرگی از زنان باردار را درگیر می‌کند، به‌ویژه در ماه‌های پایانی؛ چون وزن افزایش می‌یابد، وضعیت بدن تغییر می‌کند و رباط‌ها برای آماده‌سازی لگن برای زایمان شل می‌شوند. عادت‌های پیشگیرانه عبارت‌اند از: ایستادن راست بدون قوس دادن به کمر، خم‌شدن از زانو هنگام بلندکردن اجسام، پرهیز از حمل بار سنگین، استفاده از کفش تخت و استاندارد و خوابیدن به پهلو همراه با گذاشتن بالش میان زانوها. ورزش‌های ملایم مانند تیلت لگن، یوگای بارداری یا شنا عضلات نگهدارنده را تقویت می‌کند و کمپرس گرم یا ماساژ بارداری هم ممکن است تسکین دهد. از ایستادن یا نشستن طولانی بپرهیزید و از صندلی با پشتی مناسب استفاده کنید. اگر درد شدید یا یک‌طرفه است، به پا تیر می‌کشد، با تب، بی‌حسی یا مشکل ادراری همراه است یا پس از زمین‌خوردن ایجاد شده، حتماً به پزشک اطلاع دهید، چون این موارد نیاز به بررسی دارد.',
    citation: 'NHS, Back pain in pregnancy',
    sourceUrl: 'https://www.nhs.uk/pregnancy/related-conditions/common-symptoms/back-pain/',
  },
  {
    id: 'safe-exercise',
    category: 'lifestyle',
    topicsEn: ['exercise', 'physical activity', 'walking', 'fitness'],
    keywordsEn: [
      'exercise', 'physical activity', 'walking', 'swimming', 'prenatal yoga', '150 minutes',
      'strength training', 'contact sports', 'pelvic floor', 'hydration', 'overheating', 'warning signs',
    ],
    keywordsFa: [
      'ورزش', 'فعالیت بدنی', 'پیاده‌روی', 'شنا', 'یوگای بارداری', '150 دقیقه',
      'تمرین قدرتی', 'ورزش‌های برخوردی', 'عضلات کف لگن', 'آب‌رسانی', 'گرم شدن بیش از حد', 'نشانه‌های هشدار',
    ],
    titleEn: 'Safe Exercise During Pregnancy',
    titleFa: 'ورزش بی‌خطر در بارداری',
    bodyEn:
      'For women with uncomplicated pregnancies, regular moderate exercise is recommended and brings real benefits: better fitness, healthier weight gain, improved mood and sleep, and possibly an easier birth. Aim for at least 150 minutes of moderate activity spread across the week, such as brisk walking, swimming, stationary cycling, or prenatal yoga, and include muscle-strengthening twice weekly. Stay hydrated, avoid overheating, and eat a small snack before longer sessions. Contact sports, activities with fall risk such as skiing or horse riding, hot yoga, and scuba diving are not advised. If you were very inactive before pregnancy, start gently and build up. Stop and seek medical advice if you feel dizzy, have chest pain, painful contractions, fluid leaking, bleeding, or a marked reduction in fetal movement during or after activity.',
    bodyFa:
      'برای زنانی که بارداری بدون عارضه دارند، ورزش منظم و متوسط توصیه می‌شود و سود واقعی دارد: بهبود آمادگی جسمانی، افزایش وزن سالم‌تر، خلق‌وخوی بهتر و خواب بهتر و احتمالاً زایمان راحت‌تر. هفته‌ای دست‌کم 150 دقیقه فعالیت متوسط، مانند پیاده‌روی تند، شنا، دوچرخه‌ی ثابت یا یوگای بارداری داشته باشید و دو بار در هفته تمرین تقویت عضلات را هم بگنجانید. آب کافی بنوشید، از گرم‌شدن بیش از حد بدن بپرهیزید و پیش از جلسه‌های طولانی‌تر، میان‌وعده‌ی کوچکی بخورید. ورزش‌های برخوردی، فعالیت‌های با خطر افتادن مانند اسکی یا سواری اسب، یوگای داغ و غواصی توصیه نمی‌شود. اگر پیش از بارداری خیلی کم‌تحرک بودید، آرام شروع کنید و کم‌کم افزایش دهید. در صورت سرگیجه، درد قفسه سینه، انقباضات دردناک، خارج‌شدن مایع، خونریزی یا کاهش محسوس حرکات جنین حین یا پس از فعالیت، ورزش را قطع و با پزشک تماس بگیرید.',
    citation: 'ACOG Committee Opinion No. 804, Physical Activity and Exercise During Pregnancy and the Postpartum Period',
    sourceUrl: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period',
    year: 2020,
  },
  {
    id: 'sleep-position',
    category: 'lifestyle',
    topicsEn: ['sleep', 'rest', 'side sleeping', 'stillbirth prevention'],
    keywordsEn: [
      'sleep position', 'side sleeping', 'left side', 'third trimester', 'rest', 'fatigue',
      'pillows', 'stillbirth risk', 'night waking', 'nap', 'comfort', '28 weeks',
    ],
    keywordsFa: [
      'وضعیت خواب', 'خواب به پهلو', 'پهلوی چپ', 'سه‌ماهه سوم', 'استراحت', 'خستگی',
      'بالش بارداری', 'خطر مرده‌زایی', 'بیدار شدن شبانه', 'چرت', 'راحتی', 'هفته 28',
    ],
    titleEn: 'Sleep Position and Rest in Later Pregnancy',
    titleFa: 'وضعیت خواب و استراحت در ماه‌های پایانی',
    bodyEn:
      'As pregnancy progresses, finding comfortable sleep becomes harder, and tiredness is completely normal. From about 28 weeks onward, research suggests that falling asleep on your back may be associated with an increased risk of stillbirth, so guidance in several countries advises settling to sleep on your side, whichever side feels best. If you wake on your back, simply roll onto your side again; there is no need for alarm. Supportive pillows under the belly and between the knees, a slightly raised head, and a dark, cool room can all help. Prioritize rest with short daytime naps when needed, reduce fluids just before bed to limit night trips to the toilet, and gentle stretching may ease leg cramps. Discuss persistent insomnia with your clinician.',
    bodyFa:
      'با پیشرفت بارداری، خوابیدن راحت سخت می‌شود و احساس خستگی کاملاً طبیعی است. از حدود هفته‌ی 28 به بعد، پژوهش‌ها نشان داده‌اند که به پشت خوابیدن ممکن است با خطر بیشتر مرده‌زایی همراه باشد؛ به همین دلیل راهنماهای چند کشور توصیه می‌کنند خواب را به پهلو شروع کنید، هر پهلو که راحت‌تر است. اگر به پشت بیدار شدید، نگران نباشید و دوباره به پهلو بچرخید. بالش‌های نگهدارنده زیر شکم و میان زانوها، کمی بالاتر قرار دادن سر و اتاق تاریک و خنک همه کمک می‌کنند. به استراحت اهمیت بدهید و در صورت نیاز در طول روز چرت کوتاه بزنید، کمی پیش از خواب مایعات را کم کنید تا دفعات رفت‌وآمد به دستشویی کم شود و کشش‌های ملایم ممکن است گرفتگی پا را تسکین دهد. بی‌خوابی مداوم را با پزشک خود در میان بگذارید.',
    citation: 'Tommy’s (UK), Sleep On Side campaign, based on the MiNESS cohort study (2017)',
    sourceUrl: 'https://www.tommys.org/pregnancy-information/health-professionals/free-pregnancy-resources/sleep-side-campaign',
    year: 2017,
  },
  {
    id: 'pregnancy-travel',
    category: 'lifestyle',
    topicsEn: ['travel', 'air travel', 'road trips', 'planning'],
    keywordsEn: [
      'travel', 'air travel', 'flying', 'seatbelt', 'long car trips', 'leg clots',
      'hydration', 'breaks', 'third trimester restrictions', 'travel vaccines', 'malaria', 'insurance',
    ],
    keywordsFa: [
      'سفر', 'سفر هوایی', 'پرواز', 'کمربند ایمنی', 'سفر طولانی با ماشین', 'لخته وریدی',
      'آب‌رسانی', 'استراحت بین‌راهی', 'محدودیت سه‌ماهه سوم', 'واکسن سفر', 'مالاریا', 'بیمه سفر',
    ],
    titleEn: 'Traveling Safely While Pregnant',
    titleFa: 'سفر ایمن در دوران بارداری',
    bodyEn:
      'Most women with healthy pregnancies can travel safely, with a little planning. For flights, most airlines allow travel until around 36 weeks for single pregnancies, but policies differ, so check in advance and carry your antenatal notes. On long flights and car journeys, move around or stretch every couple of hours, keep hydrated, and wear loose clothing; this helps prevent blood clots in the legs. Always wear the seatbelt with the strap below the belly, across the hips. Plan medical access at your destination, confirm your insurance covers pregnancy, and discuss any needed travel vaccinations or malaria precautions before booking, since some vaccines and medicines are not advised in pregnancy. Many clinicians suggest avoiding long-distance travel near the end of pregnancy, when labor could begin away from home.',
    bodyFa:
      'بیشتر زنان با بارداری سالم با کمی برنامه‌ریزی می‌توانند به‌آسانی سفر کنند. بیشتر خطوط هوایی پرواز تا حدود هفته‌ی 36 برای بارداری تک‌قلو را مجاز می‌دانند؛ قوانین شرکت را پیش‌تر بررسی کنید و مدارک مراقبت بارداری را همراه داشته باشید. در پروازهای طولانی و مسیرهای طولانی با خودرو، هر دو ساعت یک‌بار حرکت کنید یا پاهایتان را بکشید، آب کافی بنوشید و لباس گشاد بپوشید؛ این کارها از لخته‌ی وریدی پا پیشگیری می‌کند. کمربند ایمنی را همیشه ببندید و نوار آن را زیر شکم، روی لگن قرار دهید. دسترسی پزشکی در مقصد را بررسی کنید، مطمئن شوید بیمه‌تان بارداری را پوشش می‌دهد و پیش از رزرو، درباره‌ی واکسن‌ها و پیشگیری از مالاریای مورد نیاز سفر با پزشک صحبت کنید، چون برخی واکسن‌ها و داروها در بارداری توصیه نمی‌شوند. بسیاری از پزشکان توصیه می‌کنند در ماه‌های پایانی بارداری از سفرهای دور بپرهیزید، وقتی ممکن است زایمان دور از خانه شروع شود.',
    citation: 'ACOG Committee Opinion No. 746, Air Travel During Pregnancy; ACOG Patient FAQ: Travel During Pregnancy',
    sourceUrl: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2018/07/air-travel-during-pregnancy',
    year: 2018,
  },
  {
    id: 'dental-care',
    category: 'lifestyle',
    topicsEn: ['dental care', 'gums', 'hygiene', 'checkups'],
    keywordsEn: [
      'dental care', 'gums', 'bleeding gums', 'pregnancy gingivitis', 'brushing', 'flossing',
      'dental checkup', 'x-rays', 'anesthesia', 'vomiting', 'enamel', 'fluoride',
    ],
    keywordsFa: [
      'مراقبت دندان', 'لثه', 'خونریزی لثه', 'التهاب لثه بارداری', 'مسواک', 'نخ دندان',
      'چکاپ دندان', 'عکس رادیولوژی', 'بی‌حسی', 'استفراغ', 'مینای دندان', 'فلوراید',
    ],
    titleEn: 'Dental Care and Healthy Gums',
    titleFa: 'مراقبت از دندان و سلامت لثه',
    bodyEn:
      'Pregnancy hormones make gums more sensitive, so many women notice redness, swelling, or bleeding when brushing, a condition called pregnancy gingivitis. Good dental care protects both you and your baby, since gum disease has been linked with preterm birth in some studies. Brush twice daily with fluoride toothpaste, floss once a day, and keep regular dental checkups, which are safe and encouraged in pregnancy. After vomiting from morning sickness, do not brush immediately; rinse with water or a weak bicarbonate solution first, because stomach acid softens tooth enamel. Routine dental treatment, including local anesthesia and dental x-rays with abdominal shielding when needed, can be done safely at any stage. Tell your dentist you are pregnant, and mention any lumps, sores, or persistent bleeding in the mouth.',
    bodyFa:
      'هورمون‌های بارداری لثه را حساس‌تر می‌کنند؛ به همین دلیل بسیاری از زنان هنگام مسواک زدن قرمزی، تورم یا خونریزی لثه را تجربه می‌کنند که به آن التهاب لثه‌ی بارداری می‌گویند. مراقبت خوب از دهان برای شما و جنین هر دو مهم است، چون در برخی مطالعات بیماری لثه با زایمان زودرس مرتبط دانسته شده است. روزی دو بار با خمیردندان حاوی فلوراید مسواک بزنید، روزی یک بار نخ دندان بکشید و چکاپ‌های منظم دندان‌پزشکی را حفظ کنید؛ این کار در بارداری بی‌خطر است. پس از استفراغ، بلافاصله مسواک نزنید؛ ابتدا دهان را با آب یا محلول رقیج جوش‌شیرین بشویید، چون اسید معده مینای دندان را نرم می‌کند. درمان‌های روتین دندان‌پزشکی، از جمله بی‌حسی موضعی و عکس رادیولوژی با محافظ شکمی، در هر مرحله از بارداری به‌طور بی‌خطر ممکن است. به دندان‌پزشک بگویید باردار هستید و هر برجستگی، زخم یا خونریزی مداوم در دهان را گزارش کنید.',
    citation: 'NHS, Teeth and gums in pregnancy',
    sourceUrl: 'https://www.nhs.uk/pregnancy/keeping-well/teeth-and-gums/',
  },
  {
    id: 'flu-tdap-vaccination',
    category: 'screening',
    topicsEn: ['vaccination', 'flu', 'Tdap', 'immunity'],
    keywordsEn: [
      'flu vaccine', 'influenza', 'tdap', 'whooping cough', 'pertussis', 'vaccination in pregnancy',
      'third trimester', 'antibodies', 'newborn protection', 'safety', 'fever', 'immunization',
    ],
    keywordsFa: [
      'واکسن آنفلوانزا', 'آنفلوانزا', 'واکسن سه‌گانه', 'سیاه‌سرفه', 'پرتوسیس', 'واکسیناسیون در بارداری',
      'سه‌ماهه سوم', 'آنتی‌بادی', 'محافظت نوزاد', 'ایمنی', 'تب', 'ایمن‌سازی',
    ],
    titleEn: 'Flu and Tdap Vaccination in Pregnancy',
    titleFa: 'واکسن آنفلوانزا و واکسن سه‌گانه (Tdap) در بارداری',
    bodyEn:
      'Vaccination in pregnancy protects two people at once. The inactivated flu vaccine is recommended during any trimester of the flu season, because pregnant women who catch influenza have a higher risk of serious illness, and fever in early pregnancy can be harmful to the baby; the vaccine also passes protective antibodies to the fetus. The Tdap vaccine, protecting against tetanus, diphtheria, and whooping cough, is advised during every pregnancy, ideally between 27 and 36 weeks, so the newborn receives antibodies against whooping cough before their own vaccinations begin, the period of greatest danger. Both vaccines have a long safety record in pregnancy. Live vaccines are avoided. If you have a fever or feel unwell beyond mild soreness after any vaccine, contact your clinician for advice.',
    bodyFa:
      'واکسیناسیون در بارداری هم‌زمان از دو نفر محافظت می‌کند. واکسن غیرفعال آنفلوانزا در هر سه‌ماهه از فصل آنفلوانزا توصیه می‌شود، چون خطر بیماری شدید در زنان باردار بیشتر است، تب در اوایل بارداری می‌تواند برای جنین مضر باشد و واکسن آنتی‌بادی‌های محافظ به جنین منتقل می‌کند. واکسن سه‌گانه (Tdap) که در برابر کزاز، دیفتری و سیاه‌سرفه محافظت می‌کند، در هر بارداری توصیه می‌شود، ترجیحاً میان هفته‌های 27 تا 36، تا نوزاد پیش از آغاز واکسیناسیون خودش، یعنی خطرناک‌ترین دوره، آنتی‌بادی ضد سیاه‌سرفه دریافت کند. هر دو واکسن سابقه‌ی طولانی ایمنی در بارداری دارند. واکسن‌های زنده تجویز نمی‌شوند. اگر پس از واکسن تب دارید یا ناراحتی شما بیش از درد و قرمزی خفیف محل تزریق ادامه دارد، با پزشک خود تماس بگیرید.',
    citation: 'CDC, Maternal Vaccination (flu and Tdap); ACOG guidance on maternal immunization',
    sourceUrl: 'https://www.cdc.gov/vaccines/pregnancy/',
  },
  {
    id: 'fetal-movement-kick-counts',
    category: 'development',
    topicsEn: ['fetal movement', 'kick counts', 'monitoring', 'third trimester'],
    keywordsEn: [
      'fetal movement', 'kick counts', 'reduced movement', 'quickening', 'daily patterns', 'third trimester',
      'monitoring', 'when to call', 'movement awareness', 'active baby', 'quiet baby', 'clinician',
    ],
    keywordsFa: [
      'حرکات جنین', 'شمارش حرکات', 'کاهش حرکت', 'اولین حرکات جنین', 'الگوی روزانه', 'سه‌ماهه سوم',
      'پایش', 'چه زمانی تماس بگیریم', 'آگاهی از حرکت', 'جنین پرتحرک', 'جنین کم‌تحرک', 'پزشک',
    ],
    titleEn: 'Fetal Movement Awareness and Kick Counts',
    titleFa: 'آگاهی از حرکات جنین و شمارش حرکات',
    bodyEn:
      'Feeling your baby move is a reassuring sign of wellbeing, and most women first sense movements between 18 and 24 weeks, earlier in later pregnancies. From around 28 weeks, it helps to learn your baby’s own pattern of activity, since every baby differs. Some clinicians suggest focused counting sessions, noticing how long it takes to feel a set number of movements such as ten, though the most important skill is knowing what is normal for your baby. Movements often feel strongest in the evening and after meals. Do not wait for the next routine visit if movements become reduced, weaker, or absent; reduced fetal movement can sometimes signal a problem, and you should contact your maternity unit or clinician the same day, or seek urgent care at night. Counting should never cause anxiety; it builds familiarity.',
    bodyFa:
      'حس‌کردن حرکات جنین نشانه‌ی اطمینان‌بخش سلامت اوست و بیشتر زنان حرکات را نخستین‌بار میان هفته‌های 18 تا 24 احساس می‌کنند؛ در بارداری‌های بعدی زودتر. از حدود هفته‌ی 28، شناختن الگوی فعالیت خود جنین مفید است، چون هر جنین الگوی خاص خود را دارد. برخی پزشکان جلسات شمارش متمرکز را پیشنهاد می‌کنند؛ یعنی ببینید احساس‌کردن تعداد معینی حرکت، مثلاً ده حرکت، چقدر طول می‌کشد، اما مهم‌ترین مهارت دانستن حالت عادی جنین خودتان است. حرکات معمولاً عصرها و پس از غذا قوی‌تر حس می‌شوند. اگر حرکات کمتر، ضعیف‌تر یا قطع شود، منتظر ویزیت بعدی نمانید؛ کاهش حرکات جنین گاهی نشانه‌ی مشکل است و باید همان روز با واحد زنان یا پزشک خود تماس بگیرید و در شب به اورژانس مراجعه کنید. شمارش حرکات نباید باعث اضطراب شود؛ هدف، آشنا شدن با جنین است.',
    citation: 'ACOG Committee Opinion No. 828, Antepartum Fetal Surveillance (fetal movement assessment)',
    sourceUrl: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2021/10/antepartum-fetal-surveillance',
    year: 2021,
  },
  {
    id: 'preeclampsia-warning-signs',
    category: 'symptoms',
    topicsEn: ['preeclampsia', 'blood pressure', 'warning signs', 'emergency'],
    keywordsEn: [
      'preeclampsia', 'high blood pressure', 'protein in urine', 'severe headache', 'vision changes', 'swelling',
      'upper abdominal pain', 'second half', 'emergency', 'urination', 'rapid swelling', 'clinician',
    ],
    keywordsFa: [
      'پره‌اکلامپسی', 'فشار خون بالا', 'پروتئین ادرار', 'سردرد شدید', 'تغییرات بینایی', 'تورم',
      'درد بالای شکم', 'نیمه دوم بارداری', 'اورژانس', 'ادرار', 'تورم سریع', 'پزشک',
    ],
    titleEn: 'Preeclampsia: Warning Signs to Know',
    titleFa: 'پره‌اکلامپسی (مسومیت بارداری)؛ نشانه‌های هشدار',
    bodyEn:
      'Preeclampsia is high blood pressure with organ effects that can develop after 20 weeks of pregnancy, most commonly in the second half. Early detection through routine blood pressure and urine checks saves lives, so attend every antenatal appointment. Know the warning signs: a severe headache that does not settle with usual remedies, changes in vision such as flashing lights, blurring, or spots, sudden swelling of the face, hands, or feet, pain just below the ribs, vomiting after mid-pregnancy, sudden weight gain, and feeling generally very unwell. These symptoms do not mean you have preeclampsia, but they always need same-day assessment. If you develop a severe headache with vision changes, strong upper abdominal pain, or convulsions, contact emergency services immediately, as preeclampsia can progress quickly and treatment protects both mother and baby.',
    bodyFa:
      'پره‌اکلامپسی فشار خون بالا همراه با تأثیر بر اندام‌هاست که معمولاً پس از هفته‌ی 20 بارداری، بیشتر در نیمه‌ی دوم، بروز می‌کند. تشخیص زودهنگام از طریق کنترل منظم فشار خون و آزمایش ادرار جان‌ها را نجات می‌دهد؛ پس همه‌ی نوبت‌های مراقبت بارداری را سر بزنید. نشانه‌های هشدار را بشناسید: سردرد شدیدی که با مسکن‌های معمول آرام نمی‌شود، تغییرات بینایی مانند جرقه، تاری یا لکه‌های نورانی، تورم ناگهانی صورت، دست‌ها یا پاها، درد زیر دنده‌ها، استفراغ در نیمه‌ی دوم بارداری، افزایش ناگهانی وزن و احساس عمومی بیماری شدید. این نشانه‌ها به این معنا نیست که قطعاً پره‌اکلامپسی دارید، اما همیشه نیاز به بررسی در همان روز دارد. اگر سردرد شدید همراه با تغییر بینایی، درد شدید بالای شکم یا تشنج پیدا کردید، فوراً با اورژانس تماس بگیرید، چون پره‌اکلامپسی می‌تواند به‌سرعت پیشرفت کند و درمان، هم مادر و هم جنین را حفظ می‌کند.',
    citation: 'ACOG Patient FAQ: Preeclampsia and High Blood Pressure During Pregnancy',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/preeclampsia-and-high-blood-pressure-during-pregnancy',
    redFlagRelated: true,
  },
  {
    id: 'preterm-labor-warning-signs',
    category: 'symptoms',
    topicsEn: ['preterm labor', 'warning signs', 'contractions', 'emergency'],
    keywordsEn: [
      'preterm labor', 'regular contractions', 'before 37 weeks', 'backache', 'pelvic pressure', 'waters breaking',
      'bloody show', 'cramps', 'cervical change', 'emergency', 'steroids', 'hospital',
    ],
    keywordsFa: [
      'زایمان زودرس', 'انقباضات منظم', 'قبل از هفته 37', 'کمردرد', 'فشار لگن', 'پاره شدن کیسه آب',
      'لکه‌ای خونی', 'دل‌درد', 'تغییر سرویکس', 'اورژانس', 'کورتیکواستروئید', 'بیمارستان',
    ],
    titleEn: 'Preterm Labor: Warning Signs Before 37 Weeks',
    titleFa: 'زایمان زودرس؛ نشانه‌های هشدار پیش از هفته 37',
    bodyEn:
      'Preterm labor means labor that begins before 37 completed weeks, and knowing its signs helps you act early, when treatment can make a real difference. Warning signs include four or more contractions in one hour, which may feel like tightening, cramping, or period-like pain; a constant low dull backache; pelvic pressure as if the baby is pushing down; new vaginal discharge changes, watery fluid leaking, or light blood or a mucus plug; and abdominal cramps with or without diarrhea. Sometimes these symptoms stop on their own, but only an examination can tell. If you notice any of them before 37 weeks, contact your clinician or maternity unit immediately rather than waiting; if you cannot reach anyone or symptoms are strong, go to the hospital. Early corticosteroids and other treatments improve the baby’s outcomes.',
    bodyFa:
      'زایمان زودرس به زایمانی گفته می‌شود که پیش از هفته‌ی 37 کامل آغاز می‌شود؛ شناختن نشانه‌های آن کمک می‌کند زودتر اقدام کنید، زمانی که درمان می‌تواند تفاوت واقعی بسازد. نشانه‌های هشدار شامل چهار انقباض یا بیشتر در یک ساعت، که ممکن است به شکل سفت‌شدن شکم، دل‌درد یا دردی شبیه درد قاعدگی حس شود؛ کمردرد کور و مداوم؛ فشار در لگن به‌گونه‌ای که انگار جنین به پایین فشار می‌آورد؛ تغییر ترشحات واژن، نشت مایع آبکی، خون‌ریزی خفیف یا دفع سد مخی؛ و دل‌درد همراه یا بدون اسهال. گاهی این نشانه‌ها خودبه‌خود قطع می‌شوند، اما فقط معاینه می‌تواند این را مشخص کند. اگر پیش از هفته‌ی 37 هر یک از آن‌ها را دیدید، بلافاصله به پزشک یا واحد زنان تماس بگیرید و منتظر نمانید؛ اگر به کسی نرسیدید یا نشانه‌ها شدید است، مستقیم به بیمارستان بروید. کورتیکواستروئیدهای زودهنگام و دیگر درمان‌ها پیامد نوزاد را بهتر می‌کنند.',
    citation: 'ACOG Patient FAQ: Preterm Labor and Birth',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/preterm-labor-and-birth',
    redFlagRelated: true,
  },
  {
    id: 'bleeding-in-pregnancy',
    category: 'symptoms',
    topicsEn: ['bleeding', 'warning signs', 'emergency', 'causes'],
    keywordsEn: [
      'bleeding', 'spotting', 'light bleeding', 'heavy bleeding', 'first trimester', 'second trimester',
      'pain', 'placenta', 'emergency', 'clots', 'dizziness', 'urgent care',
    ],
    keywordsFa: [
      'خونریزی', 'لکه‌بینی', 'خونریزی خفیف', 'خونریزی شدید', 'سه‌ماهه اول', 'سه‌ماهه دوم',
      'درد شکم', 'جفت', 'اورژانس', 'لخته', 'سرگیجه', 'مراقبت فوری',
    ],
    titleEn: 'Bleeding in Pregnancy: When to Seek Help',
    titleFa: 'خونریزی در بارداری؛ چه زمانی باید کمک گرفت',
    bodyEn:
      'Any bleeding during pregnancy should be reported to a clinician, even if it seems light and painless. In early pregnancy, light spotting is fairly common and often has harmless causes such as implantation or irritation of the cervix, but bleeding must still be assessed because it can sometimes signal a problem such as miscarriage or an ectopic pregnancy, which needs urgent care, especially when bleeding comes with one-sided pain or feeling faint. Later in pregnancy, bleeding can be caused by conditions involving the placenta and always requires prompt evaluation, particularly with abdominal pain, contractions, or reduced fetal movement. If bleeding is heavy, like a period or more, contains clots, comes with severe pain, dizziness, or shoulder-tip pain, or if you feel generally unwell, go to the hospital or call emergency services right away.',
    bodyFa:
      'هر خونریزی در بارداری باید به پزشک گزارش شود، حتی اگر خفیف و بی‌درد به نظر برسد. در اوایل بارداری، لکه‌بینی خفیف نسبتاً شایع است و گاهی عللی بی‌خطر مانند لانه‌گزینی یا حساسیت سرویکس دارد، اما همچنان باید بررسی شود، چون گاهی نشانه‌ی مشکل مانند سقط یا بارداری خارج رحمی است که به مراقبت فوری نیاز دارد، به‌ویژه وقتی خونریزی با درد یک‌طرفه یا احساس غش همراه است. در ماه‌های بعدی بارداری، خونریزی می‌تواند ناشی از اختلالات جفت باشد و همیشه نیاز به ارزیابی سریع دارد، به‌ویژه وقتی با درد شکم، انقباضات یا کاهش حرکات جنین همراه است. اگر خونریزی شدید است، مانند قاعدگی یا بیشتر، لخته دارد، با درد شدید، سرگیجه یا درد شانه همراه است یا حالتان عمومی بد است، فوراً به بیمارستان بروید یا با اورژانس تماس بگیرید.',
    citation: 'ACOG Patient FAQ: Bleeding During Pregnancy',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/bleeding-during-pregnancy',
    redFlagRelated: true,
  },
  {
    id: 'gestational-diabetes-screening',
    category: 'screening',
    topicsEn: ['gestational diabetes', 'screening', 'glucose test', 'blood sugar'],
    keywordsEn: [
      'gestational diabetes', 'glucose screening', 'oral glucose test', '24 to 28 weeks', 'blood sugar', 'insulin resistance',
      'risk factors', 'diet', 'macrosomia', 'follow up', 'thirst', 'urination',
    ],
    keywordsFa: [
      'دیابت بارداری', 'غربالگری قند', 'تست تحمل گلوکز', '24 تا 28 هفتگی', 'قند خون', 'مقاومت به انسولین',
      'عوامل خطر', 'رژیم غذایی', 'درشت‌جنینی', 'پیگیری', 'تشنگی', 'ادرار زیاد',
    ],
    titleEn: 'Gestational Diabetes Screening',
    titleFa: 'غربالگری دیابت بارداری',
    bodyEn:
      'Gestational diabetes is high blood sugar first recognized during pregnancy, caused by pregnancy hormones reducing insulin’s effect. It usually causes no obvious symptoms, which is why screening matters. Most guidelines offer testing between 24 and 28 weeks, commonly with an oral glucose tolerance test in which you drink a standard sugar solution and have blood drawn at set intervals. You are more likely to be offered earlier or extra testing if you had gestational diabetes before, have a close relative with diabetes, had a previous large baby, or have a higher body mass index. If diagnosed, care includes a healthy eating plan, physical activity, glucose monitoring, and sometimes tablets or insulin. Good control protects both mother and baby, lowering risks of a very large baby, difficult birth, and newborn low blood sugar.',
    bodyFa:
      'دیابت بارداری یعنی بالارفتن قند خون که نخستین‌بار در بارداری شناخته می‌شود و علت آن، اثر هورمون‌های بارداری بر کاهش اثر انسولین است. این حالت معمولاً نشانه‌ی واضحی ندارد و به همین دلیل غربالگری اهمیت دارد. بیشتر راهنماها آزمایش را میان هفته‌های 24 تا 28 پیشنهاد می‌کنند، معمولاً با تست تحمل گلوکز خوراکی که در آن محلول قندی استاندارد می‌نوشید و در فواصل معین از شما آزمایش خون گرفته می‌شود. اگر پیش‌تر دیابت بارداری داشته‌اید، بستگان درجه‌یک دیابتی دارید، قبلاً نوزاد درشت به دنیا آورده‌اید یا شاخص توده‌ی بدنی بالایی دارید، احتمالاً آزمایش زودتر یا بیشتر برایتان در نظر گرفته می‌شود. در صورت تشخیص، مراقبت شامل برنامه‌ی تغذیه‌ی سالم، فعالیت بدنی، کنترل قند خون و گاه قرص یا انسولین است. کنترل خوب، هم مادر و هم نوزاد را محافظت می‌کند و خطر درشت‌بودن جنین، زایمان دشوار و قند خون پایین نوزاد را کاهش می‌دهد.',
    citation: 'ACOG Patient FAQ: Gestational Diabetes',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/gestational-diabetes',
  },
  {
    id: 'group-b-strep-screening',
    category: 'screening',
    topicsEn: ['group B strep', 'screening', 'third trimester', 'newborn protection'],
    keywordsEn: [
      'group b strep', 'streptococcus', 'gbs screening', 'swab', '35 to 37 weeks', 'antibiotics in labor',
      'newborn infection', 'colonization', 'bacteria', 'penicillin', 'risk based', 'urine',
    ],
    keywordsFa: [
      'استرپتوکوک گروه بی', 'استرپ بی', 'غربالگری', 'سواب واژن', '35 تا 37 هفتگی', 'آنتی‌بیوتیک در زایمان',
      'عفونت نوزاد', 'کلونیزاسیون', 'باکتری', 'پنی‌سیلین', 'رویه مبتنی بر خطر', 'ادرار',
    ],
    titleEn: 'Group B Strep Screening in the Third Trimester',
    titleFa: 'غربالگری استرپتوکوک گروه B در سه‌ماهه‌ی سوم',
    bodyEn:
      'Group B Streptococcus, or GBS, is a common bacterium that many healthy adults carry in the intestine or vagina without any symptoms or harm. It is not a sexually transmitted infection and usually needs no treatment when found outside of labor. The concern is that a small number of babies can pick up the bacteria during birth and develop a serious infection. Practice differs between countries: in the United States, a routine swab test is offered between 36 and 37 weeks, while other countries use a risk-based approach. If testing shows GBS, or risk factors appear, intravenous antibiotics during labor are recommended to protect the baby. If your waters break early, you have a fever in labor, or a previous baby had GBS disease, tell your care team so they can plan protection.',
    bodyFa:
      'استرپتوکوک گروه B (GBS) باکتری رایجی است که بسیاری از افراد سالم در روده یا واژن خود دارند، بدون هیچ نشانه یا آسیبی. این باکتری عفونت مقاربتی نیست و بیرون از زمان زایمان معمولاً نیاز به درمان ندارد. نگرانی آن است که شمار کمی از نوزادان در هنگام تولد این باکتری را می‌گیرند و به عفونت جدی مبتلا می‌شوند. رویه‌ی کشورها متفاوت است: در ایالات متحده آزمایش سواب روتین میان هفته‌های 36 تا 37 پیشنهاد می‌شود و در کشورهای دیگر رویه‌ی مبتنی بر عوامل خطر اجرا می‌شود. اگر آزمایش GBS مثبت شود یا عوامل خطر وجود داشته باشد، آنتی‌بیوتیک وریدی در حین زایمان برای محافظت از نوزاد توصیه می‌شود. اگر کیسه آب زود پاره شد، در حین زایمان تب دارید یا فرزند قبلی‌تان بیماری GBS داشته، به تیم درمان اطلاع دهید تا محافظت را برنامه‌ریزی کنند.',
    citation: 'ACOG Committee Opinion No. 797, Prevention of Group B Streptococcal Early-Onset Disease in Newborns; ACOG Patient FAQ: Group B Strep and Pregnancy',
    sourceUrl: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/02/prevention-of-group-b-streptococcal-early-onset-disease-in-newborns',
    year: 2020,
  },
  {
    id: 'postpartum-recovery-mental-health',
    category: 'postpartum',
    topicsEn: ['postpartum recovery', 'baby blues', 'postpartum depression', 'mental health'],
    keywordsEn: [
      'postpartum', 'fourth trimester', 'baby blues', 'postpartum depression', 'mood changes', 'crying',
      'sleep deprivation', 'crisis line', 'lochia', 'recovery', 'support', 'intrusive thoughts',
    ],
    keywordsFa: [
      'دوران پس از زایمان', 'سه‌ماهه چهارم', 'غم پس از زایمان', 'افسردگی پس از زایمان', 'تغییرات خلق', 'گریه',
      'کمبود خواب', 'خط بحران', 'خونریزی پس از زایمان', 'بهبود', 'حمایت', 'افکار مزاحم',
    ],
    titleEn: 'Postpartum Recovery: Baby Blues versus Depression',
    titleFa: 'بهبود پس از زایمان؛ غم گذرا در برابر افسردگی',
    bodyEn:
      'The first weeks after birth bring big physical and emotional changes. Lochia, a red then pinkish vaginal discharge, lasts several weeks, the uterus shrinks back, and afterpains, perineal soreness, and breastfeeding challenges are common while your body recovers. Emotionally, many women feel the baby blues: tearfulness, irritability, and mood swings that peak around days three to five and usually fade within two weeks. If low mood, hopelessness, anxiety, or feeling detached from the baby lasts longer than two weeks, interferes with daily life, or includes frightening intrusive thoughts, this may be postpartum depression or anxiety, which is common, treatable, and not a failure. Get help promptly from your clinician or a mental health professional. If you have thoughts of harming yourself or your baby, contact emergency services or a crisis line immediately; in Iran call 123, in the US call or text 988.',
    bodyFa:
      'هفته‌های نخست پس از زایمان همراه با تغییرات بزرگ جسمی و عاطفی است. خونریزی پس از زایمان (لوکیا) از قرمز به صورتی تغییر می‌کند و چند هفته ادامه دارد، رحم جمع می‌شود و درد پس از زایمان، دردناکی پرینه و چالش‌های شیردهی رایج است. بسیاری از زنان غم گذرای پس از زایمان را تجربه می‌کنند: گریه‌های بی‌دلیل، تحریک‌پذیری و نوسان خلق که حدود روزهای سه تا پنج به اوج می‌رسد و معمولاً تا دو هفته فروکش می‌کند. اگر غم، ناامیدی، اضطراب یا دوری از نوزاد بیش از دو هفته بماند، زندگی روزمره را مختل کند یا با افکار مزاحم همراه باشد، ممکن است افسردگی یا اضطراب پس از زایمان باشد؛ این حالت شایع، قابل‌درمان و نشانه‌ی ضعف نیست. به‌سرعت از پزشک یا مشاور کمک بگیرید. اگر به آسیب‌رساندن به خود یا نوزاد فکر می‌کنید، فوراً با اورژانس یا خط بحران تماس بگیرید؛ در ایران 123 و در آمریکا 988.',
    citation: 'ACOG Patient FAQ: Postpartum Depression; WHO Guide for Integration of Perinatal Mental Health (2022)',
    sourceUrl: 'https://www.acog.org/womens-health/faqs/postpartum-depression',
    redFlagRelated: true,
  },
];
