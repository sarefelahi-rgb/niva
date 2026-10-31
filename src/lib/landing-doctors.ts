/**
 * Wave 16 — curated public showcase of OB/GYN specialists for the new
 * doctor-directory landing ("پزشکان زنان، زایمان و نازایی").
 *
 * These are demo profiles: bilingual strings live here as *content data*
 * (fa/en) rather than in i18n.ts, because names, cities, clinics and
 * patient comments are editorial content, not UI chrome. UI labels live
 * under the `ld.*` namespace in i18n.ts.
 *
 * Photos are AI-generated portraits served from /public/doctors — they are
 * not real people. Patient comments are fictional demo content written for
 * this showcase; no real patient data is involved.
 */

export interface Bi {
  fa: string;
  en: string;
}

export interface LandingComment {
  id: string;
  patient: Bi;
  rating: number; // 1..5
  daysAgo: number;
  text: Bi;
}

export interface LandingDoctor {
  id: string;
  photo: string;
  name: Bi;
  /** Specialty line, e.g. «متخصص زنان، زایمان و نازایی». */
  title: Bi;
  city: Bi;
  clinic: Bi;
  experienceYears: number;
  /** Patient satisfaction, 0..100. */
  satisfaction: number;
  /** Average star rating, 0..5 (one decimal). */
  rating: number;
  reviewsCount: number;
  feeToman: number;
  /** 0 = free slot today, 1 = tomorrow, n = in n days. */
  nextSlotDays: number;
  clinicVisit: boolean;
  onlineVisit: boolean;
  tags: Bi[];
  topComment: LandingComment;
}

export const LANDING_DOCTORS: LandingDoctor[] = [
  {
    id: 'rezaei',
    photo: '/doctors/dr-1.png',
    name: { fa: 'دکتر مریم رضایی', en: 'Dr. Maryam Rezaei' },
    title: { fa: 'متخصص زنان، زایمان و نازایی', en: 'Gynecologist, Obstetrician & Infertility Specialist' },
    city: { fa: 'تهران', en: 'Tehran' },
    clinic: { fa: 'مطب بیمارستان آرمان', en: 'Arman Hospital Office' },
    experienceYears: 18,
    satisfaction: 98,
    rating: 4.9,
    reviewsCount: 214,
    feeToman: 7_500_000,
    nextSlotDays: 1,
    clinicVisit: true,
    onlineVisit: true,
    tags: [
      { fa: 'زایمان طبیعی', en: 'Natural birth' },
      { fa: 'بارداری پرخطر', en: 'High-risk pregnancy' },
      { fa: 'سونوگرافی', en: 'Ultrasound' },
    ],
    topComment: {
      id: 'rezaei-c1',
      patient: { fa: 'سپیده م.', en: 'Sepideh M.' },
      rating: 5,
      daysAgo: 6,
      text: {
        fa: 'از هفته ششم بارداری پیش دکتر رضایی بودم. برای هر نگرانی‌ام وقت پاسخ داشت و در زایمان هم خیلی آرام و مطمئن کنارم بود.',
        en: 'I have been with Dr. Rezaei since week six of my pregnancy. She had time for every concern and stayed calm and reassuring throughout the birth.',
      },
    },
  },
  {
    id: 'mohammadi',
    photo: '/doctors/dr-2.png',
    name: { fa: 'دکتر سارا محمدی', en: 'Dr. Sara Mohammadi' },
    title: { fa: 'متخصص زنان و جراحی لاپاراسکوپی', en: 'Gynecologist & Laparoscopic Surgeon' },
    city: { fa: 'اصفهان', en: 'Isfahan' },
    clinic: { fa: 'کلینیک مهرگان', en: 'Mehregan Clinic' },
    experienceYears: 12,
    satisfaction: 97,
    rating: 4.8,
    reviewsCount: 158,
    feeToman: 6_000_000,
    nextSlotDays: 0,
    clinicVisit: true,
    onlineVisit: true,
    tags: [
      { fa: 'جراحی لاپاراسکوپی', en: 'Laparoscopy' },
      { fa: 'کیست تخمدان', en: 'Ovarian cysts' },
      { fa: 'فیبروم', en: 'Fibroids' },
    ],
    topComment: {
      id: 'mohammadi-c1',
      patient: { fa: 'نیلوفر ک.', en: 'Niloufar K.' },
      rating: 5,
      daysAgo: 12,
      text: {
        fa: 'برای کیست تخمدان عمل لاپاراسکوپی شدم. همه‌چیز را با حوصله توضیح داد و بعد از عمل هم پیگیر بود. به همه پیشنهادش می‌کنم.',
        en: 'I had laparoscopic surgery for an ovarian cyst. She explained everything patiently and followed up after surgery. Highly recommended.',
      },
    },
  },
  {
    id: 'ahmadi',
    photo: '/doctors/dr-3.png',
    name: { fa: 'دکتر لیلا احمدی', en: 'Dr. Leila Ahmadi' },
    title: { fa: 'فلوشیپ نازایی و IVF', en: 'Fellowship in Infertility & IVF' },
    city: { fa: 'تهران', en: 'Tehran' },
    clinic: { fa: 'مرکز ناباروری رویان', en: 'Royan Fertility Center' },
    experienceYears: 24,
    satisfaction: 99,
    rating: 5.0,
    reviewsCount: 342,
    feeToman: 12_000_000,
    nextSlotDays: 3,
    clinicVisit: true,
    onlineVisit: false,
    tags: [
      { fa: 'IVF', en: 'IVF' },
      { fa: 'IUI', en: 'IUI' },
      { fa: 'پیش از بارداری', en: 'Pre-conception' },
    ],
    topComment: {
      id: 'ahmadi-c1',
      patient: { fa: 'مهسا ر.', en: 'Mahsa R.' },
      rating: 5,
      daysAgo: 3,
      text: {
        fa: 'بعد از چهار سال انتظار با راهنمایی دکتر احمدی مادر شدم. صبور، امیدوارکننده و فوق‌العاده دقیق در پروتکل درمان.',
        en: 'After four years of waiting, I became a mother under Dr. Ahmadi\u2019s care. Patient, hopeful and incredibly precise with the treatment protocol.',
      },
    },
  },
  {
    id: 'karimi',
    photo: '/doctors/dr-4.png',
    name: { fa: 'دکتر نرگس کریمی', en: 'Dr. Narges Karimi' },
    title: { fa: 'متخصص زنان و طب مادر و جنین', en: 'Gynecologist & Maternal-Fetal Medicine' },
    city: { fa: 'شیراز', en: 'Shiraz' },
    clinic: { fa: 'بیمارستان مادر و کودک', en: 'Mother & Child Hospital' },
    experienceYears: 15,
    satisfaction: 96,
    rating: 4.8,
    reviewsCount: 187,
    feeToman: 9_000_000,
    nextSlotDays: 1,
    clinicVisit: true,
    onlineVisit: true,
    tags: [
      { fa: 'طب جنین', en: 'Fetal medicine' },
      { fa: 'سونوگرافی سه‌بعدی', en: '3D ultrasound' },
      { fa: 'غربالگری', en: 'Screening' },
    ],
    topComment: {
      id: 'karimi-c1',
      patient: { fa: 'الهام ص.', en: 'Elham S.' },
      rating: 5,
      daysAgo: 9,
      text: {
        fa: 'بارداری من پرخطر بود و دکتر کریمی با آرامش و دانش کامل مسیر را هموار کرد. هر سونوگرافی را با حوصله توضیح می‌داد.',
        en: 'My pregnancy was high-risk and Dr. Karimi smoothed the path with calm and deep expertise. She patiently explained every ultrasound.',
      },
    },
  },
  {
    id: 'hosseini',
    photo: '/doctors/dr-5.png',
    name: { fa: 'دکتر زهرا حسینی', en: 'Dr. Zahra Hosseini' },
    title: { fa: 'متخصص زنان، فلوشیپ بارداری پرخطر', en: 'Gynecologist, High-Risk Pregnancy Fellowship' },
    city: { fa: 'مشهد', en: 'Mashhad' },
    clinic: { fa: 'کلینیک باران', en: 'Baran Clinic' },
    experienceYears: 9,
    satisfaction: 97,
    rating: 4.7,
    reviewsCount: 96,
    feeToman: 5_000_000,
    nextSlotDays: 0,
    clinicVisit: true,
    onlineVisit: true,
    tags: [
      { fa: 'دیابت بارداری', en: 'Gestational diabetes' },
      { fa: 'فشار خون بارداری', en: 'Pregnancy hypertension' },
      { fa: 'بارداری دوقلویی', en: 'Twin pregnancy' },
    ],
    topComment: {
      id: 'hosseini-c1',
      patient: { fa: 'فاطمه ن.', en: 'Fatemeh N.' },
      rating: 5,
      daysAgo: 4,
      text: {
        fa: 'دیابت بارداری داشتم و خیلی استرس داشتم. دکتر حسینی برنامه غذایی و پیگیری منظم گذاشت و بچه سالم به دنیا آمد.',
        en: 'I had gestational diabetes and was very anxious. Dr. Hosseini set up a nutrition plan with regular follow-ups and my baby was born healthy.',
      },
    },
  },
  {
    id: 'mousavi',
    photo: '/doctors/dr-6.png',
    name: { fa: 'دکتر پرستو موسوی', en: 'Dr. Parastoo Mousavi' },
    title: { fa: 'متخصص زنان و زایمان', en: 'Gynecologist & Obstetrician' },
    city: { fa: 'تبریز', en: 'Tabriz' },
    clinic: { fa: 'مطب دکتر موسوی', en: 'Dr. Mousavi Office' },
    experienceYears: 21,
    satisfaction: 95,
    rating: 4.7,
    reviewsCount: 121,
    feeToman: 4_500_000,
    nextSlotDays: 1,
    clinicVisit: true,
    onlineVisit: false,
    tags: [
      { fa: 'سلامت یائسگی', en: 'Menopause care' },
      { fa: 'پاپ اسمیر', en: 'Pap smear' },
      { fa: 'پیشگیری', en: 'Contraception' },
    ],
    topComment: {
      id: 'mousavi-c1',
      patient: { fa: 'مریم ت.', en: 'Maryam T.' },
      rating: 4,
      daysAgo: 20,
      text: {
        fa: 'سال‌هاست خانواده‌ام به دکتر موسوی مراجعه می‌کنند. صادق است و ویزیت‌های غیرضروری تجویز نمی‌کند.',
        en: 'My family has been visiting Dr. Mousavi for years. She is honest and never orders unnecessary visits or tests.',
      },
    },
  },
  {
    id: 'kazemi',
    photo: '/doctors/dr-7.png',
    name: { fa: 'دکتر رضا کاظمی', en: 'Dr. Reza Kazemi' },
    title: { fa: 'متخصص زنان و جراحی اورولوژی زنان', en: 'Gynecologist & Female Urology Surgeon' },
    city: { fa: 'تهران', en: 'Tehran' },
    clinic: { fa: 'بیمارستان سلامت', en: 'Salamat Hospital' },
    experienceYears: 28,
    satisfaction: 94,
    rating: 4.6,
    reviewsCount: 143,
    feeToman: 10_000_000,
    nextSlotDays: 2,
    clinicVisit: true,
    onlineVisit: true,
    tags: [
      { fa: 'آندومتریوز', en: 'Endometriosis' },
      { fa: 'جراحی سنگین', en: 'Major surgery' },
      { fa: 'بی‌اختیاری ادرار', en: 'Incontinence' },
    ],
    topComment: {
      id: 'kazemi-c1',
      patient: { fa: 'شیوا ا.', en: 'Shiva A.' },
      rating: 5,
      daysAgo: 15,
      text: {
        fa: 'جراحی آندومتریوز پیشرفته‌ام را انجام داد. دکتر کاظمی قبل و بعد از عمل با نهایت دقت پیگیر حال من بود.',
        en: 'Dr. Kazemi performed my advanced endometriosis surgery. He followed my recovery with great care before and after the operation.',
      },
    },
  },
  {
    id: 'norouzi',
    photo: '/doctors/dr-8.png',
    name: { fa: 'دکتر شیرین نوروزی', en: 'Dr. Shirin Norouzi' },
    title: { fa: 'متخصص زنان و سونوگرافی تخصصی', en: 'Gynecologist & Specialized Ultrasound' },
    city: { fa: 'کرج', en: 'Karaj' },
    clinic: { fa: 'کلینیک سپید', en: 'Sepid Clinic' },
    experienceYears: 7,
    satisfaction: 96,
    rating: 4.8,
    reviewsCount: 74,
    feeToman: 4_000_000,
    nextSlotDays: 0,
    clinicVisit: true,
    onlineVisit: true,
    tags: [
      { fa: 'سونوگرافی', en: 'Ultrasound' },
      { fa: 'ویزیت آنلاین', en: 'Online visit' },
      { fa: 'بارداری', en: 'Pregnancy' },
    ],
    topComment: {
      id: 'norouzi-c1',
      patient: { fa: 'پریا ب.', en: 'Paria B.' },
      rating: 5,
      daysAgo: 2,
      text: {
        fa: 'هم برای سونوگرافی هم ویزیت آنلاین رفتم. سریع جواب می‌دهد و برای مادران شاغل واقعاً مناسب است.',
        en: 'I came for both ultrasound and online visits. She replies fast — genuinely convenient for working mothers.',
      },
    },
  },
];

/** Flat feed of patient comments for the landing reviews section. */
export const LANDING_COMMENTS: (LandingComment & { doctorId: string })[] = [
  ...LANDING_DOCTORS.map((d) => ({ ...d.topComment, doctorId: d.id })),
  // Additional comments per doctor
  {
    id: 'rezaei-c2', doctorId: 'rezaei',
    patient: { fa: 'گلناز ح.', en: 'Golnaz H.' }, rating: 5, daysAgo: 21,
    text: {
      fa: 'اولین بارداری‌ام بود و از هر جلسه با ذهن آرام بیرون می‌آمدم. پاسخ پیام‌ها در اپ NIVA هم سریع بود.',
      en: 'It was my first pregnancy and I left every appointment with a calm mind. Replies through the NIVA app were quick too.',
    },
  },
  {
    id: 'rezaei-c3', doctorId: 'rezaei',
    patient: { fa: 'ندا پ.', en: 'Neda P.' }, rating: 4, daysAgo: 35,
    text: {
      fa: 'دقیق و منظم است؛ فقط روزهای شلوغ کمی منتظر می‌مانی. ارزشش را دارد.',
      en: 'Precise and organized; only on busy days you wait a bit. Worth it.',
    },
  },
  {
    id: 'mohammadi-c2', doctorId: 'mohammadi',
    patient: { fa: 'زهرا ق.', en: 'Zahra G.' }, rating: 5, daysAgo: 17,
    text: {
      fa: 'در پذیرش و رفتار تیمش هم حرفه‌ای بود. کلینیک مهرگان را هم تمیز و منظم پیدا کردم.',
      en: 'Professional in her manner and with her team as well. Mehregan Clinic was clean and organized too.',
    },
  },
  {
    id: 'mohammadi-c3', doctorId: 'mohammadi',
    patient: { fa: 'سمانه د.', en: 'Samaneh D.' }, rating: 4, daysAgo: 28,
    text: {
      fa: 'برای مشاوره آنلاین نوبت گرفتم؛ همان کیفیت ویزیت حضوری بود با صرفه‌جویی در وقت.',
      en: 'I booked an online consultation; same quality as an in-person visit, without the commute.',
    },
  },
  {
    id: 'ahmadi-c2', doctorId: 'ahmadi',
    patient: { fa: 'الهه س.', en: 'Elaheh S.' }, rating: 5, daysAgo: 11,
    text: {
      fa: 'دکتر احمدی روی جزئیات پروتکل وسواس‌گونه دقیق است و همین اعتماد می‌آورد. امید را به من برگرداند.',
      en: 'Dr. Ahmadi is meticulous about every protocol detail — and that builds trust. She gave me my hope back.',
    },
  },
  {
    id: 'ahmadi-c3', doctorId: 'ahmadi',
    patient: { fa: 'رؤیا ک.', en: 'Roya K.' }, rating: 5, daysAgo: 44,
    text: {
      fa: 'سه سال رفت‌وآمد داشتیم و هر بار با حوصله جواب سؤال‌هایمان را می‌داد، حتی سؤال‌های تکراری.',
      en: 'We commuted for three years and every time she patiently answered all our questions, even repeated ones.',
    },
  },
  {
    id: 'karimi-c2', doctorId: 'karimi',
    patient: { fa: 'بهار م.', en: 'Bahar M.' }, rating: 4, daysAgo: 26,
    text: {
      fa: 'سونوگرافی سه‌بعدی‌اش عالی بود؛ برای اولین بار صورت بچه را دیدم و گریه‌ام گرفت.',
      en: 'Her 3D ultrasound was wonderful; I saw my baby\u2019s face for the first time and was moved to tears.',
    },
  },
  {
    id: 'karimi-c3', doctorId: 'karimi',
    patient: { fa: 'لیلا و.', en: 'Leila V.' }, rating: 5, daysAgo: 38,
    text: {
      fa: 'در هفته ۳۲ فشارم بالا رفت و همان شب تحت نظر قرار گرفتم. تصمیم‌های درست در زمان درست.',
      en: 'My blood pressure spiked at week 32 and I was monitored the same night. Right decisions at the right time.',
    },
  },
  {
    id: 'hosseini-c2', doctorId: 'hosseini',
    patient: { fa: 'آناهیتا ر.', en: 'Anahita R.' }, rating: 5, daysAgo: 7,
    text: {
      fa: 'برخلاف تجربه‌های قبلی‌ام، اینجا واقعاً گوش می‌دهند. جدول رشد بچه را قدم‌به‌قدم برایم توضیح داد.',
      en: 'Unlike my past experiences, I was truly listened to here. She walked me through my baby\u2019s growth chart step by step.',
    },
  },
  {
    id: 'hosseini-c3', doctorId: 'hosseini',
    patient: { fa: 'مینا ف.', en: 'Mina F.' }, rating: 4, daysAgo: 19,
    text: {
      fa: 'جوان و به‌روز است و از اپلیکیشن برای پیگیری استفاده می‌کند. برای نسل ما عالی.',
      en: 'Young, up to date, and uses the app for follow-ups. Perfect for our generation.',
    },
  },
  {
    id: 'mousavi-c2', doctorId: 'mousavi',
    patient: { fa: 'خدیجه ع.', en: 'Khadijeh A.' }, rating: 5, daysAgo: 31,
    text: {
      fa: 'دوره یائسگی را با آرامش طی کردم به لطف مشورت‌های دکتر موسوی. توصیه‌هایش واقع‌بینانه بود.',
      en: 'I went through menopause calmly thanks to Dr. Mousavi\u2019s counsel. Her advice was realistic and grounded.',
    },
  },
  {
    id: 'mousavi-c3', doctorId: 'mousavi',
    patient: { fa: 'سمیرا ز.', en: 'Samira Z.' }, rating: 4, daysAgo: 50,
    text: {
      fa: 'دو زایمان طبیعی با راهنمایی ایشان داشتم. همیشه حامی زایمان طبیعی بود اما انتخاب را با من گذاشت.',
      en: 'I had two natural births under her guidance. She always advocated for natural birth but left the choice to me.',
    },
  },
  {
    id: 'kazemi-c2', doctorId: 'kazemi',
    patient: { fa: 'نازنین ش.', en: 'Nazanin Sh.' }, rating: 4, daysAgo: 13,
    text: {
      fa: 'برای جراحی‌های پیچیده انتخاب درستی است. توضیح ریسک‌ها کاملاً شفاف بود، نه ترساننده نه کتمان‌آمیز.',
      en: 'The right choice for complex surgery. His explanation of risks was fully transparent — neither scary nor glossed over.',
    },
  },
  {
    id: 'kazemi-c3', doctorId: 'kazemi',
    patient: { fa: 'ترانه ی.', en: 'Taraneh Y.' }, rating: 5, daysAgo: 41,
    text: {
      fa: 'دکتر کاظمی مرد است اما از بسیاری از همکاران زن به نیازهای بیمار زن حساس‌تر بود. فقط زمان انتظار بیشتر.',
      en: 'Dr. Kazemi is male but more attuned to women\u2019s needs than many female colleagues I saw. Only the wait is longer.',
    },
  },
  {
    id: 'norouzi-c2', doctorId: 'norouzi',
    patient: { fa: 'درسا ب.', en: 'Dorsa B.' }, rating: 5, daysAgo: 5,
    text: {
      fa: 'اولین ویزیت آنلاین زندگی‌ام بود و انتظار نداشتم این‌قدر کامل باشد. نسخه و توصیه‌ها در اپ ثبت شد.',
      en: 'It was my first online visit ever and I did not expect it to be this thorough. Prescription and advice were logged in the app.',
    },
  },
  {
    id: 'norouzi-c3', doctorId: 'norouzi',
    patient: { fa: 'آیدا ج.', en: 'Aida J.' }, rating: 4, daysAgo: 24,
    text: {
      fa: 'برای سونوگرافی هفته‌های اول انتخاب خوبی است. وقت آزاد زیاد دارد و نوبت گرفتن راحت بود.',
      en: 'A good choice for first-trimester ultrasounds. Plenty of open slots and booking was easy.',
    },
  },
];

/** Unique cities derived once from the showcase data. */
export const LANDING_CITIES: Bi[] = Array.from(
  new Map(LANDING_DOCTORS.map((d) => [d.city.en, d.city])).values(),
);
