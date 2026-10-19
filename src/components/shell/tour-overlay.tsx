'use client';

import { useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const STEPS = [
  { titleKey: 'tour.welcomeTitle', bodyKey: 'tour.welcomeBody', emoji: false },
  { titleKey: 'tour.s1Title', bodyKey: 'tour.s1Body' },
  { titleKey: 'tour.s2Title', bodyKey: 'tour.s2Body' },
  { titleKey: 'tour.s3Title', bodyKey: 'tour.s3Body' },
  { titleKey: 'tour.s4Title', bodyKey: 'tour.s4Body' },
];

export function TourOverlay() {
  const { t, tourOpen, closeTour, tourDone, setView, user } = useApp();
  const [step, setStep] = useState(0);
  if (!user || tourDone || !tourOpen) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) closeTour(); }}>
      <DialogContent className="max-w-md" aria-describedby="tour-desc">
        <DialogHeader>
          <DialogTitle className="text-xl">{t(s.titleKey)}</DialogTitle>
          <DialogDescription id="tour-desc" className="text-base leading-relaxed">{t(s.bodyKey)}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5" role="group" aria-label={t('tour.progress')}>
          {STEPS.map((_, i) => (
            <span key={i} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted')} />
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => closeTour()}>{t('common.close')}</Button>
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>{t('common.back')}</Button>}
          <Button
            onClick={() => {
              if (last) {
                closeTour();
                setView('dashboard');
              } else {
                setStep(step + 1);
              }
            }}
          >
            {last ? t('common.start') : t('common.next')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Exposed so Settings can restart the tour. */
export function useTour() {
  const { openTour, tourDone } = useApp();
  return { start: openTour, done: tourDone };
}
