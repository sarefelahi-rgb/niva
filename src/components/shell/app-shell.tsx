'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp, type View } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CalendarClock, Box, Activity, Sparkles, FolderLock, Stethoscope,
  Salad, Baby, Flower2, BookHeart, Users, Crown, Settings, ShieldCheck, Bell,
  LogOut, Menu, Moon, Sun, Languages, HeartPulse, X, ChevronLeft, ChevronRight,
  ClipboardCheck, CreditCard, ShieldAlert, Trash2, BellRing, BellOff, WifiOff,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import {
  fetchPushConfig,
  getExistingSubscription,
  isPushSupported,
  registerServiceWorker,
  saveSubscriptionToServer,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-client';

interface NavItem {
  view: View;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  roles?: string[];
}

const PRIMARY_NAV: NavItem[] = [
  { view: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { view: 'timeline', icon: CalendarClock, labelKey: 'nav.timeline' },
  { view: 'studio', icon: Box, labelKey: 'nav.studio' },
  { view: 'tracking', icon: Activity, labelKey: 'nav.tracking' },
  { view: 'assistant', icon: Sparkles, labelKey: 'nav.assistant' },
];

const SECONDARY_NAV: NavItem[] = [
  { view: 'appointments', icon: Stethoscope, labelKey: 'nav.appointments' },
  { view: 'records', icon: FolderLock, labelKey: 'nav.records' },
  { view: 'wellness', icon: Salad, labelKey: 'nav.wellness' },
  { view: 'birth', icon: Baby, labelKey: 'nav.birth' },
  { view: 'postpartum', icon: Flower2, labelKey: 'nav.postpartum' },
  { view: 'safety', icon: HeartPulse, labelKey: 'nav.safety' },
  { view: 'journal', icon: BookHeart, labelKey: 'nav.journal' },
  { view: 'community', icon: Users, labelKey: 'nav.community' },
  { view: 'family', icon: Users, labelKey: 'nav.family' },
];

const ACCOUNT_NAV: NavItem[] = [
  { view: 'subscription', icon: Crown, labelKey: 'nav.subscription' },
  { view: 'settings', icon: Settings, labelKey: 'common.settings' },
];

const GOVERNANCE_NAV: NavItem[] = [
  { view: 'review', icon: ShieldCheck, labelKey: 'nav.review', roles: ['ADMIN', 'CLINICAL_REVIEWER'] },
  { view: 'admin', icon: ShieldCheck, labelKey: 'nav.admin', roles: ['ADMIN'] },
];

/** Notification type → icon (bell sheet rows + scheduled section). */
const NOTIF_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SYSTEM: Bell,
  APPOINTMENT: CalendarClock,
  REVIEW: ClipboardCheck,
  PAYMENT: CreditCard,
  SAFETY: ShieldAlert,
};

interface NotifRow { id: string; title: string; body: string; type: string; channel: string; readAt: string | null; createdAt: string }
interface ScheduledRow { id: string; title: string; type: string; scheduledFor: string }

/** Push toggle state — every transition comes from a real browser/server API. */
type PushState = 'checking' | 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, view, setView, user, logout, locale, setLocale } = useApp();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifRow[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [online, setOnline] = useState(true);
  const [pushState, setPushState] = useState<PushState>('checking');
  const [pushBusy, setPushBusy] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const { toast } = useToast();
  const publicKeyRef = useRef<string | null>(null);
  const updateToastShown = useRef(false);
  const reloadOnController = useRef(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const loadNotifs = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications');
      if (!r.ok) return;
      const data = await r.json();
      setNotifications(data.notifications ?? []);
      setUnread(data.unread ?? 0);
      setScheduled(data.scheduled ?? []);
    } catch {
      // transient — keep last known state
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // rAF keeps the fetch (and its setState) out of the synchronous effect pass.
    const id = requestAnimationFrame(() => { void loadNotifs(); });
    return () => cancelAnimationFrame(id);
  }, [user, view, loadNotifs]);

  // Offline banner — driven ONLY by real online/offline events.
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  // SW update flow — toast only when a REAL waiting worker exists behind a live controller.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onControllerChange = () => {
      if (reloadOnController.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
      })
      .catch(() => undefined);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  const applyUpdate = useCallback(() => {
    reloadOnController.current = true;
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
        // Safety net: if the new controller never takes over, reload anyway.
        setTimeout(() => window.location.reload(), 3000);
      })
      .catch(() => window.location.reload());
  }, []);

  useEffect(() => {
    if (!updateReady || updateToastShown.current) return;
    updateToastShown.current = true;
    toast({
      title: t('pwa.updated'),
      action: (
        <ToastAction altText={locale === 'fa' ? 'تازه‌سازی' : 'Refresh'} onClick={applyUpdate}>
          {locale === 'fa' ? 'تازه‌سازی' : 'Refresh'}
        </ToastAction>
      ),
    });
  }, [updateReady, toast, t, locale, applyUpdate]);

  const visible = (items: NavItem[]) => items.filter((i) => !i.roles || (user && i.roles.includes(user.role)));
  const allNav = [...PRIMARY_NAV, ...SECONDARY_NAV, ...ACCOUNT_NAV, ...GOVERNANCE_NAV];
  const current = allNav.find((n) => n.view === view);

  const toggleTheme = () => {
    const next = (resolvedTheme ?? theme) === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
    setUnread(0);
    setNotifications((ns) => ns.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  };

  const markOneRead = async (id: string) => {
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setNotifications((ns) => ns.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - (notifications.find((n) => n.id === id && !n.readAt) ? 1 : 0)));
  };

  const deleteOne = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    setNotifications((ns) => ns.filter((n) => n.id !== id));
    setScheduled((ss) => ss.filter((s) => s.id !== id));
    if (target && !target.readAt) setUnread((u) => Math.max(0, u - 1));
  };

  // ── Web push state — read from real APIs whenever the bell sheet opens ─────
  const evaluatePushState = useCallback(async () => {
    if (!isPushSupported()) { setPushState('unsupported'); return; }
    try {
      const cfg = await fetchPushConfig();
      if (!cfg.configured || !cfg.publicKey) { setPushState('unconfigured'); return; }
      publicKeyRef.current = cfg.publicKey;
      const existing = await getExistingSubscription();
      if (existing) { setPushState('on'); return; }
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setPushState('denied');
        return;
      }
      setPushState('off');
    } catch {
      setPushState('unconfigured');
    }
  }, []);

  const enablePush = async () => {
    setPushBusy(true);
    try {
      const cfg = publicKeyRef.current ? { configured: true, publicKey: publicKeyRef.current } : await fetchPushConfig();
      if (!cfg.configured || !cfg.publicKey) { setPushState('unconfigured'); return; }
      publicKeyRef.current = cfg.publicKey;
      if (typeof Notification === 'undefined') { setPushState('unsupported'); return; }
      const permission = await Notification.requestPermission();
      if (permission === 'denied') { setPushState('denied'); return; }
      await registerServiceWorker();
      const sub = await subscribeToPush(cfg.publicKey);
      if (!sub) { setPushState('off'); return; }
      const saved = await saveSubscriptionToServer(sub, locale);
      if (!saved) {
        await sub.unsubscribe().catch(() => undefined); // honest state: server refused → not subscribed
        setPushState('off');
        return;
      }
      setPushState('on');
    } catch {
      setPushState('off');
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    setPushBusy(true);
    try {
      const sub = await getExistingSubscription();
      if (sub) await unsubscribeFromPush(sub);
      setPushState('off');
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Offline banner — real navigator.onLine state via online/offline events. */}
      <div aria-live="polite">
        {!online && (
          <div role="status" className="bg-amber-500/15 border-b border-amber-500/30 px-3 sm:px-6 py-2 flex items-start gap-2.5">
            <WifiOff className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{t('pwa.offlineTitle')}</p>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/90">{t('pwa.offlineBody')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 niva-card border-b">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 h-14 flex items-center gap-2">
          {/* Mobile menu */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('nav.more')}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={locale === 'fa' ? 'right' : 'left'} className="w-72 p-0">
              <SheetHeader className="p-4 pb-2">
                <SheetTitle className="text-primary">NIVA</SheetTitle>
              </SheetHeader>
              <nav className="px-2 pb-6 max-h-[calc(100vh-6rem)] overflow-y-auto" aria-label={t('nav.more')}>
                {[...visible(PRIMARY_NAV), ...visible(SECONDARY_NAV), ...visible(ACCOUNT_NAV), ...visible(GOVERNANCE_NAV)].map((item) => (
                  <button
                    key={item.view}
                    onClick={() => { setView(item.view); setMoreOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors min-h-11',
                      view === item.view ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/80 hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {t(item.labelKey)}
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Brand */}
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/60 transition-colors"
            aria-label="NIVA dashboard"
          >
            <span className="grid place-items-center h-8 w-8 rounded-xl bg-primary text-primary-foreground font-bold text-sm">N</span>
            <span className="font-bold tracking-tight text-lg hidden sm:block">NIVA</span>
          </button>

          {current && <Badge variant="secondary" className="hidden md:inline-flex">{t(current.labelKey)}</Badge>}

          <div className="ms-auto flex items-center gap-1">
            {/* Language */}
            <Button
              variant="ghost" size="sm" onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')}
              className="gap-1.5 min-h-9" aria-label={t('settings.language')}
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-semibold">{locale === 'fa' ? 'EN' : 'فا'}</span>
            </Button>
            {/* Theme */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t('settings.theme')} className="min-h-11 min-w-11">
              {mounted && (resolvedTheme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />)}
            </Button>
            {/* Notifications */}
            <Sheet open={notifOpen} onOpenChange={(o) => { setNotifOpen(o); if (o) { void loadNotifs(); void evaluatePushState(); } }}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative min-h-11 min-w-11" aria-label={t('notifs.title')}>
                  <Bell className="h-4.5 w-4.5" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 h-4 min-w-4 rounded-full bg-primary text-primary-foreground text-[10px] grid place-items-center px-1">{unread}</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side={locale === 'fa' ? 'left' : 'right'} className="w-80 p-0">
                <div className="flex items-center justify-between p-4 border-b">
                  {/* SheetTitle (not a bare h2): Radix requires a Dialog-level title for a11y */}
                  <SheetTitle className="font-semibold">{t('notifs.title')}</SheetTitle>
                  <Button variant="ghost" size="sm" onClick={markAllRead}>{t('notifs.markAll')}</Button>
                </div>
                <div className="p-2 max-h-[70vh] overflow-y-auto">
                  {notifications.length === 0 && <p className="text-sm text-muted-foreground p-4">{t('notifs.empty')}</p>}
                  {notifications.map((n) => {
                    const TypeIcon = NOTIF_TYPE_ICONS[n.type] ?? Bell;
                    return (
                      <div key={n.id} className={cn('rounded-lg p-3 mb-1 flex gap-2.5', !n.readAt && 'bg-primary/5')}>
                        <span className="grid place-items-center h-8 w-8 rounded-lg bg-muted shrink-0" aria-hidden>
                          <TypeIcon className="h-4 w-4 text-primary" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="text-sm font-medium min-w-0">{n.title}</p>
                            {n.channel === 'EMAIL' && (
                              <Badge variant="outline" className="text-[10px] shrink-0">{t('notifs.channel.EMAIL')}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5" dir="auto">{n.body}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            {!n.readAt && (
                              <Button variant="ghost" size="sm" className="min-h-11 h-11 px-2 text-xs" onClick={() => void markOneRead(n.id)}>
                                {t('notifs.markOne')}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-11 min-w-11 w-11 h-11 px-0 text-muted-foreground hover:text-destructive"
                              onClick={() => void deleteOne(n.id)}
                              aria-label={t('notifs.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-t mt-2 pt-3 px-1">
                    <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-1">{t('notifs.scheduled')}</h3>
                    {scheduled.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">{t('notifs.scheduledEmpty')}</p>
                    ) : (
                      scheduled.map((s) => (
                        <div key={s.id} className="rounded-lg p-2.5 mb-1">
                          <p className="text-sm font-medium" dir="auto">{s.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('notifs.dueAt')}: <span className="num">{new Date(s.scheduledFor).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
                            <span className="mx-1.5" aria-hidden>·</span>
                            <span>{t(`notifs.type.${s.type}`)}</span>
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Web push toggle — reflects REAL permission/subscription state only. */}
                  <div className="border-t mt-2 pt-3 px-1">
                    {pushState === 'on' && (
                      <button
                        onClick={() => void disablePush()}
                        disabled={pushBusy}
                        className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-sm min-h-11 hover:bg-muted transition-colors text-start disabled:opacity-50"
                      >
                        <BellRing className="h-4 w-4 text-primary shrink-0" aria-hidden />
                        <span className="flex-1">{t('pwa.pushEnabled')}</span>
                        <span className="text-xs text-muted-foreground">{locale === 'fa' ? 'خاموش کردن' : 'Turn off'}</span>
                      </button>
                    )}
                    {pushState === 'off' && (
                      <button
                        onClick={() => void enablePush()}
                        disabled={pushBusy}
                        className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-sm min-h-11 hover:bg-muted transition-colors text-start disabled:opacity-50"
                      >
                        <Bell className="h-4 w-4 text-primary shrink-0" aria-hidden />
                        <span className="flex-1">{t('pwa.pushEnable')}</span>
                      </button>
                    )}
                    {(pushState === 'unsupported' || pushState === 'denied' || pushState === 'unconfigured') && (
                      <div className="flex items-start gap-2.5 rounded-lg px-2 py-2.5 text-sm text-muted-foreground">
                        <BellOff className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                        <span className="flex-1">
                          {pushState === 'unsupported' && t('pwa.pushUnsupported')}
                          {pushState === 'denied' && t('pwa.pushDenied')}
                          {pushState === 'unconfigured' && (
                            <>
                              {t('pwa.pushHint')}
                              <span className="block text-xs mt-0.5">
                                {locale === 'fa' ? 'فعلاً غیرفعال — کلید سرور تنظیم نشده' : 'Unavailable — server push key not configured yet'}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            {/* User */}
            <Sheet open={false} onOpenChange={() => undefined}>
              <Button variant="ghost" onClick={() => logout()} className="gap-1.5 min-h-9 hidden sm:inline-flex" aria-label={t('auth.signOut')}>
                <LogOut className="h-4 w-4" />
                <span className="text-xs">{t('auth.signOut')}</span>
              </Button>
            </Sheet>
            <Button variant="ghost" onClick={() => logout()} className="sm:hidden" size="icon" aria-label={t('auth.signOut')}>
              <LogOut className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full mx-auto max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 py-6 pe-4">
          <nav className="space-y-6" aria-label="Primary">
            <NavGroup items={visible(PRIMARY_NAV)} />
            <NavGroup items={visible(SECONDARY_NAV)} />
            <NavGroup items={visible(ACCOUNT_NAV)} />
            {visible(GOVERNANCE_NAV).length > 0 && <NavGroup items={visible(GOVERNANCE_NAV)} />}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 py-4 sm:py-6 px-3 sm:px-0 pb-24 md:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 niva-card border-t pb-[env(safe-area-inset-bottom)]" aria-label="Bottom navigation">
        <div className="grid grid-cols-5 h-16">
          {PRIMARY_NAV.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={cn('flex flex-col items-center justify-center gap-1 text-[10px] min-h-11 transition-colors',
                view === item.view ? 'text-primary font-semibold' : 'text-muted-foreground')}
              aria-current={view === item.view ? 'page' : undefined}
            >
              <item.icon className="h-5 w-5" />
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </nav>

      {/* Sticky footer */}
      <footer className="mt-auto border-t bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-2 justify-between">
          <p className="text-xs text-muted-foreground text-center sm:text-start">
            {t('landing.disclaimer')}
          </p>
          <p className="text-xs text-muted-foreground shrink-0">
            NIVA · {new Date().getFullYear()} · {t('landing.reviewBadge')}
          </p>
        </div>
      </footer>
    </div>
  );
}

function NavGroup({ items }: { items: NavItem[] }) {
  const { t, view, setView, locale } = useApp();
  if (items.length === 0) return null;
  const Direction = locale === 'fa' ? ChevronLeft : ChevronRight;
  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <button
          key={item.view}
          onClick={() => setView(item.view)}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors min-h-11',
            view === item.view ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/75 hover:bg-muted hover:text-foreground'
          )}
          aria-current={view === item.view ? 'page' : undefined}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{t(item.labelKey)}</span>
          {view === item.view && <span className="ms-auto"><Direction className="h-3.5 w-3.5 text-primary/60" /></span>}
        </button>
      ))}
    </div>
  );
}

/** Fullscreen shell used by the 3D studio (immersive, no nav chrome). */
export function ImmersiveShell({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  const { locale } = useApp();
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" role="dialog" aria-label={title}>
      <div className="flex items-center gap-3 px-4 h-14 niva-card border-b">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Exit fullscreen">
          <X className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold">{title}</h2>
        <Badge variant="secondary" className="ms-auto hidden sm:inline-flex">{locale === 'fa' ? 'نمایش آموزشی' : 'Educational visualization'}</Badge>
      </div>
      {children}
    </div>
  );
}
