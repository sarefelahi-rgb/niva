import type { User } from '@prisma/client';

/**
 * NIVA Wave 6.2 — role spectrum source of truth.
 *
 * The staff ladder (lowest → highest):
 *   CLINICAL_REVIEWER → MODERATOR → SUPPORT → FINANCE → EDITOR → ADMIN → SUPER_ADMIN
 *
 * Design rules (backward compatibility is a hard requirement):
 *  - `USER` remains the default role for every account and is NOT a staff role;
 *    routes guarded with `[]` keep admitting any authenticated user unchanged.
 *  - `ADMIN` keeps near-full access exactly as before Wave 6.2 — every staff
 *    capability EXCEPT `roles.manage` (role assignment is SUPER_ADMIN-only).
 *  - `SUPER_ADMIN` passes every staff check and additionally holds
 *    `roles.manage` + `super`.
 *  - Existing role arrays on routes remain literal allow-lists; hasRole only
 *    ADDS the two hierarchy shortcuts (SUPER_ADMIN passes staff checks,
 *    ADMIN passes staff checks except SUPER_ADMIN-only ones). It never
 *    widens access for USER-level routes.
 */

export type StaffRole =
  | 'CLINICAL_REVIEWER'
  | 'MODERATOR'
  | 'SUPPORT'
  | 'FINANCE'
  | 'EDITOR'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export const STAFF_ROLES: StaffRole[] = [
  'CLINICAL_REVIEWER',
  'MODERATOR',
  'SUPPORT',
  'FINANCE',
  'EDITOR',
  'ADMIN',
  'SUPER_ADMIN',
];

/** Every legal value of User.role, including the non-staff default. */
export const ALL_ROLES = ['USER', ...STAFF_ROLES] as const;

/**
 * Capability registry — the vocabulary used by route-level decisions.
 * ADMIN holds everything except the two SUPER_ADMIN-only capabilities;
 * specialists hold exactly their domain.
 */
export const ROLE_CAPABILITIES: Record<StaffRole, string[]> = {
  CLINICAL_REVIEWER: ['review.clinical'],
  MODERATOR: ['moderation'],
  SUPPORT: ['tickets.read.all', 'tickets.respond'],
  FINANCE: ['finance.read', 'finance.refund'],
  EDITOR: ['content.edit'],
  ADMIN: [
    'users.read',
    'users.deactivate',
    'finance.read',
    'finance.refund',
    'moderation',
    'review.clinical',
    'tickets.read.all',
    'tickets.respond',
    'incidents',
    'flags',
    'platform.read',
    'content.edit',
    'audit.read',
  ],
  // SUPER_ADMIN = ADMIN + the two exclusive capabilities (listed explicitly so
  // the registry stays greppable as the single source of truth).
  SUPER_ADMIN: [
    'users.read',
    'users.deactivate',
    'finance.read',
    'finance.refund',
    'moderation',
    'review.clinical',
    'tickets.read.all',
    'tickets.respond',
    'incidents',
    'flags',
    'platform.read',
    'content.edit',
    'audit.read',
    'roles.manage',
    'super',
  ],
};

export function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as string[]).includes(role);
}

/** Capability check used INSIDE handlers (withUser remains allow-list based). */
export function can(user: Pick<User, 'role'>, capability: string): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  const caps = ROLE_CAPABILITIES[user.role as StaffRole];
  return Array.isArray(caps) && caps.includes(capability);
}

/**
 * Route-guard check (used by withUser). Semantics:
 *  - empty roles array  → any authenticated user (unchanged USER-level behavior);
 *  - exact membership   → unchanged for USER and for every listed role;
 *  - SUPER_ADMIN        → passes any non-empty staff check;
 *  - ADMIN              → passes any non-empty staff check EXCEPT a
 *                         SUPER_ADMIN-only guard (['SUPER_ADMIN']).
 */
export function hasRole(user: Pick<User, 'role'>, roles: string[]): boolean {
  if (roles.length === 0) return true;
  if (roles.includes(user.role)) return true;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'ADMIN') return !(roles.length === 1 && roles[0] === 'SUPER_ADMIN');
  return false;
}

/**
 * assertRoles-style helper for handlers that bypass withUser (e.g. manual
 * session checks) — mirrors withUser's contract: returns the user or null.
 */
export function assertRoles(
  user: Pick<User, 'role'> | null | undefined,
  roles: string[]
): boolean {
  if (!user) return false;
  return hasRole(user, roles);
}
