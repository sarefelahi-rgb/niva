'use client';

import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Box, Sparkles, Lock, Languages, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function LandingView() {
  const { t, setView, user, locale, setLocale } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const go = user ? 'dashboard' : 'auth';

  return (
    <div className="min-h-screen flex flex-col niva-grad">
      {/* Top bar */}
      <header className="mx-auto w-full max-w-6xl px-4 sm:px-6 h-16 flex items-center">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary text-primary-foreground font-bold">N</span>
          <span className="font-bold text-xl tracking-tight">NIVA</span>
        </div>
        <div className="ms-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')} aria-label="language">
            <Languages className="h-4 w-4 me-1" />
            {locale === 'fa' ? 'English' : 'فارسی'}
          </Button>
          {mounted && (
            <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label={t('settings.theme')}>
              {resolvedTheme === 'dark' ? '☀️' : <Moon className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-16 pb-10 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3 w-3" />
              {t('landing.reviewBadge')}
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.15] tracking-tight">
              {t('landing.heroTitle')}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              {t('landing.heroSub')}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setView(go)} className="min-h-12 px-6 text-base" aria-label={t('landing.ctaStart')}>
                {t('landing.ctaStart')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setView('auth')} className="min-h-12 px-6 text-base">
                {t('landing.ctaDemo')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed border-s-2 border-primary/40 ps-3">
              {t('landing.disclaimer')}
            </p>
          </div>

          {/* Hero visual */}
          <div className="relative">
            <div className="aspect-[4/5] max-h-[520px] w-full overflow-hidden rounded-3xl border shadow-2xl niva-card">
              { }
              <img
                src="/hero.png"
                alt={locale === 'fa' ? 'تصویر آرامش‌بخش بارداری' : 'Calm pregnancy illustration'}
                className="h-full w-full object-cover"
              />
            </div>
            <Card className="absolute -bottom-5 start-4 end-10 niva-card shadow-lg">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-secondary/20 text-secondary-foreground shrink-0">
                  <Box className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{t('landing.f1Title')}</p>
                  <p className="text-xs text-muted-foreground truncate">{t('studio.sub')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 grid sm:grid-cols-3 gap-4" aria-label="features">
          <FeatureCard icon={<Box className="h-5 w-5" />} title={t('landing.f1Title')} body={t('landing.f1Body')} />
          <FeatureCard icon={<Sparkles className="h-5 w-5" />} title={t('landing.f2Title')} body={t('landing.f2Body')} />
          <FeatureCard icon={<Lock className="h-5 w-5" />} title={t('landing.f3Title')} body={t('landing.f3Body')} />
        </section>
      </main>

      <footer className="border-t bg-background/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-center text-xs text-muted-foreground">
          NIVA · {new Date().getFullYear()} · {t('landing.disclaimer')}
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="niva-card">
      <CardContent className="p-5 space-y-2.5">
        <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  );
}
