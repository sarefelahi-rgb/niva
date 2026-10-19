'use client';

import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { HeartPulse, Phone } from 'lucide-react';

const SIGNS_EN = [
  'Vaginal bleeding or fluid leaking from the vagina',
  'Severe or persistent abdominal or pelvic pain',
  'Severe headache with blurred vision, flashing spots, or sudden swelling of face and hands',
  'Fever of 38°C (100.4°F) or higher',
  'Regular, painful contractions or a strong feeling the baby is coming early',
  'A clear decrease in your baby\u2019s movements after 24 weeks',
  'Seizure, chest pain, or difficulty breathing',
  'Repeated vomiting with inability to keep fluids down',
  'Dizziness or fainting that does not pass',
];
const SIGNS_FA = [
  'خونریزی واژینال یا نشت مایع از واژن',
  'درد شدید یا مداوم شکم یا لگن',
  'سردرد شدید همراه با تاری دید، جرقات نور یا تورم ناگهانی صورت و دست‌ها',
  'تب ۳۸ درجه یا بیشتر',
  'انقباضات منظم و دردناک یا حس قوی زایمان زودرس',
  'کاهش محسوس حرکات جنین پس از هفته ۲۴',
  'تشنج، درد قفسه سینه یا مشکل تنفس',
  'استفراغ مکرر همراه با ناتوانی در نگه داشتن مایعات',
  'سرگیجه یا غش که برطرف نمی‌شود',
];

export function SafetyView() {
  const { t, locale } = useApp();
  const signs = locale === 'fa' ? SIGNS_FA : SIGNS_EN;
  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold">{t('safety.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('safety.sub')}</p>
      </header>

      <Alert className="border-destructive/40 bg-destructive/10">
        <Phone className="h-4 w-4 text-destructive" />
        <AlertTitle className="text-destructive font-bold num">{t('safety.iran')}</AlertTitle>
        <AlertDescription className="text-sm num">{t('safety.intl')}</AlertDescription>
      </Alert>

      <Card className="niva-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><HeartPulse className="h-4 w-4 text-destructive" />{t('safety.list')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {signs.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="grid place-items-center shrink-0 h-6 w-6 rounded-full bg-destructive/10 text-destructive text-xs font-bold num">{i + 1}</span>
                {s}
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {locale === 'fa'
              ? 'این فهرست آموزشی است و همه موارد را پوشش نمی‌دهد. اگر احساس کردید چیزی نادرست است، با پزشک تماس بگیرید. نیوا هرگز تشخیص نمی‌دهد و جایگزین مراقبت حرفه‌ای نیست.'
              : 'This list is educational and not exhaustive. If something feels wrong, contact your clinician. NIVA never diagnoses and is not a substitute for professional care.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
