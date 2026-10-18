'use client';

import { useEffect } from 'react';
import { useApp } from '@/store/app';
import { AppShell } from '@/components/shell/app-shell';
import { TourOverlay } from '@/components/shell/tour-overlay';
import { LandingView } from '@/components/views/landing-view';
import { AuthView } from '@/components/views/auth-view';
import { OnboardingView } from '@/components/views/onboarding-view';
import { DashboardView } from '@/components/views/dashboard-view';
import { TimelineView } from '@/components/views/timeline-view';
import { TrackingView } from '@/components/views/tracking-view';
import { AssistantView } from '@/components/views/assistant-view';
import { RecordsView } from '@/components/views/records-view';
import { AppointmentsView } from '@/components/views/appointments-view';
import { NutritionView } from '@/components/views/nutrition-view';
import { BirthPrepView } from '@/components/views/birth-prep-view';
import { PostpartumView } from '@/components/views/postpartum-view';
import { FamilyView } from '@/components/views/family-view';
import { CommunityView } from '@/components/views/community-view';
import { JournalView } from '@/components/views/journal-view';
import { SubscriptionView } from '@/components/views/subscription-view';
import { SettingsView } from '@/components/views/settings-view';
import { AdminView } from '@/components/views/admin-view';
import { ReviewView } from '@/components/views/review-view';
import { SafetyView } from '@/components/views/safety-view';
import { StudioView } from '@/components/studio/fetal-studio';
import { ImmersiveShell } from '@/components/shell/app-shell';

function Views() {
  const { view, user, pregnancy, t, setView } = useApp();

  if (!user) {
    return view === 'auth' ? <AuthView /> : <LandingView />;
  }

  const body = (() => {
    switch (view) {
      case 'onboarding': return <OnboardingView />;
      case 'dashboard': return <DashboardView />;
      case 'timeline': return <TimelineView />;
      case 'tracking': return <TrackingView />;
      case 'assistant': return <AssistantView />;
      case 'records': return <RecordsView />;
      case 'appointments': return <AppointmentsView />;
      case 'nutrition': return <NutritionView />;
      case 'birth': return <BirthPrepView />;
      case 'postpartum': return <PostpartumView />;
      case 'family': return <FamilyView />;
      case 'community': return <CommunityView />;
      case 'journal': return <JournalView />;
      case 'subscription': return <SubscriptionView />;
      case 'settings': return <SettingsView />;
      case 'admin': return user.role === 'ADMIN' ? <AdminView /> : <DashboardView />;
      case 'review': return user.role === 'ADMIN' || user.role === 'CLINICAL_REVIEWER' ? <ReviewView /> : <DashboardView />;
      case 'safety': return <SafetyView />;
      case 'studio': return (
        <ImmersiveShell title={t('studio.title')} onClose={() => setView(pregnancy ? 'dashboard' : 'onboarding')}>
          <StudioView fullscreen />
        </ImmersiveShell>
      );
      default: return <DashboardView />;
    }
  })();

  // Studio uses an immersive fullscreen shell; everything else uses the app shell.
  if (view === 'studio') return <>{body}<TourOverlay /></>;

  return (
    <AppShell>
      {!pregnancy && !['onboarding'].includes(view) && <PregnancyGateBanner />}
      {body}
      <TourOverlay />
    </AppShell>
  );
}

function PregnancyGateBanner() {
  const { t, setView } = useApp();
  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex flex-wrap items-center gap-2">
      <p className="text-sm flex-1">{t('onboarding.title')} — {t('onboarding.intro')}</p>
      <button onClick={() => setView('onboarding')} className="rounded-lg bg-primary text-primary-foreground px-3.5 py-2 text-sm min-h-11">
        {t('common.start')}
      </button>
    </div>
  );
}

export default function Home() {
  const { refresh, view, user, pregnancy, openTour, tourDone } = useApp();

  useEffect(() => {
    refresh();
    // PWA service worker registration (network-first, shell-cache fallback)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
     
  }, []);

  // Auto-open the tour once, after first successful load into the app.
  useEffect(() => {
    if (user && pregnancy && !tourDone && view === 'dashboard') {
      const id = setTimeout(() => openTour(), 600);
      return () => clearTimeout(id);
    }
     
  }, [user, pregnancy, tourDone, view]);

  return <Views />;
}
