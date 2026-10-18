// NIVA Pregnancy Intelligence Platform
// Bilingual week-by-week pregnancy content (gestational weeks 4-40).
// Length values are approximate averages: crown-rump length for weeks 6-13,
// crown-heel (head-to-heel) length from week 14 onward. Weight values are
// approximate averages in grams. The UI must label all numbers "approximate".

export interface WeekContent {
  week: number;                     // 4..40 inclusive
  sizeComparisonEn: string;         // e.g. "About the size of a lime"
  sizeComparisonFa: string;
  lengthCm: number | null;          // average crown-rump (weeks 6-13) or crown-heel (14+), null only weeks 4-5
  weightG: number | null;
  highlightsEn: string;             // 2-3 sentences of fetal development that week
  highlightsFa: string;
  maternalTipsEn: string;           // 1-2 sentences of maternal care guidance
  maternalTipsFa: string;
  milestone: boolean;               // true for key scan/viability/trimester weeks
}

export const WEEKLY_CONTENT: WeekContent[] = [
  {
    week: 4,
    sizeComparisonEn: 'About the size of a poppy seed',
    sizeComparisonFa: 'حدود به اندازه‌ی یک دانه‌ی خشخاش',
    lengthCm: null,
    weightG: null,
    highlightsEn:
      'Fertilization is complete and the ball of cells is implanting in the uterus. The embryo is tiny, but the amniotic sac and placenta are beginning to form. Pregnancy hormone hCG is rising, which will soon turn a home test positive.',
    highlightsFa:
      'لقاح کامل شده و توده‌ی سلولی در حال لانه‌گزینی در رحم است. جنین بسیار کوچک است، اما کیسه‌ی آمنیوتیک و جفت در حال شکل‌گیری‌اند. هورمون بارداری hCG در حال افزایش است و به‌زودی آزمایش خانگی را مثبت نشان می‌دهد.',
    maternalTipsEn:
      'If you have not started already, begin a daily folic acid supplement and review any medicines with your clinician.',
    maternalTipsFa:
      'اگر هنوز شروع نکرده‌اید، مصرف روزانه‌ی اسید فولیک را آغاز کنید و داروهای خود را با پزشک مرور کنید.',
    milestone: false,
  },
  {
    week: 5,
    sizeComparisonEn: 'About the size of a sesame seed',
    sizeComparisonFa: 'حدود به اندازه‌ی یک دانه‌ی کنجد',
    lengthCm: null,
    weightG: null,
    highlightsEn:
      'The embryo now has three layers that will become the brain, spine, heart, and other organs. A tiny tube-like heart is starting to pulse. The neural tube is forming and will close within days.',
    highlightsFa:
      'جنین اکنون سه لایه دارد که بعدها مغز، نخاع، قلب و دیگر اندام‌ها را می‌سازند. قلب لوله‌ای کوچک شروع به ضربان کرده است. لوله‌ی عصبی در حال شکل‌گیری است و ظرف چند روز بسته می‌شود.',
    maternalTipsEn:
      'Take folic acid daily, since the neural tube closes early. An early home pregnancy test is usually reliable around now.',
    maternalTipsFa:
      'چون لوله‌ی عصبی زود بسته می‌شود، اسید فولیک را هر روز مصرف کنید. آزمایش بارداری خانگی حدود همین زمان معمولاً قابل‌اعتماد است.',
    milestone: false,
  },
  {
    week: 6,
    sizeComparisonEn: 'About the size of a lentil',
    sizeComparisonFa: 'حدود به اندازه‌ی یک عدس',
    lengthCm: 0.5,
    weightG: null,
    highlightsEn:
      'The heart now beats at a steady rhythm and can sometimes be seen on an early ultrasound. Dark spots mark where the eyes and nostrils will form. Small limb buds are beginning to sprout.',
    highlightsFa:
      'قلب اکنون با ریتم منظم می‌تپد و گاهی در سونوگرافی اولیه دیده می‌شود. نقاط تیره محل تشکیل چشم‌ها و بینی را نشان می‌دهند. جوانه‌های کوچک دست و پا شروع به روییدن کرده‌اند.',
    maternalTipsEn:
      'Nausea may be starting; eating small frequent snacks often helps. Book your first antenatal appointment if you have not yet.',
    maternalTipsFa:
      'تهوع ممکن است شروع شود؛ خوردن میان‌وعده‌های کوچک و مکرر معمولاً کمک می‌کند. اگر هنوز نکرده‌اید، نخستین نوبت مراقبت بارداری را بگیرید.',
    milestone: false,
  },
  {
    week: 7,
    sizeComparisonEn: 'About the size of a blueberry',
    sizeComparisonFa: 'حدود به اندازه‌ی یک بلوبری',
    lengthCm: 1.3,
    weightG: null,
    highlightsEn:
      'The brain is growing rapidly, with new cells forming about one hundred per minute. Arm and leg buds are lengthening, and tiny hand plates are appearing. Kidneys are moving into position and preparing to work.',
    highlightsFa:
      'مغز با سرعت زیاد در حال رشد است و هر دقیقه حدود صد سلول تازه می‌سازد. جوانه‌ی دست‌ها و پاها بلندتر شده و صفحه‌های کوچک کف دست پدیدار شده‌اند. کلیه‌ها به محل خود نزدیک می‌شوند و برای کار کردن آماده می‌گردند.',
    maternalTipsEn:
      'Morning sickness can peak soon, so keep simple snacks handy. Rest when you can, since tiredness is common in these weeks.',
    maternalTipsFa:
      'تهوع صبحگاهی به‌زودی به اوج می‌رسد؛ تنقلات ساده در دسترس داشته باشید. خستگی در این هفته‌ها طبیعی است و تا می‌توانید استراحت کنید.',
    milestone: false,
  },
  {
    week: 8,
    sizeComparisonEn: 'About the size of a raspberry',
    sizeComparisonFa: 'حدود به اندازه‌ی یک تمشک',
    lengthCm: 1.6,
    weightG: 1,
    highlightsEn:
      'Arms and legs are growing longer, with fingers and toes beginning to separate. The upper lip and nose take shape, and the small tail at the base of the spine is disappearing. All major organs have now started to form, marking the completion of early organogenesis.',
    highlightsFa:
      'دست‌ها و پاها بلندتر می‌شوند و انگشتان شروع به جدا شدن کرده‌اند. لب بالا و بینی شکل می‌گیرند و دنباله‌ی کوچک انتهای ستون فقرات در حال محو شدن است. همه‌ی اندام‌های اصلی اکنون شروع به شکل‌گیری کرده‌اند؛ این هفته نقطه‌ی عطف سازمان‌اندامی اولیه است.',
    maternalTipsEn:
      'An early ultrasound around this time often shows a heartbeat. Keep meals light if nausea is strong, and drink fluids steadily.',
    maternalTipsFa:
      'سونوگرافی اولیه در حدود این هفته معمولاً ضربان قلب را نشان می‌دهد. اگر تهوع شدید است، غذا را سبک نگه دارید و به‌تدریج مایعات بنوشید.',
    milestone: true,
  },
  {
    week: 9,
    sizeComparisonEn: 'About the size of a green olive',
    sizeComparisonFa: 'حدود به اندازه‌ی یک زیتون سبز',
    lengthCm: 2.3,
    weightG: 2,
    highlightsEn:
      'The basic body plan is complete and the embryo now looks distinctly human. Elbows can bend, and tiny earlobes are visible. Organs, muscles, and nerves are starting to work together.',
    highlightsFa:
      'طرح کلی بدن کامل شده و جنین اکنون کاملاً شبیه انسان است. آرنج‌ها می‌توانند خم شوند و لاله‌ی گوش کوچک دیده می‌شود. اندام‌ها، عضلات و اعصاب تازه شروع به همکاری کرده‌اند.',
    maternalTipsEn:
      'If nausea is hard to manage, ask about safe remedies such as vitamin B6. Gentle walking may boost energy and mood.',
    maternalTipsFa:
      'اگر تهوع دشوار است، درباره‌ی راه‌های بی‌خطر مانند ویتامین ب 6 از پزشک بپرسید. پیاده‌روی ملایم می‌تواند به انرژی و خلق‌وخو کمک کند.',
    milestone: false,
  },
  {
    week: 10,
    sizeComparisonEn: 'About the size of a kumquat',
    sizeComparisonFa: 'حدود به اندازه‌ی یک آلوی کوچک',
    lengthCm: 3.1,
    weightG: 4,
    highlightsEn:
      'Vital organs are formed and beginning to function, and the eyelids are fusing shut to protect the developing eyes. Tiny nails are appearing on fingers and toes. The stomach is producing digestive juices.',
    highlightsFa:
      'اندام‌های حیاتی شکل گرفته و شروع به کار کرده‌اند و پلک‌ها برای محافظت از چشم‌های در حال رشد به هم جوش خورده‌اند. ناخن‌های کوچک روی انگشتان دست و پا پدیدار می‌شوند. معده شروع به ترشح شیره‌ی گوارشی کرده است.',
    maternalTipsEn:
      'Prenatal vitamins can worsen nausea; taking them with food or at bedtime may help. Wear a supportive bra if breasts are tender.',
    maternalTipsFa:
      'ویتامین‌های بارداری ممکن است تهوع را بدتر کنند؛ مصرف آن‌ها همراه غذا یا نزدیک خواب کمک می‌کند. اگر سینه‌ها حساس‌اند، سینه‌بند مناسب و حمایتی بپوشید.',
    milestone: false,
  },
  {
    week: 11,
    sizeComparisonEn: 'About the size of a fig',
    sizeComparisonFa: 'حدود به اندازه‌ی یک انجیر',
    lengthCm: 4.1,
    weightG: 7,
    highlightsEn:
      'The head is still large, about half the body length, housing a rapidly growing brain. Fingers can open and close, and tooth buds are forming under the gums. The diaphragm is developing, and hiccups may begin.',
    highlightsFa:
      'سر هنوز بزرگ است و حدود نیمی از طول بدن را می‌سازد و مغز درون آن به‌سرعت رشد می‌کند. انگشتان می‌توانند باز و بسته شوند و جوانه‌ی دندان‌ها زیر لثه شکل گرفته است. دیافراگم در حال رشد است و سکسکه ممکن است آغاز شود.',
    maternalTipsEn:
      'A first-trimester screening appointment is often scheduled in the coming weeks. Continue moderate exercise such as walking or swimming.',
    maternalTipsFa:
      'نوبت غربالگری سه‌ماهه‌ی اول معمولاً در هفته‌های آینده تعیین می‌شود. ورزش متوسط مانند پیاده‌روی یا شنا را ادامه دهید.',
    milestone: false,
  },
  {
    week: 12,
    sizeComparisonEn: 'About the size of a lime',
    sizeComparisonFa: 'حدود به اندازه‌ی یک لیمو ترش',
    lengthCm: 5.4,
    weightG: 14,
    highlightsEn:
      'The baby’s reflexes are developing, with fingers curling and toes flexing when touched. Kidneys begin producing urine, and intestines that grew into the cord are moving into the abdomen. External sex organs are starting to become visible.',
    highlightsFa:
      'رفلکس‌های جنین در حال رشدند؛ با لمس، انگشتان می‌پیچند و پنجه‌ها خم می‌شوند. کلیه‌ها شروع به تولید ادرار کرده‌اند و روده‌هایی که در بند ناف رشد کرده بودند به داخل شکم بازمی‌گردند. اندام‌های تناسلی بیرونی تازه شروع به پیدا شدن کرده‌اند.',
    maternalTipsEn:
      'This is a common week for first-trimester screening or an early scan. Morning sickness often begins to ease over the next two weeks.',
    maternalTipsFa:
      'این هفته زمان رایج غربالگری سه‌ماهه‌ی اول یا سونوگرافی اولیه است. تهوع صبحگاهی معمولاً در دو هفته‌ی آینده کم‌کم فروکش می‌کند.',
    milestone: true,
  },
  {
    week: 13,
    sizeComparisonEn: 'About the size of a peapod',
    sizeComparisonFa: 'حدود به اندازه‌ی یک غلاف نخودفرنگی',
    lengthCm: 7.4,
    weightG: 23,
    highlightsEn:
      'Vocal cords are forming, and the baby’s unique fingerprints are beginning to develop. The pancreas, intestines, and gallbladder are fully formed and working. The baby can now swallow small amounts of amniotic fluid.',
    highlightsFa:
      'تارهای صوتی در حال شکل‌گیری‌اند و اثر انگشت یکتای جنین شروع به شکل گرفتن کرده است. لوزالمعده، روده و کیسه‌ی صفرا کامل شده و کار می‌کنند. جنین اکنون می‌تواند مقدار کمی مایع آمنیوتیک را ببلعد.',
    maternalTipsEn:
      'The second trimester is arriving, often the most comfortable period of pregnancy. If clothes feel snug, switch to elastic waistbands.',
    maternalTipsFa:
      'سه‌ماهه‌ی دوم در راه است؛ دوره‌ای که معمولاً راحت‌ترین بخش بارداری است. اگر لباس‌ها تنگ شده‌اند، به کمرکش کش‌دار بروید.',
    milestone: true,
  },
  {
    week: 14,
    sizeComparisonEn: 'About the size of a lemon',
    sizeComparisonFa: 'حدود به اندازه‌ی یک لیموی زرد',
    lengthCm: 12.5,
    weightG: 43,
    highlightsEn:
      'The baby’s face is becoming more expressive, with squinting, frowning, and grimacing. Fine lanugo hair is starting to cover the body for warmth. The spleen is forming, and the liver and pancreas are producing secretions.',
    highlightsFa:
      'چهره‌ی جنین ابراز حالت‌های بیشتری پیدا می‌کند؛ چشم‌بستن، اخم و قیافه‌سازی. موهای نازک لانوگو برای گرم نگه داشتن بدن شروع به رشد کرده است. طحال در حال شکل‌گیری است و کبد و لوزالمعده ترشحات خود را می‌سازند.',
    maternalTipsEn:
      'Energy often returns in the second trimester. Tell your dentist you are pregnant, as gum care matters more now.',
    maternalTipsFa:
      'انرژی معمولاً در سه‌ماهه‌ی دوم برمی‌گردد. به دندان‌پزشک بگویید باردار هستید، چون مراقبت لثه در این دوره اهمیت بیشتری دارد.',
    milestone: false,
  },
  {
    week: 15,
    sizeComparisonEn: 'About the size of an apple',
    sizeComparisonFa: 'حدود به اندازه‌ی یک سیب',
    lengthCm: 14,
    weightG: 70,
    highlightsEn:
      'The baby can sense light through closed eyelids; bright sunshine may appear as a faint glow. Legs are now longer than arms, and bones are hardening. Skin is very thin, with blood vessels visible beneath.',
    highlightsFa:
      'جنین از پشت پلک‌های بسته نور را حس می‌کند؛ آفتاب تند ممکن است به شکل هاله‌ی کم‌رنگ دیده شود. پاها اکنون از دست‌ها بلندترند و استخوان‌ها سخت‌تر می‌شوند. پوست بسیار نازک است و رگ‌های خونی از زیر آن پیدا هستند.',
    maternalTipsEn:
      'Sleep on your side with pillow support for comfort. Consider scheduling your mid-pregnancy anatomy scan.',
    maternalTipsFa:
      'برای راحتی، به پهلو بخوابید و از بالش حمایت بگیرید. نوبت سونوگرافی آناتومی میانه‌ی بارداری را برنامه‌ریزی کنید.',
    milestone: false,
  },
  {
    week: 16,
    sizeComparisonEn: 'About the size of an avocado',
    sizeComparisonFa: 'حدود به اندازه‌ی یک آووکادو',
    lengthCm: 16,
    weightG: 100,
    highlightsEn:
      'The heart now pumps large amounts of blood each day, and tiny bones are hardening on ultrasound. Facial muscles allow a range of expressions, and the eyes are slowly moving toward the front of the face. The first movements, called quickening, may be felt soon.',
    highlightsFa:
      'قلب هر روز خون زیادی پمپ می‌کند و استخوان‌های کوچک در سونوگرافی سخت‌تر دیده می‌شوند. عضلات صورت طیفی از حالت‌ها را نشان می‌دهند و چشم‌ها به‌تدریج به جلوی صورت نزدیک می‌شوند. نخستین حرکات جنین به‌زودی حس می‌شود.',
    maternalTipsEn:
      'Many women feel the first flutters between 16 and 22 weeks. Continue regular moderate activity and balanced meals.',
    maternalTipsFa:
      'بسیاری از زنان نخستین بال‌بال‌زدن‌ها را میان هفته‌های 16 تا 22 حس می‌کنند. فعالیت متوسط منظم و وعده‌های متعادل را ادامه دهید.',
    milestone: false,
  },
  {
    week: 17,
    sizeComparisonEn: 'About the size of a turnip',
    sizeComparisonFa: 'حدود به اندازه‌ی یک شلغم',
    lengthCm: 18,
    weightG: 140,
    highlightsEn:
      'Cartilage is turning into bone, and the umbilical cord is growing thicker and stronger. Brown fat is forming under the skin to keep the baby warm after birth. The baby practices sucking and swallowing.',
    highlightsFa:
      'غضروف‌ها در حال تبدیل شدن به استخوان‌اند و بند ناف ضخیم‌تر و قوی‌تر می‌شود. چربی قهوه‌ای زیر پوست شکل می‌گیرد تا جنین پس از تولد گرم بماند. جنین مکیدن و بلعیدن را تمرین می‌کند.',
    maternalTipsEn:
      'Backaches may begin as posture shifts; keep lifting gentle. A supportive chair and cushion can ease strain.',
    maternalTipsFa:
      'با تغییر وضعیت بدن، کمردرد ممکن است شروع شود؛ اجسام را سبک بلند کنید. صندلی و بالش حمایت‌کننده فشار را کم می‌کند.',
    milestone: false,
  },
  {
    week: 18,
    sizeComparisonEn: 'About the size of a bell pepper',
    sizeComparisonFa: 'حدود به اندازه‌ی یک فلفل دلمه‌ای',
    lengthCm: 20,
    weightG: 190,
    highlightsEn:
      'The ears are in their final position, and the baby may begin to hear sounds such as your heartbeat and voice. Myelin, a protective covering, is starting to form around nerves. Fingers and toes now have distinct prints.',
    highlightsFa:
      'گوش‌ها به جایگاه نهایی خود رسیده‌اند و جنین شروع به شنیدن صداهایی مانند ضربان قلب و صدای شما می‌کند. پوشش محافظ میلین دور اعصاب در حال تشکیل است. انگشتان دست و پا اکنون اثر انگشت مشخص دارند.',
    maternalTipsEn:
      'A mid-pregnancy ultrasound often happens between 18 and 22 weeks. Talking and reading to your baby is a lovely habit to start.',
    maternalTipsFa:
      'سونوگرافی میانه‌ی بارداری معمولاً میان هفته‌های 18 تا 22 انجام می‌شود. صحبت‌کردن و کتاب‌خوانی برای جنین عادت خوبی برای شروع است.',
    milestone: false,
  },
  {
    week: 19,
    sizeComparisonEn: 'About the size of an heirloom tomato',
    sizeComparisonFa: 'حدود به اندازه‌ی یک گوجه‌فرنگی درشت',
    lengthCm: 22.5,
    weightG: 240,
    highlightsEn:
      'The brain is dividing into specialized regions for smell, taste, hearing, and vision. Skin is coated with vernix, a waxy protective layer. Kidneys continue making urine that becomes part of the amniotic fluid.',
    highlightsFa:
      'مغز در حال تقسیم به نواحی تخصصی برای بویایی، چشایی، شنوایی و بینایی است. پوست با ماده‌ی مومی محافظی به نام ورنیکس پوشیده شده است. کلیه‌ها ادرار می‌سازند که بخشی از مایع آمنیوتیک می‌شود.',
    maternalTipsEn:
      'Sleeping may feel awkward; side-lying with pillows helps. Watch for round ligament twinges with sudden movements.',
    maternalTipsFa:
      'خوابیدن شاید دشوار شده باشد؛ خوابیدن به پهلو با بالش کمک می‌کند. با حرکات ناگهانی، درد کوتاه رباط‌های گرد رحم طبیعی است اما باید ملایم باشید.',
    milestone: false,
  },
  {
    week: 20,
    sizeComparisonEn: 'About the size of a banana',
    sizeComparisonFa: 'حدود به اندازه‌ی یک موز',
    lengthCm: 25,
    weightG: 300,
    highlightsEn:
      'The halfway point has arrived. The baby swallows more amniotic fluid and practices breathing movements with the lungs. Meconium, the first stool, is gathering in the bowel, and hair may be growing on the scalp.',
    highlightsFa:
      'به نیمه‌ی راه رسیده‌اید. جنین مایع آمنیوتیک بیشتری می‌بلعد و با ریه‌ها حرکات تنفس را تمرین می‌کند. مدفوع نخستین (مکونیوم) در روده جمع می‌شود و احتمالاً مویی روی سر رشد کرده است.',
    maternalTipsEn:
      'The anatomy scan usually occurs around this week. Ask your clinician about screening results and any next steps.',
    maternalTipsFa:
      'سونوگرافی آناتومی معمولاً همین حوالی انجام می‌شود. درباره‌ی نتایج غربالگری و ادامه‌ی مسیر با پزشک خود صحبت کنید.',
    milestone: true,
  },
  {
    week: 21,
    sizeComparisonEn: 'About the size of a carrot',
    sizeComparisonFa: 'حدود به اندازه‌ی یک هویج',
    lengthCm: 26.5,
    weightG: 360,
    highlightsEn:
      'Movements are becoming stronger and more coordinated, and you may feel hiccups as gentle rhythmic taps. The digestive system is maturing enough to absorb small amounts of sugar from swallowed fluid. Eyebrows and eyelids are fully formed.',
    highlightsFa:
      'حرکات قوی‌تر و هماهنگ‌تر می‌شوند و سکسکه را به شکل ضربه‌های ریتمیک ملایم حس می‌کنید. دستگاه گوارش به اندازه‌ای رسیده که مقدار کمی قند از مایع بلعیده‌شده جذب کند. ابروها و پلک‌ها کاملاً شکل گرفته‌اند.',
    maternalTipsEn:
      'Vivid dreams and round ligament aches are common now. Keep calcium and iron intake on target through food.',
    maternalTipsFa:
      'رویاهای واضح و دردهای رباط‌های گرد شایع‌اند. دریافت کلسیم و آهن را از راه غذا در حد هدف نگه دارید.',
    milestone: false,
  },
  {
    week: 22,
    sizeComparisonEn: 'About the size of a papaya',
    sizeComparisonFa: 'حدود به اندازه‌ی یک پاپایا',
    lengthCm: 28,
    weightG: 430,
    highlightsEn:
      'The baby’s grip is developing and the sense of touch is sharpening, with exploration of the face and umbilical cord. Lips and eyebrows are more distinct. The inner ear is nearly complete, improving balance.',
    highlightsFa:
      'توانایی گرفتن اجسام در حال رشد است و حس لامسه تیزتر می‌شود؛ جنین صورت و بند ناف خود را لمس می‌کند. لب‌ها و ابروها مشخص‌تر شده‌اند. گوش داخلی تقریباً کامل است و تعادل بهتر می‌شود.',
    maternalTipsEn:
      'Skin may feel stretched and itchy; gentle moisturizing helps. Keep up iron-rich foods and schedule your glucose screening.',
    maternalTipsFa:
      'پوست ممکن است کشیده و خارش‌دار شود؛ مرطوب‌کننده‌ی ملایم کمک می‌کند. غذاهای آهندار را جدی بگیرید و نوبت آزمایش قند را بگذارید.',
    milestone: false,
  },
  {
    week: 23,
    sizeComparisonEn: 'About the size of a large mango',
    sizeComparisonFa: 'حدود به اندازه‌ی یک انبه‌ی بزرگ',
    lengthCm: 29.5,
    weightG: 500,
    highlightsEn:
      'The baby can now hear sounds from outside the womb, including voices, and may respond to loud noises with movement. Lungs are developing surfactant, the substance that will keep air sacs open. Skin remains loose and translucent.',
    highlightsFa:
      'جنین صداهای بیرون رحم، از جمله صداها را می‌شنود و ممکن است به صداهای بلند با حرکت پاسخ دهد. ریه‌ها در حال ساختن سورفکتانت‌اند، ماده‌ای که کیسه‌های هوایی را باز نگه می‌دارد. پوست هنوز شل و نیمه‌شفاف است.',
    maternalTipsEn:
      'As hearing develops, talking to your baby is soothing for both of you. If contractions or fluid leaking occur, call your clinician.',
    maternalTipsFa:
      'با رشد شنوایی، صحبت‌کردن با جنین برای هر دوی شما آرامش‌بخش است. اگر انقباض یا نشت مایع دیدید، فوراً به پزشک اطلاع دهید.',
    milestone: false,
  },
  {
    week: 24,
    sizeComparisonEn: 'About the size of an ear of corn',
    sizeComparisonFa: 'حدود به اندازه‌ی یک بلال',
    lengthCm: 31,
    weightG: 600,
    highlightsEn:
      'The baby has reached an important threshold; with intensive neonatal care, survival is now possible, though risks remain high. Lungs are developing rapidly, and taste buds are functioning. Facial features are fully formed.',
    highlightsFa:
      'جنین به آستانه‌ی مهمی رسیده است؛ با مراقبت ویژه‌ی نوزادان، بقای او اکنون ممکن است، هرچند خطرات هنوز زیاد است. ریه‌ها به‌سرعت رشد می‌کنند و چشایی کار می‌کند. اجزای صورت کاملاً شکل گرفته‌اند.',
    maternalTipsEn:
      'This is a key week for learning warning signs such as fluid leaking or regular cramps. Many programs schedule glucose screening now.',
    maternalTipsFa:
      'این هفته زمان خوبی برای یادگیری نشانه‌های هشدار مانند نشت مایع یا دل‌درد منظم است. غربالگری قند معمولاً همین حوالی برنامه‌ریزی می‌شود.',
    milestone: true,
  },
  {
    week: 25,
    sizeComparisonEn: 'About the size of a large zucchini',
    sizeComparisonFa: 'حدود به اندازه‌ی یک کدو سبز بزرگ',
    lengthCm: 32.5,
    weightG: 660,
    highlightsEn:
      'Hair color and texture are becoming visible on the scalp. The baby responds to your touch on the belly with movement. Capillaries are forming in the lungs, and nostrils are beginning to open.',
    highlightsFa:
      'رنگ و جنس موی سر کم‌کم پیدا می‌شود. جنین به لمس شکم با حرکت پاسخ می‌دهد. مویرگ‌ها در ریه‌ها شکل می‌گیرند و سوراخ‌های بینی شروع به باز شدن کرده‌اند.',
    maternalTipsEn:
      'Heartburn can flare; eat smaller meals and avoid lying down after eating. Continue gentle exercise for comfort.',
    maternalTipsFa:
      'سوزش سردل ممکن است تشدید شود؛ وعده‌های کوچک بخورید و بلافاصله پس از غذا دراز نکشید. ورزش ملایم را برای راحتی ادامه دهید.',
    milestone: false,
  },
  {
    week: 26,
    sizeComparisonEn: 'About the size of a bunch of scallions',
    sizeComparisonFa: 'حدود به اندازه‌ی یک دسته پیازچه',
    lengthCm: 34,
    weightG: 760,
    highlightsEn:
      'The baby’s eyes begin to open and blink, and eyelashes have grown in. Brain-wave activity for hearing and sight resembles a newborn’s. The immune system is starting to develop its own defenses.',
    highlightsFa:
      'چشم‌ها شروع به باز شدن و پلک زدن می‌کنند و مژه‌ها در آمده‌اند. فعالیت مغزی مرتبط با شنوایی و بینایی به نوزاد شبیه است. دستگاه ایمنی تازه شروع به ساختن دفاع‌های خود کرده است.',
    maternalTipsEn:
      'Braxton Hicks tightenings may appear; resting and hydration usually settle them. Plan your glucose screening if not yet done.',
    maternalTipsFa:
      'انقباضات کاذب براکستون هیکس ممکن است شروع شود؛ استراحت و آب کافی معمولاً آن‌ها را آرام می‌کند. اگر غربالگری قند را انجام نداده‌اید، برنامه‌ریزی کنید.',
    milestone: false,
  },
  {
    week: 27,
    sizeComparisonEn: 'About the size of a cauliflower',
    sizeComparisonFa: 'حدود به اندازه‌ی یک گل‌کلم',
    lengthCm: 35,
    weightG: 875,
    highlightsEn:
      'The baby may hiccup frequently now, and lungs continue to mature toward breathing air. Sleep-wake cycles are more predictable, and the brain is very active. Skin is gradually becoming less wrinkled as fat accumulates.',
    highlightsFa:
      'سکسکه‌ی جنین اکنون بیشتر حس می‌شود و ریه‌ها برای تنفس با هوا به بلوغ ادامه می‌دهند. چرخه‌های خواب و بیداری منظم‌تر شده و مغز بسیار فعال است. با تجمع چربی، پوست کم‌کم چین‌وچروک کمتری پیدا می‌کند.',
    maternalTipsEn:
      'This is the final week of the second trimester. Discuss your third-trimester visit schedule and vaccination plans.',
    maternalTipsFa:
      'این آخرین هفته‌ی سه‌ماهه‌ی دوم است. برنامه‌ی ویزیت‌های سه‌ماهه‌ی سوم و واکسیناسیون را با پزشک بررسی کنید.',
    milestone: false,
  },
  {
    week: 28,
    sizeComparisonEn: 'About the size of an eggplant',
    sizeComparisonFa: 'حدود به اندازه‌ی یک بادمجان',
    lengthCm: 36,
    weightG: 1000,
    highlightsEn:
      'The third trimester begins. Eyes can now open and close and perceive light through the wall of the uterus, and REM sleep patterns appear. The baby is filling out with fat, and bone marrow is producing red blood cells.',
    highlightsFa:
      'سه‌ماهه‌ی سوم آغاز می‌شود. چشم‌ها اکنون باز و بسته می‌شوند و از دیواره‌ی رحم نور را می‌بینند و الگوهای خواب REM پدیدار شده‌اند. جنین با ذخیره‌ی چربی پُرتر می‌شود و مغز استخوان گلبول‌های قرمز می‌سازد.',
    maternalTipsEn:
      'Side sleeping matters from this week onward. Glucose screening for gestational diabetes typically happens now.',
    maternalTipsFa:
      'از این هفته به بعد، خوابیدن به پهلو اهمیت دارد. غربالگری دیابت بارداری معمولاً همین زمان انجام می‌شود.',
    milestone: true,
  },
  {
    week: 29,
    sizeComparisonEn: 'About the size of a butternut squash',
    sizeComparisonFa: 'حدود به اندازه‌ی یک کدو حلوایی',
    lengthCm: 37.5,
    weightG: 1150,
    highlightsEn:
      'Muscles and lungs continue to mature, and the head is growing to accommodate the developing brain. The baby kicks and stretches vigorously, and movements feel strong. Calcium needs rise as bones harden further.',
    highlightsFa:
      'عضلات و ریه‌ها به بلوغ ادامه می‌دهند و سر برای جای دادن مغز در حال رشد بزرگ‌تر می‌شود. جنین با قدرت لگد می‌زند و کش می‌آید و حرکات قوی حس می‌شوند. با سخت‌تر شدن استخوان‌ها، نیاز به کلسیم بیشتر می‌شود.',
    maternalTipsEn:
      'Keep up calcium and iron-rich foods. Report any reduction in fetal movement the same day.',
    maternalTipsFa:
      'غذاهای حاوی کلسیم و آهن را ادامه دهید. هر کاهشی در حرکات جنین را همان روز گزارش کنید.',
    milestone: false,
  },
  {
    week: 30,
    sizeComparisonEn: 'About the size of a large cabbage',
    sizeComparisonFa: 'حدود به اندازه‌ی یک کلم پیچ بزرگ',
    lengthCm: 39,
    weightG: 1300,
    highlightsEn:
      'The brain is developing rapidly, with deep grooves forming on its surface. Eyes can track light, and the baby practices gripping. Red blood cell production in bone marrow is now fully established.',
    highlightsFa:
      'مغز با سرعت زیاد رشد می‌کند و شیارهای عمیق روی سطح آن شکل می‌گیرد. چشم‌ها نور را دنبال می‌کنند و جنین گرفتن را تمرین می‌کند. تولید گلبول‌های قرمز در مغز استخوان به‌طور کامل برقرار شده است.',
    maternalTipsEn:
      'Fatigue may return as your body carries more weight. Rest with feet elevated and watch for swelling in your face or hands.',
    maternalTipsFa:
      'خستگی با سنگین‌تر شدن وزن ممکن است برگردد. با پاهای بالا استراحت کنید و تورم صورت یا دست‌ها را زیر نظر داشته باشید.',
    milestone: false,
  },
  {
    week: 31,
    sizeComparisonEn: 'About the size of a coconut',
    sizeComparisonFa: 'حدود به اندازه‌ی یک نارگیل',
    lengthCm: 40.5,
    weightG: 1450,
    highlightsEn:
      'All five senses are working, and the baby reacts to familiar voices. Weight gain accelerates as fat layers build beneath the skin. The digestive tract is nearly complete, though the baby will receive nutrients through the cord until birth.',
    highlightsFa:
      'هر پنج حس کار می‌کنند و جنین به صداهای آشنا واکنش نشان می‌دهد. با ساخته‌شدن لایه‌های چربی زیر پوست، وزن‌گیری سرعت می‌گیرد. لوله‌ی گوارش تقریباً کامل است، اما تا زمان تولد تغذیه از راه بند ناف ادامه دارد.',
    maternalTipsEn:
      'Braxton Hicks may be more noticeable; hydration helps. Pack a hospital bag over the coming weeks.',
    maternalTipsFa:
      'انقباضات کاذب محسوس‌تر می‌شوند؛ آب کافی کمک می‌کند. در هفته‌های آینده کیف بیمارستان را آماده کنید.',
    milestone: false,
  },
  {
    week: 32,
    sizeComparisonEn: 'About the size of a pineapple',
    sizeComparisonFa: 'حدود به اندازه‌ی یک آناناس',
    lengthCm: 42,
    weightG: 1700,
    highlightsEn:
      'The baby practices breathing movements regularly and may settle into a head-down position soon. Toenails are complete, and skin is smoothing out. Most of the weight gain from here on is fat and brain growth.',
    highlightsFa:
      'جنین به‌طور منظم حرکات تنفس را تمرین می‌کند و به‌زودی ممکن است سر به پایین قرار گیرد. ناخن‌های پا کامل شده و پوست صاف‌تر می‌شود. از این پس، بخش عمده‌ی افزایش وزن صرف چربی و رشد مغز می‌شود.',
    maternalTipsEn:
      'A growth scan is often done around this time. Report any bleeding, fluid leakage, or regular tightenings immediately.',
    maternalTipsFa:
      'سونوگرافی ارزیابی رشد معمولاً همین حوالی انجام می‌شود. هر خونریزی، نشت مایع یا سفت‌شدن‌های منظم را فوراً گزارش کنید.',
    milestone: false,
  },
  {
    week: 33,
    sizeComparisonEn: 'About the size of a cantaloupe',
    sizeComparisonFa: 'حدود به اندازه‌ی یک طالبی',
    lengthCm: 43.5,
    weightG: 1900,
    highlightsEn:
      'The skull remains flexible with soft spots, allowing molding during birth. The baby’s immune system is borrowing your antibodies, a process that continues after birth. Movements may feel more like rolls and stretches.',
    highlightsFa:
      'جمجمه با ملاج‌های نرم انعطاف‌پذیر مانده تا هنگام زایمان شکل‌پذیر باشد. دستگاه ایمنی جنین آنتی‌بادی‌های شما را دریافت می‌کند، فرایندی که پس از تولد نیز ادامه دارد. حرکات بیشتر شبیه چرخش و کش‌آمدن است.',
    maternalTipsEn:
      'Discuss your birth preferences and plan any remaining travel early. Learn and count your baby’s movement pattern daily.',
    maternalTipsFa:
      'درباره‌ی ترجیحات زایمان صحبت کنید و سفرهای باقی‌مانده را زودتر انجام دهید. هر روز الگوی حرکات جنین را بشناسید و بشمارید.',
    milestone: false,
  },
  {
    week: 34,
    sizeComparisonEn: 'About the size of a honeydew melon',
    sizeComparisonFa: 'حدود به اندازه‌ی یک خربزه',
    lengthCm: 44.5,
    weightG: 2100,
    highlightsEn:
      'The central nervous system and lungs are maturing steadily, and fingernails now reach the fingertips. The baby blinks and reacts to light. Vernix and lanugo are mostly absorbing into the amniotic fluid.',
    highlightsFa:
      'دستگاه عصبی مرکزی و ریه‌ها پیوسته بالغ می‌شوند و ناخن‌های دست اکنون به نوک انگشتان رسیده‌اند. جنین پلک می‌زند و به نور واکنش نشان می‌دهد. ورنیکس و لانوگو بیشتر جذب مایع آمنیوتیک شده‌اند.',
    maternalTipsEn:
      'Plan your route to the hospital and review warning signs with your clinician. Rest between activities as energy dips.',
    maternalTipsFa:
      'مسیر رفت‌وآمد به بیمارستان را برنامه‌ریزی کنید و نشانه‌های هشدار را با پزشک مرور کنید. بین کارها استراحت کنید، چون انرژی نوسان دارد.',
    milestone: false,
  },
  {
    week: 35,
    sizeComparisonEn: 'About the size of a large honeydew melon',
    sizeComparisonFa: 'حدود به اندازه‌ی یک خربزه‌ی بزرگ',
    lengthCm: 45.5,
    weightG: 2400,
    highlightsEn:
      'Fat continues to accumulate, smoothing the skin and preparing the baby to regulate temperature. The brain and skull are growing quickly. Most babies now turn head-down as space tightens.',
    highlightsFa:
      'تجمع چربی ادامه دارد، پوست را صاف می‌کند و جنین را برای تنظیم دمای بدن آماده می‌سازد. مغز و جمجمه به‌سرعت رشد می‌کنند. بیشتر جنین‌ها با تنگ‌شدن جا سر به پایین می‌چرخند.',
    maternalTipsEn:
      'Urinary frequency and pelvic pressure may increase. Review the signs of preterm labor one more time with your clinician.',
    maternalTipsFa:
      'تعداد دفعات ادرار و فشار لگن ممکن است بیشتر شود. نشانه‌های زایمان زودرس را یک بار دیگر با پزشک مرور کنید.',
    milestone: false,
  },
  {
    week: 36,
    sizeComparisonEn: 'About the size of a head of romaine lettuce',
    sizeComparisonFa: 'حدود به اندازه‌ی یک کاهوی رومی',
    lengthCm: 47,
    weightG: 2700,
    highlightsEn:
      'The baby is gaining about 30 grams daily, and sucking muscles are fully developed for feeding. Gums are firm, and lanugo is nearly gone. Space is crowded, so movements feel more like shifts and pushes.',
    highlightsFa:
      'جنین روزانه حدود سی گرم وزن می‌گیرد و عضلات مکیدن برای تغذیه کاملاً آماده‌اند. لثه‌ها سفت شده و لانوگو تقریباً از بین رفته است. جا تنگ است و حرکات بیشتر شبیه جابه‌جایی و هل‌دادن حس می‌شود.',
    maternalTipsEn:
      'Weekly antenatal visits usually begin around now. Group B strep testing often occurs this week or next, depending on local practice.',
    maternalTipsFa:
      'ویزیت‌های هفتگی مراقبت معمولاً از همین حالا شروع می‌شود. آزمایش استرپتوکوک گروه B بسته به رویه‌ی محلی همین هفته یا هفته‌ی بعد انجام می‌شود.',
    milestone: true,
  },
  {
    week: 37,
    sizeComparisonEn: 'About the size of a bunch of Swiss chard',
    sizeComparisonFa: 'حدود به اندازه‌ی یک دسته چغندر برگی',
    lengthCm: 48,
    weightG: 2900,
    highlightsEn:
      'The baby has reached early term; organs are ready to function outside the womb. Fat is still being laid down, and the grip is firm. The head may be engaged in the pelvis in preparation for birth.',
    highlightsFa:
      'جنین به مرحله‌ی ترم زودرس رسیده است؛ اندام‌ها برای کار کردن بیرون رحم آماده‌اند. چربی‌اندوزی ادامه دارد و توانایی گرفتن محکم است. سر ممکن است در لگن جا خوش کرده باشد تا برای زایمان آماده شود.',
    maternalTipsEn:
      'Labor can begin any time now, so keep your phone charged and your bag ready. Call your clinician for regular contractions, fluid leakage, or bleeding.',
    maternalTipsFa:
      'از این پس هر زمان ممکن است زایمان آغاز شود؛ گوشی را شارژ نگه دارید و کیف آماده باشد. برای انقباضات منظم، نشت مایع یا خونریزی با پزشک تماس بگیرید.',
    milestone: true,
  },
  {
    week: 38,
    sizeComparisonEn: 'About the size of a leek',
    sizeComparisonFa: 'حدود به اندازه‌ی یک تره‌ی بزرگ',
    lengthCm: 49,
    weightG: 3050,
    highlightsEn:
      'The lungs and brain continue final maturation even at term. Vernix is mostly gone, and toenails reach the tips of toes. The baby practices breathing, sucking, and swallowing in preparation for life outside.',
    highlightsFa:
      'حتی در هفته‌ی ترم، ریه‌ها و مغز در حال تکمیل پایانی رشدند. ورنیکس تقریباً پاک شده و ناخن‌های پا به نوک انگشتان رسیده‌اند. جنین تنفس، مکیدن و بلعیدن را برای زندگی بیرون رحم تمرین می‌کند.',
    maternalTipsEn:
      'Waiting can be uncomfortable; rest, hydrate, and keep gentle movement. Review the timing rules for going to the hospital.',
    maternalTipsFa:
      'انتظار کشیدن می‌تواند دشوار باشد؛ استراحت کنید، آب بنوشید و حرکت ملایم داشته باشید. قواعد مراجعه به بیمارستان را یک بار با پزشک مرور کنید.',
    milestone: false,
  },
  {
    week: 39,
    sizeComparisonEn: 'About the size of a mini watermelon',
    sizeComparisonFa: 'حدود به اندازه‌ی یک هندوانه‌ی کوچک',
    lengthCm: 49.5,
    weightG: 3250,
    highlightsEn:
      'The baby is now considered full term. The chest becomes more prominent, and the brain continues developing rapidly, reaching about a quarter of adult size. Fat provides warmth and energy reserves for the first days.',
    highlightsFa:
      'جنین اکنون تمام‌ترم به شمار می‌رود. قفسه‌ی سینه برجسته‌تر شده و مغز با سرعت ادامه‌ی رشد می‌دهد و به حدود یک‌چهارم اندازه‌ی مغز بزرگسال می‌رسد. چربی‌ها گرما و ذخیره‌ی انرژی روزهای نخست را فراهم می‌کنند.',
    maternalTipsEn:
      'Watch for the classic labor signs: regular contractions, waters breaking, and bloody show. Keep kick counting until delivery.',
    maternalTipsFa:
      'نشانه‌های کلاسیک زایمان را زیر نظر داشته باشید: انقباضات منظم، پاره شدن کیسه آب و لکه‌ای خونی. شمارش حرکات را تا زمان زایمان ادامه دهید.',
    milestone: true,
  },
  {
    week: 40,
    sizeComparisonEn: 'About the size of a small watermelon',
    sizeComparisonFa: 'حدود به اندازه‌ی یک هندوانه‌ی متوسط',
    lengthCm: 50,
    weightG: 3400,
    highlightsEn:
      'This is the estimated due date, though only a minority of babies arrive exactly on time. The baby is curled comfortably, organs are mature, and the head is usually low in the pelvis. The placenta continues supplying antibodies until birth.',
    highlightsFa:
      'این تاریخ تخمینی زایمان است، اگرچه تنها بخش کوچکی از نوزادان دقیقاً در همین روز به دنیا می‌آیند. جنین جمع‌شده و راحت است، اندام‌ها بالغ‌اند و سر معمولاً پایین در لگن قرار دارد. جفت تا لحظه‌ی زایمان آنتی‌بادی‌ها را تأمین می‌کند.',
    maternalTipsEn:
      'Contact your clinician if contractions become regular and painful, your waters break, movements decrease, or bleeding occurs. If the due date passes, monitoring plans will usually be discussed.',
    maternalTipsFa:
      'اگر انقباضات منظم و دردناک شدند، کیسه آب پاره شد، حرکات جنین کم شد یا خونریزی دیدید، با پزشک تماس بگیرید. اگر از موعد گذشت، معمولاً برنامه‌ی پایش تعیین می‌شود.',
    milestone: true,
  },
];
