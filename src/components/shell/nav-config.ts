import {
  LayoutDashboard, CalendarClock, Box, Activity, Sparkles, FolderLock, Stethoscope,
  Salad, Baby, Flower2, BookHeart, Users, Crown, Settings, ShieldCheck,
  HeartPulse, Hospital, CalendarHeart, UtensilsCrossed, Microscope,
} from 'lucide-react';
import type { View } from '@/store/app';

export interface NavItem {
  view: View;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  roles?: string[];
  /** Index into TILE_VARS for the block-menu pastel color; omitted → cycle. */
  tile?: number;
}

/** Primary daily tools (bottom nav on mobile). */
export const PRIMARY_NAV: NavItem[] = [
  { view: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', tile: 1 },
  { view: 'timeline', icon: CalendarClock, labelKey: 'nav.timeline', tile: 2 },
  { view: 'studio', icon: Box, labelKey: 'nav.studio', tile: 4 },
  { view: 'tracking', icon: Activity, labelKey: 'nav.tracking', tile: 5 },
  { view: 'assistant', icon: Sparkles, labelKey: 'nav.assistant', tile: 3 },
];

/** Care & life sections. */
export const SECONDARY_NAV: NavItem[] = [
  { view: 'fertility', icon: CalendarHeart, labelKey: 'nav.fertility', tile: 3 },
  { view: 'appointments', icon: Stethoscope, labelKey: 'nav.appointments', tile: 6 },
  { view: 'doctors', icon: Hospital, labelKey: 'nav.doctors', tile: 7 },
  { view: 'records', icon: FolderLock, labelKey: 'nav.records', tile: 8 },
  { view: 'nutrition', icon: UtensilsCrossed, labelKey: 'nav.nutrition', tile: 2 },
  { view: 'screenings', icon: Microscope, labelKey: 'nav.screenings', tile: 5 },
  { view: 'wellness', icon: Salad, labelKey: 'nav.wellness', tile: 2 },
  { view: 'birth', icon: Baby, labelKey: 'nav.birth', tile: 1 },
  { view: 'postpartum', icon: Flower2, labelKey: 'nav.postpartum', tile: 4 },
  { view: 'safety', icon: HeartPulse, labelKey: 'nav.safety', tile: 5 },
  { view: 'journal', icon: BookHeart, labelKey: 'nav.journal', tile: 6 },
  { view: 'community', icon: Users, labelKey: 'nav.community', tile: 7 },
  { view: 'family', icon: Users, labelKey: 'nav.family', tile: 8 },
];

/** Account & plan. */
export const ACCOUNT_NAV: NavItem[] = [
  { view: 'doctor', icon: Stethoscope, labelKey: 'nav.doctorPanel', roles: ['DOCTOR'], tile: 1 },
  { view: 'subscription', icon: Crown, labelKey: 'nav.subscription', tile: 3 },
  { view: 'settings', icon: Settings, labelKey: 'common.settings', tile: 2 },
];

/** Governance (role-gated). */
export const GOVERNANCE_NAV: NavItem[] = [
  { view: 'review', icon: ShieldCheck, labelKey: 'nav.review', roles: ['ADMIN', 'CLINICAL_REVIEWER'], tile: 4 },
  { view: 'admin', icon: ShieldCheck, labelKey: 'nav.admin', roles: ['ADMIN'], tile: 8 },
];

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV, ...ACCOUNT_NAV, ...GOVERNANCE_NAV];

/**
 * Pastel tile palette (defined as CSS vars in globals.css, light + dark).
 * Each tile: two gradient stops + a deep readable foreground.
 */
export const TILE_COUNT = 8;

export function tileStyle(tile: number): React.CSSProperties {
  const n = ((tile - 1) % TILE_COUNT) + 1;
  return {
    backgroundImage: `linear-gradient(140deg, var(--tile-${n}-bg), var(--tile-${n}-bg2))`,
    color: `var(--tile-${n}-fg)`,
  } as React.CSSProperties;
}

/** Role filter shared by every nav surface. */
export function visibleNav(items: NavItem[], userRole?: string): NavItem[] {
  return items.filter((i) => !i.roles || (userRole ? i.roles.includes(userRole) : false));
}
