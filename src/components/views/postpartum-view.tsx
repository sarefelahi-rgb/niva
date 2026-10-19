'use client';

import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flower2, TriangleAlert, HeartCrack } from 'lucide-react';

export function PostpartumView() {
  const { t, locale, pregnancy, setView } = useApp();

  const recovery = locale === 'fa'
    ? [
      'ترشحات واژینال (لوکیا) طی چند هفته کم و روشن‌تر می‌شود؛ خونریزی شدید نیازمند بررسی فوری است.',
      'درد و انقباض رحم طبیعی است اما درد شدید را گزارش کنید.',
      'سینه‌ها ممکن است پر و حساس شوند؛ علائم گرفتگی یا قرمزی را پیگیری کنید.',
      'خستگی طبیعی است؛ هر زمان نوزاد می‌خوابد شما هم استراحت کنید.',
    ]
    : [
      'Vaginal discharge (lochia) lessens and lightens over weeks; heavy bleeding needs urgent review.',
      'Uterine cramping is expected, but severe pain should be reported.',
      'Breasts may become full and tender; watch for signs of engorgement or redness.',
      'Fatigue is normal; rest whenever your newborn sleeps.',
    ];

  const newborn = locale === 'fa'
    ? [
      'تغذیه مکرر (هر ۲–۳ ساعت) و شمارش پوشک‌های خیس به‌عنوان نشانگر تغذیه کافی.',
      'خواب نوزاد روی سطحی سخت و صاف، در اتاق شما و بدون بالشت یا پتو نرم.',
      'زردی پوست یا چشم در ۲۴ ساعت اول یا تشدید آن را فوراً گزارش کنید.',
      'تب نوزاد (۳۸ درجه یا بیشتر) همیشه اورژانس است.',
    ]
    : [
      'Frequent feeding (every 2–3 hours) and counting wet diapers as adequate-intake markers.',
      'Baby sleeps on a firm, flat surface in your room, without pillows or soft bedding.',
      'Report jaundice in the first 24 hours, or any worsening yellowing, immediately.',
      'Any newborn fever (38°C or higher) is always an emergency.',
    ];

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Flower2 className="h-6 w-6 text-primary" />{t('post.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('post.sub')}</p>
      </header>

      <Alert className="border-destructive/40 bg-destructive/5">
        <HeartCrack className="h-4 w-4 text-destructive" />
        <AlertTitle className="text-destructive font-semibold">{t('post.mood')}</AlertTitle>
        <AlertDescription className="text-sm leading-relaxed">{t('post.alert')}</AlertDescription>
      </Alert>

      <Alert className="border-warning/40 bg-warning/5">
        <TriangleAlert className="h-4 w-4" />
        <AlertDescription className="text-sm leading-relaxed">{t('post.warning')}</AlertDescription>
      </Alert>

      {!pregnancy || pregnancy.status !== 'POSTPARTUM' ? (
        <Card className="niva-card">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm leading-relaxed">
              {locale === 'fa'
                ? 'این بخش برای دوره پس از زایمان آماده شده است. پس از تولد، از بخش داشبورد وضعیت بارداری را به «پس از زایمان» تغییر دهید تا محتوای این صفحه فعال شود.'
                : 'This section is ready for your postpartum period. After birth, transition your pregnancy status to “Postpartum” from the dashboard to activate this page\u2019s tools.'}
            </p>
            <Button variant="outline" onClick={() => setView('timeline')} className="min-h-11">{t('nav.timeline')}</Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="niva-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('post.recovery')}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm leading-relaxed">
              {recovery.map((x, i) => <li key={i} className="flex gap-2"><span className="text-primary mt-0.5">•</span>{x}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="niva-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('post.newborn')}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm leading-relaxed">
              {newborn.map((x, i) => <li key={i} className="flex gap-2"><span className="text-primary mt-0.5">•</span>{x}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="niva-card">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{t('status.IN_REVIEW')}</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {locale === 'fa'
              ? 'محتوای این صفحه آموزشی است و «ابزار غربالگری تشخیصی» نیست. برای ارزیابی افسردگی پس از زایمان با متخصص سلامت روان یا پزشک خود صحبت کنید.'
              : 'This page\u2019s content is educational and is not a diagnostic screening tool. For postpartum depression assessment, speak with a mental-health professional or your physician.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
