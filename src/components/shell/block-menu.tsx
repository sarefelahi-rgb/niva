'use client';

import { useApp } from '@/store/app';
import { cn } from '@/lib/utils';
import { ALL_NAV, tileStyle, visibleNav } from './nav-config';

/**
 * Block menu — the NIVA navigation as a grid of soft pastel tiles.
 * Replaces the old sidebar: bright, playful and motherly, with a colored
 * tile per section. Used on the dashboard and inside the header menu sheet.
 */
export function BlockMenu({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { t, view, setView, user } = useApp();
  const items = visibleNav(ALL_NAV, user?.role);

  return (
    <nav className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3', className)} aria-label={t('nav.menu')}>
      {items.map((item) => {
        const active = view === item.view;
        const Icon = item.icon;
        return (
          <button
            key={item.view}
            onClick={() => {
              setView(item.view);
              onNavigate?.();
            }}
            aria-current={active ? 'page' : undefined}
            style={tileStyle(item.tile ?? 1)}
            className={cn(
              'group relative flex flex-col items-start gap-3 rounded-3xl p-4 min-h-[104px] text-start shadow-sm',
              'transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
              active && 'ring-2 ring-white/80 dark:ring-white/30 shadow-md'
            )}
          >
            <span className="grid place-items-center h-10 w-10 rounded-2xl bg-white/60 dark:bg-white/10 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-bold text-sm leading-snug">{t(item.labelKey)}</span>
            {active && (
              <span className="absolute top-3 end-3 grid place-items-center h-5 w-5 rounded-full bg-white/70 dark:bg-white/25">
                <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
