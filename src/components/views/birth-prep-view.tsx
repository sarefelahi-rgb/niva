'use client';

import { useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Baby } from 'lucide-react';

export function BirthPrepView() {
  const { t, locale } = useApp();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const planItems = locale === 'fa'
    ? ['همراه حضور در زایمان را مشخص کنم', 'روش مدیریت درد را با تیم مراقبت بررسی کنم', 'نظر خودم درباره مداخلات را یادداشت کنم', 'نوع تغذیه نوزاد را تصمیم بگیرم', 'درباره برش و بازشده (اگر لازم شد) سؤال کنم', 'نقص اصلاح نشده‌ای درباره اسکرین‌شناسی نوزاد دارم؟ از پزشک بپرسم']
    : ['Decide who will be present at the birth', 'Discuss pain management options with my care team', 'Write down my preferences about interventions', 'Decide on newborn feeding approach', 'Ask about episiotomy/tearing care if needed', 'Ask my clinician about newborn screening'];

  const bagItems = locale === 'fa'
    ? ['مدارک شناسایی و پرونده پزشکی', 'لباس راحت برای مادر و جوراب', 'شارژر موبایل و پاوربانک', 'لباس نوزاد و پتو', 'صندلی ایمنی خودرو برای بازگشت', 'لوازم بهداشتی شخصی']
    : ['ID documents and medical file', 'Comfortable clothes and socks for the mother', 'Phone charger and power bank', 'Baby clothes and blanket', 'Car seat for the ride home', 'Personal hygiene items'];

  const laborSigns = locale === 'fa'
    ? [
      'انقباضات منظم که قوی‌تر و نزدیک‌تر می‌شوند',
      'پاره شدن کیسه آب (نشت یا جریان مایع)',
      'خروج سد مهری (ترشح مخاطی خونی)',
      'کاهش شدید یا غیرعادی حرکت جنین — فوراً تماس بگیرید',
    ]
    : [
      'Regular contractions that get stronger and closer together',
      'Water breaking (leaking or gushing fluid)',
      'Bloody show (mucus plug loss)',
      'Significantly or unusually decreased fetal movement — call immediately',
    ];

  const toggle = (k: string) => setChecked((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Baby className="h-6 w-6 text-primary" />{t('birth.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('birth.sub')}</p>
      </header>

      <Accordion type="multiple" defaultValue={['plan', 'bag', 'signs']} className="space-y-3">
        <AccordionItem value="plan" className="border rounded-xl niva-card px-4">
          <AccordionTrigger className="hover:no-underline"><span className="font-semibold">{t('birth.plan')}</span></AccordionTrigger>
          <AccordionContent className="space-y-2.5 pb-4">
            {planItems.map((p, i) => (
              <Label key={i} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 min-h-11">
                <Checkbox checked={Boolean(checked[`plan${i}`])} onCheckedChange={() => toggle(`plan${i}`)} className="mt-0.5" />
                <span className="text-sm leading-relaxed">{p}</span>
              </Label>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="bag" className="border rounded-xl niva-card px-4">
          <AccordionTrigger className="hover:no-underline"><span className="font-semibold">{t('birth.bag')}</span></AccordionTrigger>
          <AccordionContent className="space-y-2.5 pb-4">
            {bagItems.map((b, i) => (
              <Label key={i} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 min-h-11">
                <Checkbox checked={Boolean(checked[`bag${i}`])} onCheckedChange={() => toggle(`bag${i}`)} className="mt-0.5" />
                <span className="text-sm leading-relaxed">{b}</span>
              </Label>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="signs" className="border rounded-xl niva-card px-4">
          <AccordionTrigger className="hover:no-underline"><span className="font-semibold">{t('birth.signs')}</span></AccordionTrigger>
          <AccordionContent className="pb-4">
            <ul className="space-y-2">
              {laborSigns.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                  <span className="grid place-items-center shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold num">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              {locale === 'fa'
                ? 'این فهرست آموزشی است. در صورت تردید، همیشه با ماما یا پزشک خود تماس بگیرید.'
                : 'This list is educational. If in doubt, always call your midwife or physician.'}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="niva-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">{t('birth.education')}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            {locale === 'fa'
              ? 'کلاس‌های آمادگی زایمان به کاهش اضطراب و بهبود تجربه زایمان کمک می‌کنند. درباره گزینه‌های مدیریت درد (تنفسی، حرکتی، دارویی و بی‌حسی اپیدورال) پیش از زایمان با تیم مراقبت گفتگو کنید.'
              : 'Childbirth education classes reduce anxiety and improve birth experience. Discuss pain management options (breathing, movement, medication, epidural) with your care team before labor.'}
          </p>
          <Badge variant="outline" className="text-[10px]">{t('status.IN_REVIEW')}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
