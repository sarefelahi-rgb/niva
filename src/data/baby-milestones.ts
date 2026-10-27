// NIVA Pregnancy Intelligence Platform — Postpartum «Baby's First Year» companion
// Bilingual month-by-month baby development dataset (months 0–12, newborn to first birthday).
// داده‌ی دوزبانه‌ی رشد ماه‌به‌ماه کودک (ماه صفر تا دوازدهم) برای ویژگی «سال اول کودک».
// Educational content only — typical ranges: every baby develops at their own pace; consult your pediatrician.
// صرفاً محتوای آموزشی — بازه‌های معمول: هر نوزاد ریتم رشد خودش را دارد؛ برای هر نگرانی با پزشک کودک مشورت کنید.

export interface BabyMilestone {
  id: string; // stable kebab-case id, unique across the whole dataset
  fa: string; // Persian milestone description
  en: string; // English milestone description
}

export interface BabyMonthContent {
  month: number; // 0..12 (0 = newborn first days/weeks)
  titleFa: string;
  titleEn: string;
  tipFa: string; // 1–3 sentences of key care/development/feeding guidance
  tipEn: string;
  milestones: BabyMilestone[]; // 4–6 typical achievements by the END of this month
}

export const BABY_MILESTONES: BabyMonthContent[] = [
  {
    month: 0,
    titleFa: 'ماه صفر — نوزاد',
    titleEn: 'Month 0 — Newborn',
    tipFa: 'در این روزها آغوز — شیر غلیظ طلایی‌رنگ اول — همه‌ی نیاز نوزادت است: هر وقت نشانه‌ی گرسنگی داد شیرش بده، معمولاً روزی ۸ تا ۱۲ نوبت، و روزی ۵ تا ۶ پوشک خیس نشانه‌ی خوبی است که شیرش کافی است. نافش را تمیز و خشک نگه دار تا خودش بیفتد، همیشه به پشت و روی سطح سفت و صاف در اتاق خودت بخوابانش (هم‌اتاقی بله، تختِ مشترک نه) و قطره‌ی ویتامین D روزانه را طبق نظر پزشک فراموش نکن. زردی پوست و سفیدی چشم‌ها را زیر نظر بگیر و یادت باشد: تب ۳۸ درجه یا بالاتر در نوزاد زیر سه ماه همیشه اورژانس است — فوراً به پزشک برس.',
    tipEn: 'In these first days colostrum — the thick, golden first milk — is all your baby needs: feed on demand, usually 8–12 times in 24 hours, and count 5–6 wet diapers a day as the reassuring sign that intake is enough. Keep the umbilical stump clean and dry until it falls off, lay your baby on the back on a firm, flat surface in your room (room-sharing yes, bed-sharing no), and give the daily vitamin D drops your pediatrician recommends. Watch for yellowing of the skin or eyes, and remember: a temperature of 38°C or higher in a baby under 3 months is always an emergency — see a doctor immediately.',
    milestones: [
      {
        id: 'calms-to-voice',
        fa: 'با صدای آرام و آغوش گرم آرام می‌گیرد',
        en: 'Calms when spoken to or held close',
      },
      {
        id: 'focuses-on-faces',
        fa: 'به چهره‌ها خیره می‌شود',
        en: 'Studies faces intently',
      },
      {
        id: 'startles-to-sounds',
        fa: 'به صداها جاخوف می‌خورد یا آرام می‌گیرد',
        en: 'Startles at sounds and quiets to a soft voice',
      },
      {
        id: 'moves-arms-legs',
        fa: 'دست‌ها و پاهایش را آزادانه تکان می‌دهد',
        en: 'Moves both arms and both legs',
      },
      {
        id: 'grasps-finger',
        fa: 'انگشت تو را در کف دستش محکم می‌فشارد',
        en: 'Grasps a finger placed in the palm',
      },
      {
        id: 'lifts-head-briefly',
        fa: 'روی شکم، سرش را لحظه‌ای بالا نگه می‌دارد',
        en: 'Briefly lifts head during tummy time',
      },
    ],
  },
  {
    month: 1,
    titleFa: 'ماه اول',
    titleEn: 'Month 1',
    tipFa: 'بی‌ساعت‌شمار و به‌اندازه‌ی تقاضایش شیر بده: در روزهای جهش رشد، شیرخوردن‌ها پشت‌سرهم می‌شود و همین است که شیرت را به‌اندازه‌ی نیازش زیاد می‌کند. روزی چند نوبت کوتاه تمرین روی شکم، بهترین ورزش برای گردنی است که هنوز می‌لرزد. خوابش هنوز شب‌روز قاطی است و اولین ویزیت نوزاد فرصت خوبی است برای هر سؤالی که در دلت داری؛ معاینه‌های دوره‌ای و واکسن‌ها را طبق برنامه‌ی کشور خودتان با پزشک پیگیری کن.',
    tipEn: 'Feed on demand without watching the clock: growth spurts bring days of near-constant nursing, and that is exactly how your milk supply rises to match. A few short tummy-time sessions every day are the best workout for those wobbly neck muscles. Sleep is still scattered around the clock, and the first well-baby visit is the perfect time to ask your pediatrician everything on your mind — routine checkups and vaccines follow your country’s schedule.',
    milestones: [
      {
        id: 'lifts-head-tummy-time',
        fa: 'روی شکم، سرش را بالا می‌آورد',
        en: 'Lifts head during tummy time',
      },
      {
        id: 'follows-moving-objects',
        fa: 'شیء در حال حرکت را با چشم دنبال می‌کند',
        en: 'Watches and follows a moving object',
      },
      {
        id: 'makes-eye-contact',
        fa: 'چند ثانیه به چشم‌هایت نگاه می‌کند',
        en: 'Holds eye contact for a few seconds',
      },
      {
        id: 'rhythmic-strong-suck',
        fa: 'با مکیدن قوی و منظم شیر می‌خورد',
        en: 'Feeds with a strong, rhythmic suck',
      },
      {
        id: 'settles-familiar-voice',
        fa: 'با شنیدن صدای آشنا آرام می‌شود',
        en: 'Settles at the sound of a familiar voice',
      },
    ],
  },
  {
    month: 2,
    titleFa: 'ماه دوم',
    titleEn: 'Month 2',
    tipFa: 'چهره‌ی تو بهترین اسباب‌بازی خانه است؛ با او حرف بزن، آواز بخوان و صداهای خنده‌دار دربیاور تا با قُرقُر جوابت را بدهد. تمرین روی شکم را هر روز کمی طولانی‌تر کن و فعلاً به خواب‌های کوتاه و پرقطع عادت کن؛ بیدار شدن‌های شب در این سن کاملاً طبیعی است. شیر مادر یا شیرخشک هنوز همه‌ی تغذیه‌ی لازم اوست و به هیچ غذای کمکی نیازی نیست.',
    tipEn: 'Your face is the best toy in the house — talk, sing and make silly sounds, and your baby will start answering with coos. Keep tummy time a little longer each day and expect short, broken stretches of sleep for now; night waking is completely normal at this age. Breast milk or formula is still all the nutrition your baby needs.',
    milestones: [
      {
        id: 'social-smile',
        fa: 'به چهره‌ها لبخند می‌زند',
        en: 'Smiles at faces',
      },
      {
        id: 'coos-gurgles',
        fa: 'شروع به قُرقُر و غان‌وغون می‌کند',
        en: 'Coos and gurgles',
      },
      {
        id: 'turns-toward-sounds',
        fa: 'به سمت صدا سر می‌چرخاند',
        en: 'Turns toward sounds',
      },
      {
        id: 'holds-head-steadier',
        fa: 'روی شکم، سر را بالاتر و پایدارتر نگه می‌دارد',
        en: 'Holds head up steadier during tummy time',
      },
      {
        id: 'opens-hands',
        fa: 'مشت‌هایش را باز می‌کند',
        en: 'Opens hands and relaxes the fists',
      },
    ],
  },
  {
    month: 3,
    titleFa: 'ماه سوم',
    titleEn: 'Month 3',
    tipFa: 'کنترل سر دارد جان می‌گیرد؛ او را روی پاهایت بنشان تا اطراف را تماشا کند و تمرین روی شکم را هر روز ادامه بده. آب‌دهان از این حوالی زیاد می‌شود و لزوماً به معنی دندان درآوردن نیست؛ دندان درآوردن بازه‌ی گسترده‌ای دارد. از «گفت‌وگوهای» قُرقُری لذت ببر: بعد از حرف زدن مکث کن تا فرصت جواب دادن پیدا کند.',
    tipEn: 'Head control is blossoming — sit your baby upright on your lap to practice looking around, and keep daily tummy time going. Drooling often starts around now and does not necessarily mean a tooth is coming; teething has a wide typical range. Enjoy the little conversations: pause after you speak and give your baby time to coo back.',
    milestones: [
      {
        id: 'props-forearms-chest',
        fa: 'روی شکم، با ساعدها سینه‌اش را بالا می‌گیرد',
        en: 'Props up on forearms to lift the chest',
      },
      {
        id: 'holds-head-upright',
        fa: 'وقتی عمودی نگهش می‌داری، سرش را محکم نگه می‌دارد',
        en: 'Holds head steady when held upright',
      },
      {
        id: 'hands-to-mouth',
        fa: 'دست‌هایش را به دهان می‌برد',
        en: 'Brings hands to the mouth',
      },
      {
        id: 'bats-at-toys',
        fa: 'به اسباب‌بازی‌های آویزان دست می‌زند',
        en: 'Bats at dangling toys',
      },
      {
        id: 'coo-conversation',
        fa: 'قُرقُر می‌کند و نوبتی با تو حرف می‌زند',
        en: 'Takes turns cooing back and forth',
      },
    ],
  },
  {
    month: 4,
    titleFa: 'ماه چهارم',
    titleEn: 'Month 4',
    tipFa: 'خیلی از نوزادها در حوالی این ماه «بحران خواب» معروف چهارماهگی را تجربه می‌کنند: شب‌هایی که بهتر شده بود، یک‌شبه به‌هم می‌ریزد — نشانه‌ی مغزی در حال رشد است و معمولاً چند هفته‌ای می‌گذرد. چون تمرین غلت زدن شروع می‌شود، خواباندن به پشت را ادامه بده. اگر آب‌دهان، جویدن همه‌چیز یا بی‌قراری لثه دیدی، شاید دندان در راه باشد؛ دندان‌گیر خنک (نه یخ‌زده) می‌تواند آرامش کند.',
    tipEn: 'Many babies meet the famous four-month sleep regression around now: nights that were improving suddenly fall apart — it is a sign of a busy, developing brain and usually passes within a few weeks. Keep placing your baby on the back to sleep, because rolling practice is about to begin. If drooling, chewing on everything or fussy gums appear, teething may be starting; a chilled (not frozen) teether can bring relief.',
    milestones: [
      {
        id: 'rolls-tummy-to-back',
        fa: 'از دمر به پشت غلت می‌زند',
        en: 'Rolls from tummy to back',
      },
      {
        id: 'chuckles-laughs',
        fa: 'قاه‌قاه می‌خندد',
        en: 'Chuckles and laughs out loud',
      },
      {
        id: 'reaches-both-hands',
        fa: 'با دو دست به سمت اسباب‌بازی‌ها دست دراز می‌کند',
        en: 'Reaches for toys with both hands',
      },
      {
        id: 'squeals-delight',
        fa: 'از خوشحالی جیغ می‌زند',
        en: 'Squeals with delight',
      },
      {
        id: 'anticipates-feeds',
        fa: 'وقتی سینه یا شیشه‌ی شیر را می‌بیند ذوق‌زده می‌شود',
        en: 'Lights up at the sight of breast or bottle',
      },
    ],
  },
  {
    month: 5,
    titleFa: 'ماه پنجم',
    titleEn: 'Month 5',
    tipFa: 'خیلی از نوزادها این ماه نشانه‌های آمادگی برای غذای کمکی را نشان می‌دهند — نشستن با تکیه، سرِ پایدار و خیره شدن به بشقاب تو — اما شروعِ معمول حدود شش‌ماهگی است و زمان دقیق را پزشک با شما تعیین می‌کند. وقت بازی آزاد روی زمین را زیاد کن تا عضلات غلت زدن قوی‌تر شود. چرت‌ها هم کم‌کم نظم قابل‌پیش‌بینی‌تری پیدا می‌کنند.',
    tipEn: 'Your baby may soon show the classic readiness signs for solids — sitting with support, a steady head and longing looks at your plate — but around 6 months is the usual starting time, and your pediatrician will confirm when your baby is ready. Plenty of free floor time keeps those rolling muscles growing. Naps also slowly begin to organize into a more predictable rhythm.',
    milestones: [
      {
        id: 'rolls-both-ways',
        fa: 'دوطرف غلت می‌زند؛ از پشت به دمر و برعکس',
        en: 'Rolls both ways',
      },
      {
        id: 'sits-propped',
        fa: 'با تکیه بر بالش یا دست‌های خودش می‌نشیند',
        en: 'Sits propped up with support',
      },
      {
        id: 'transfers-hand-to-hand',
        fa: 'اسباب‌بازی را از دستی به دست دیگر می‌گذارد',
        en: 'Passes a toy from one hand to the other',
      },
      {
        id: 'recognizes-familiar-faces',
        fa: 'چهره‌های آشنا را می‌شناسد',
        en: 'Recognizes familiar faces',
      },
      {
        id: 'shows-food-interest',
        fa: 'به غذای تو با اشتیاق نگاه می‌کند',
        en: 'Shows interest in your food',
      },
    ],
  },
  {
    month: 6,
    titleFa: 'ماه ششم',
    titleEn: 'Month 6',
    tipFa: 'به دنیای طعم‌ها خوش آمدی! حدود شش‌ماهگی — وقتی با تکیه می‌نشیند و به غذای تو دست دراز می‌کند — می‌توانی غذای کمکی را با غذاهای غنی از آهن شروع کنی: غلات غنی‌شده با آهن، پوره‌ی گوشت، عدس یا لوبیا. غذاهای تازه را یکی‌یکی و با فاصله بده، شیر مادر یا شیرخشک را غذای اصلی نگه دار و درباره‌ی شروع مواد حساسیت‌زا (مثل تخم‌مرغ) با پزشک مشورت کن؛ این ماه زمان خوبی برای ویزیت دوره‌ای طبق برنامه‌ی کشور شماست.',
    tipEn: 'Welcome to the world of flavors! Around 6 months — when your baby sits with support and reaches for your food — you can start solids with iron-rich first foods such as iron-fortified cereal, puréed meat, lentils or beans. Offer one new food at a time, keep breast milk or formula as the main nutrition, and discuss introducing common allergens with your pediatrician; this month is also a good time for the routine checkup on your national schedule.',
    milestones: [
      {
        id: 'sits-leaning-hands',
        fa: 'با تکیه بر دست‌هایش می‌نشیند',
        en: 'Sits leaning on both hands',
      },
      {
        id: 'pushes-up-straight-arms',
        fa: 'روی شکم، با دست‌های صاف خودش را بالا می‌کشد',
        en: 'Pushes up with straight arms during tummy time',
      },
      {
        id: 'babbles-baba-dada',
        fa: 'صداهایی مثل «با با» و «دا دا» را تکرار می‌کند',
        en: 'Babbles chains like “ba-ba” and “da-da”',
      },
      {
        id: 'mouths-to-explore',
        fa: 'هر شیء تازه را برای کشف به دهان می‌برد',
        en: 'Explores toys by bringing them to the mouth',
      },
      {
        id: 'reaches-grabs-toy',
        fa: 'به اسباب‌بازی دلخواهش دست دراز می‌کند و آن را می‌گیرد',
        en: 'Reaches for a toy and grabs it',
      },
    ],
  },
  {
    month: 7,
    titleFa: 'ماه هفتم',
    titleEn: 'Month 7',
    tipFa: 'دندان اول بازه‌ی گسترده‌ای دارد؛ بعضی بچه‌ها تا حالا دندان درآورده‌اند و بعضی چند ماه دیگر منتظر می‌مانند. لثه‌ی حساس با دندان‌گیر خنک و ماساژ ملایم با انگشت تمیز آرام می‌شود. یک قانون محکم: عسل را هرگز قبل از یک‌سالگی به بچه نده، چون خطر بوتولیسم نوزادی دارد. با پوره‌های غلیظ‌تر و بافت‌های نرم تمرین کن؛ غذای اصلی هنوز شیر مادر یا شیرخشک است.',
    tipEn: 'First teeth have a wide typical range — some babies already have a tooth, others wait several months; fussy gums love a chilled teether and a gentle massage with a clean finger. One firm rule: never give honey before the first birthday because of the risk of infant botulism. Let your baby practice with thicker purées and soft textures while breast milk or formula stays the main food.',
    milestones: [
      {
        id: 'sits-without-support',
        fa: 'بدون تکیه‌گاه می‌نشیند',
        en: 'Sits without support',
      },
      {
        id: 'takes-first-spoonfuls',
        fa: 'نخستین قاشق‌های پوره را می‌خورد و می‌بلعد',
        en: 'Takes first spoonfuls of purée and swallows',
      },
      {
        id: 'finds-partially-hidden',
        fa: 'اسباب‌بازی نیمه‌پنهان را پیدا می‌کند',
        en: 'Finds a toy that is partly hidden',
      },
      {
        id: 'leans-forward-sitting',
        fa: 'در حالت نشسته برای گرفتن اسباب‌بازی خودش را خم می‌کند',
        en: 'Leans forward from sitting to reach',
      },
      {
        id: 'whole-hand-grasp',
        fa: 'اشیا را با تمام کف دست می‌گیرد',
        en: 'Grabs objects with a whole-hand grasp',
      },
    ],
  },
  {
    month: 8,
    titleFa: 'ماه هشتم',
    titleEn: 'Month 8',
    tipFa: 'اگر با نزدیک شدن غریبه‌ها گریه می‌کند، این «اضطراب غریبه» است: نشانه‌ی سلامت دلبستگی است، نه لوس شدن — بغلش کن و بگذار چهره‌های تازه آهسته و با فاصله نزدیک شوند. همین حالا بهترین زمان برای ایمن‌سازی خانه است، چون خزیدن معمولاً نزدیک است. قایم‌موشک و پنهان کردن اسباب‌بازی زیر پارچه به او یاد می‌دهد که چیزها با وجود ناپدید شدن هنوز وجود دارند.',
    tipEn: 'If your baby cries when a friendly face comes too close, that is stranger anxiety — a healthy sign of strong attachment, not spoiled behavior; hold your baby close and let new people approach slowly. This is the perfect time to babyproof your home, because crawling is usually just around the corner. Peek-a-boo and hiding a toy under a cloth teach the wonderful idea that things still exist when out of sight.',
    milestones: [
      {
        id: 'sits-steadily-reaches',
        fa: 'محکم می‌نشیند و آزادانه به اطرافش می‌رسد',
        en: 'Sits steadily and reaches around freely',
      },
      {
        id: 'rocks-hands-knees',
        fa: 'روی دست‌وزانو تاب می‌خورد تا راه بیفتد',
        en: 'Rocks on hands and knees, ready to crawl',
      },
      {
        id: 'responds-to-own-name',
        fa: 'وقتی اسمش را صدا می‌زنی برمی‌گردد',
        en: 'Turns toward you when called by name',
      },
      {
        id: 'babbles-mamamama',
        fa: 'صداهایی مثل «ماما» و «بابا» درمی‌آورد (هنوز بی‌معنا)',
        en: 'Makes sounds like “mama” and “baba” (not yet with meaning)',
      },
      {
        id: 'stranger-awareness',
        fa: 'غریبه‌ها را تشخیص می‌دهد و به تو می‌چسبد',
        en: 'Grows cautious around strangers and clings to you',
      },
    ],
  },
  {
    month: 9,
    titleFa: 'ماه نهم',
    titleEn: 'Month 9',
    tipFa: 'چه قهرمانانه چهار دست‌وپا برود، چه روی شکم سُر بخورد، چه سبک مخصوص خودش را اختراع کند، همه‌ی راه‌های جابه‌جا شدن خوب‌اند؛ بازه‌ی طبیعی خیلی گسترده است. با غذاهای انگشتی نرم و ریز، مهارت برداشتن با نوک انگشت‌ها را تمرین کن و فضای امن کافی روی زمین برای کاوش در اختیارش بگذار. گوشه‌های نرم‌شده و دروازه‌ی ایمنی، کل خانه را به زمین بازی امن تبدیل می‌کنند.',
    tipEn: 'Whether your baby crawls like a champ, slides on the tummy or invents a private style, every way of getting around is fine — the typical range is wide. Offer small, soft finger foods to practice the coming pincer grasp and give plenty of safe floor space to explore. Softened corners and safety gates turn the whole home into a friendly playground.',
    milestones: [
      {
        id: 'crawls-or-scoots',
        fa: 'خزیدن، سُرخوردن روی شکم یا چهار دست‌وپا رفتن را شروع می‌کند',
        en: 'Crawls, scoots or army-crawls to get around',
      },
      {
        id: 'rakes-food-fingers',
        fa: 'با حرکت جمع‌کننده‌ی انگشت‌ها غذای خردشده را جلوی خودش می‌کشد',
        en: 'Rakes small food pieces closer with the fingers',
      },
      {
        id: 'bangs-objects-together',
        fa: 'دو اسباب‌بازی را به هم می‌کوبد',
        en: 'Bangs two toys together',
      },
      {
        id: 'searches-hidden-object',
        fa: 'اسباب‌بازی کاملاً پنهان‌شده را جست‌وجو می‌کند و پیدا می‌کند',
        en: 'Searches for a toy hidden out of sight',
      },
      {
        id: 'lifts-arms-to-be-picked',
        fa: 'برای بغل شدن دست‌هایش را بالا می‌آورد',
        en: 'Lifts arms up to be picked up',
      },
    ],
  },
  {
    month: 10,
    titleFa: 'ماه دهم',
    titleEn: 'Month 10',
    tipFa: 'خودش را برای ایستادن می‌کشد؛ پس وقتش رسیده تشک تخت را پایین‌تر ببری — ایستاده‌های مغرور سریع کنار می‌روند. در وعده‌ها کمی آب با لیوان به او بده تا مهارت لیوان‌نوشیدن کنار مهارت قاشق رشد کند. اسم‌ها را تکرار کن، به هر خداحافظی جواب بده و بازی «پر کردن و خالی کردن» با ظرف‌ها را راه بینداز؛ تکرار، روش یادگیری بچه‌ها در این سن است.',
    tipEn: 'Pulling up to stand means it is time to lower the crib mattress — proud little standers topple fast. Offer some water in an open cup at meals so cup skills grow alongside spoon skills. Repeat names, wave back at every bye-bye and play fill-and-pour games with containers; repetition is exactly how babies learn at this age.',
    milestones: [
      {
        id: 'pulls-to-stand',
        fa: 'با گرفتن مبلمان خودش را به حالت ایستاده می‌کشد',
        en: 'Pulls up to stand holding on to furniture',
      },
      {
        id: 'pincer-grasp',
        fa: 'با نوک انگشت شست و اشاره خرده‌ریزها را برمی‌دارد',
        en: 'Picks up small bits with thumb and fingertip (pincer grasp)',
      },
      {
        id: 'waves-bye-bye',
        fa: 'برای خداحافظی دست تکان می‌دهد',
        en: 'Waves bye-bye',
      },
      {
        id: 'sips-open-cup',
        fa: 'با کمکت از لیوان جرعه می‌نوشد',
        en: 'Takes sips from an open cup with help',
      },
      {
        id: 'in-out-containers',
        fa: 'اشیا را داخل ظرف می‌گذارد و بیرون می‌آورد',
        en: 'Puts objects into containers and tips them out',
      },
    ],
  },
  {
    month: 11,
    titleFa: 'ماه یازدهم',
    titleEn: 'Month 11',
    tipFa: 'بعضی بچه‌ها این ماه تنها می‌ایستند یا قدم اول را برمی‌دارند؛ بعضی هم با خیال راحت چند ماه دیگر صبر می‌کنند — هر دو کاملاً طبیعی است و هر نوزاد ریتم خودش را دارد. تمام کارهایت را برایش روایت کن و اسم همه‌چیز را بگو؛ خانه‌ی پرحرف، بهترین کلاس زبان است. داخل خانه پای برهنه به تعادلش کمک می‌کند — و مراقب باش: سن بالا رفتن از همه‌چیز شروع شده!',
    tipEn: 'Some babies stand alone or take a wobbly first step around now; others happily wait a few more months — both are perfectly typical, every baby has their own pace. Narrate your day and name everything you see; a language-rich home is the best speech class there is. Bare feet indoors help balance — and watch out, the age of climbing on everything has begun!',
    milestones: [
      {
        id: 'cruises-furniture',
        fa: 'با گرفتن از مبلمان کنارش قدم می‌زند',
        en: 'Cruises along the furniture',
      },
      {
        id: 'understands-familiar-words',
        fa: 'واژه‌ها و اسم‌های آشنا را می‌فهمد',
        en: 'Understands familiar words and names',
      },
      {
        id: 'stands-alone-moments',
        fa: 'چند لحظه بدون تکیه‌گاه می‌ایستد',
        en: 'Stands alone for a few seconds',
      },
      {
        id: 'points-index-finger',
        fa: 'با انگشت اشاره چیزهای موردعلاقه‌اش را نشان می‌دهد',
        en: 'Points with one finger at things of interest',
      },
      {
        id: 'give-and-take-play',
        fa: 'اسباب‌بازی را به تو می‌دهد و پس می‌گیرد',
        en: 'Hands you a toy and takes it back',
      },
    ],
  },
  {
    month: 12,
    titleFa: 'ماه دوازدهم',
    titleEn: 'Month 12',
    tipFa: 'یک سالگی مبارک، مامان! قدم اول معمولاً بین ۹ تا ۱۸ ماهگی برداشته می‌شود؛ چه یک‌ساله‌ات راه برود و چه هنوز با تکیه بر مبلمان قدم بزند، هر ریتمی ریتم خودش و عالی است. بعد از ۱۲ ماهگی درباره‌ی شروع شیر کامل گاو و غذای خانواده با پزشک مشورت کن، تمرین لیوان‌نوشیدن را ادامه بده و هر روز کتاب بخوان و با او حرف بزن — انفجار واژه‌ها در راه است!',
    tipEn: 'Happy first birthday, mama! First steps usually arrive somewhere between 9 and 18 months, so whether your one-year-old is marching or still cruising, each pace is its own perfect. After 12 months, ask your pediatrician about moving toward whole cow’s milk and family foods, keep practicing with the cup, and keep reading and talking every day — the word explosion is on its way.',
    milestones: [
      {
        id: 'first-steps',
        fa: 'نخستین قدم‌های مستقل را برمی‌دارد یا با تکیه بر مبلمان راه می‌رود',
        en: 'Takes first steps or walks holding on to furniture',
      },
      {
        id: 'calls-mama-baba',
        fa: 'تو را با معنا «ماما» یا «بابا» صدا می‌زند',
        en: 'Says “mama” or “baba” meaningfully to call you',
      },
      {
        id: 'gets-to-sitting-alone',
        fa: 'خودش از حالت درازکش به نشسته می‌رود',
        en: 'Gets to a sitting position without help',
      },
      {
        id: 'self-feeds-finger-foods',
        fa: 'غذاهای انگشتی را خودش برمی‌دارد و می‌خورد',
        en: 'Self-feeds finger foods with the pincer grasp',
      },
      {
        id: 'joins-clapping-games',
        fa: 'در بازی‌های دست‌زدنی مثل «اتل متل توتوله» شرکت می‌کند',
        en: 'Joins clapping games like pat-a-cake',
      },
    ],
  },
];
