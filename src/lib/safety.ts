/**
 * NIVA deterministic medical-safety layer.
 *
 * Red-flag assessment is 100% deterministic (regex/keyword, bilingual EN/FA) and
 * runs BEFORE the LLM is ever invoked. Emergency matches bypass the LLM entirely
 * and return a fixed, clinically-reviewed response template. This module is the
 * safety backbone and must never depend on model output.
 * See docs/06-medical-safety.md for the taxonomy and governance workflow.
 */

export type SafetyLevel = 'NORMAL' | 'CAUTION' | 'EMERGENCY';

export interface RedFlagRule {
  id: string;
  category: string;
  level: SafetyLevel;
  patterns: RegExp[];
}

export interface SafetyAssessment {
  level: SafetyLevel;
  categories: string[];
  ruleIds: string[];
}

// Patterns are written against lowercased, whitespace-normalized text.
const rules: RedFlagRule[] = [
  {
    id: 'bleeding-heavy',
    category: 'BLEEDING',
    level: 'EMERGENCY',
    patterns: [
      /(heavy|a lot of|lots of) (vaginal )?bleeding/,
      /bleeding (heavily|a lot|like a period|soaking)/,
      /(خونریزی|خون ریزی).{0,20}(شدید|زیاد|فراوان|پد|مثل قاعدگی)/,
      /خونریزی شدید/,
    ],
  },
  {
    id: 'severe-pain',
    category: 'PAIN',
    level: 'EMERGENCY',
    patterns: [
      /severe (abdominal|belly|pelvic) pain/,
      /(intense|unbearable|excruciating|strong) pain/,
      /pain with (fever|bleeding)/,
      /(درد).{0,16}(شدید|طاقت.?فرسا|بی.?تحمل)/,
      /درد شکم شدید/,
    ],
  },
  {
    id: 'headache-visual',
    category: 'PREECLAMPSIA_SIGNS',
    level: 'EMERGENCY',
    patterns: [
      /severe headache (with|and|plus) (blurred|vision|spots)/,
      /(blurred vision|seeing spots|flashing lights).{0,40}(headache|swelling)/,
      /(swelling|puffy) (face|hands).{0,40}(sudden|severe)/,
      /سردرد شدید.{0,30}(تاری|جرق|دید)/,
      /(تاری دید|مشاهده جرقات).{0,30}(سردرد|تورم)/,
      /تورم ناگهانی (صورت|دست)/,
    ],
  },
  {
    id: 'fever-high',
    category: 'FEVER',
    level: 'EMERGENCY',
    patterns: [
      /fever (above|over|higher than) (38|39|100|101|102)/,
      /temperature (above|over) (38|39|100|101)/,
      /تب.{0,16}(بالای|بیش از)\s*(۳۸|38|۳۹|39)/,
      /(تب|دما).{0,10}(شدید|بالا)/,
    ],
  },
  {
    id: 'fluid-leak',
    category: 'MEMBRANE_RUPTURE',
    level: 'EMERGENCY',
    patterns: [
      /(water broke|fluid leaking|leaking (clear )?fluid|gush of (water|fluid))/,
      /(آب.?های?م|مایع).{0,16}(پاره|نشتی|ریخت|آمد)/,
      /پاره شدن کیسه/,
    ],
  },
  {
    id: 'contractions-early',
    category: 'PRETERM_LABOR',
    level: 'EMERGENCY',
    patterns: [
      /(regular|painful|strong) contractions/,
      /contractions (every|each) \d+/,
      /(انقباض|زایمان زودرس)/,
      /انقباضات منظم/,
    ],
  },
  {
    id: 'decreased-movement',
    category: 'FETAL_MOVEMENT',
    level: 'EMERGENCY',
    patterns: [
      /(baby|fetus).{0,30}(not moving|less movement|decreased movement|stopped moving|no movement)/,
      /(reduced|decreased|no) (fetal )?(movement|kick)/,
      /(حرکت (جنین|بچه)).{0,20}(کم|نمی.?کنه|نکرد|حس نمی)/,
      /حرکت جنین کم/,
    ],
  },
  {
    id: 'seizure',
    category: 'SEIZURE',
    level: 'EMERGENCY',
    patterns: [/(seizure|convulsion|fit)/, /(تشنج|حمله صرعی)/],
  },
  {
    id: 'chest-breathing',
    category: 'CARDIORESPIRATORY',
    level: 'EMERGENCY',
    patterns: [
      /(chest pain|difficulty breathing|can'?t breathe|shortness of breath at rest)/,
      /(درد قفسه سینه|تنگی نفس|نفس نمی.?کشم|تنگی نفس شدید)/,
    ],
  },
  {
    id: 'mental-crisis',
    category: 'MENTAL_HEALTH_CRISIS',
    level: 'EMERGENCY',
    patterns: [
      /(kill myself|end my life|suicid|want to die|self.?harm|hurt myself)/,
      /(خودکشی|به زندگیم پایان|می.?خوام بمیرم|آسیب به خودم)/,
    ],
  },
  {
    id: 'vomiting-severe',
    category: 'HYPEREMESIS',
    level: 'CAUTION',
    patterns: [
      /(can'?t keep (any )?(food|fluids|water) down|vomiting everything|vomiting for (days|more than))/,
      /(استفراغ).{0,20}(مداوم|همه.?چیز|نمی.?توانم)/,
      /هیچ چیزی سر جایش نمی.?ماند/,
    ],
  },
  {
    id: 'spotting',
    category: 'BLEEDING',
    level: 'CAUTION',
    patterns: [/(spotting|light bleeding)/, /(لکه بینی|لکه.?لکه)/],
  },
  {
    id: 'dizziness-fainting',
    category: 'GENERAL',
    level: 'CAUTION',
    patterns: [/(faint(ed|ing)?|pass(ed|ing)? out|dizzy and)/, /(غش|سرگیجه شدید)/],
  },
  {
    id: 'burning-urine',
    category: 'INFECTION',
    level: 'CAUTION',
    patterns: [/(burning|pain) (when|while) urinat/, /(سوزش|درد).{0,16}(ادرار|موقع ادرار)/],
  },
];

export function assessSafety(text: string): SafetyAssessment {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').slice(0, 2000);
  let level: SafetyLevel = 'NORMAL';
  const categories: string[] = [];
  const ruleIds: string[] = [];
  const order: Record<SafetyLevel, number> = { NORMAL: 0, CAUTION: 1, EMERGENCY: 2 };

  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(normalized))) {
      ruleIds.push(rule.id);
      if (!categories.includes(rule.category)) categories.push(rule.category);
      if (order[rule.level] > order[level]) level = rule.level;
    }
  }
  return { level, categories, ruleIds };
}

/** Prompt-injection heuristics (defense-in-depth; never the only layer). */
const injectionPatterns: RegExp[] = [
  /ignore (all |any |previous |prior )?(instructions|rules|prompts?)/,
  /disregard (all |any |previous )?(instructions|rules|guidelines)/,
  /you are now (a|an) /,
  /(system prompt|developer mode|jailbreak)/,
  /reveal (your )?(instructions|system prompt)/,
  /(نادیده بگیر).{0,20}(دستور|قوانین)/,
  /(پیام سیستمی|حالت توسعه.?دهنده)/,
];

export function detectInjection(text: string): boolean {
  const normalized = text.toLowerCase().slice(0, 1000);
  return injectionPatterns.some((p) => p.test(normalized));
}

export interface EmergencyTemplate {
  level: SafetyLevel;
  titleEn: string;
  titleFa: string;
  bodyEn: string;
  bodyFa: string;
}

export function emergencyTemplate(categories: string[]): EmergencyTemplate {
  const mental = categories.includes('MENTAL_HEALTH_CRISIS');
  return {
    level: 'EMERGENCY',
    titleEn: 'Please seek medical care now',
    titleFa: 'لطفاً همین حالا مراجعه پزشکی انجام دهید',
    bodyEn: mental
      ? 'What you shared suggests you may be in crisis, and you deserve immediate support. Please contact your local emergency number or a crisis line right now. In Iran you can call 123 (social emergency) or 115 for medical emergencies. If you are outside Iran, contact your local emergency services. Please do not wait, and tell someone you trust. NIVA is an educational tool and cannot provide crisis care.'
      : 'Based on what you described, you should contact your midwife, obstetrician, or local emergency services now — do not wait for your next appointment. In Iran, call 115 for medical emergencies or 123 for social emergency support. If you are outside Iran, call your local emergency number. NIVA is an educational tool, not a diagnostic service, and this message is not a diagnosis. It is always safer to have a concerning symptom checked promptly.',
    bodyFa: mental
      ? 'آنچه نوشته‌اید نشان می‌دهد ممکن است در شرایط بحرانی باشید و حق دارید فوراً حمایت دریافت کنید. لطفاً همین حالا با اورژانس اجتماعی ۱۲۳ یا اورژانس پزشکی ۱۱۵ تماس بگیرید. اگر خارج از ایران هستید، با شماره اورژانس محل زندگی خود تماس بگیرید و به فردی مورد اعتماد خود هم اطلاع دهید. نیوا یک ابزار آموزشی است و نمی‌تواند خدمات بحران ارائه دهد.'
      : 'بر اساس توضیحی که دادید، لازم است همین حالا با ماما، پزشک زنان یا اورژانس محل خود تماس بگیرید و منتظر نوبت بعدی نمانید. در ایران برای فوریت‌های پزشکی با ۱۱۵ و برای حمایت اجتماعی با ۱۲۳ تماس بگیرید. اگر خارج از ایران هستید، شماره اورژانس کشور خود را بگیرید. نیوا یک ابزار آموزشی است، نه خدمات تشخیصی؛ این پیام تشخیص محسوب نمی‌شود. بررسی سریع علائم نگران‌کننده همیشه مطمئن‌ترین راه است.',
  };
}

export const AI_DISCLAIMER_EN =
  'NIVA provides general educational information from curated public-health sources. It is not a diagnosis, prescription, or substitute for professional medical care. Always consult your midwife or physician about your specific situation.';
export const AI_DISCLAIMER_FA =
  'نیوا اطلاعات آموزشی عمومی را از منابع معتبر سلامت عمومی ارائه می‌کند. این محتوا تشخیص، تجویز یا جایگزین مراقبت حرفه‌ای پزشکی نیست. برای وضعیت مشخص خود همیشه با ماما یا پزشک مشورت کنید.';
