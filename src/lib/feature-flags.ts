import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * Wave 6.2 — feature flags with staged rollout.
 *
 * Storage: Setting key 'featureFlags'. Two value shapes are accepted when
 * reading (backward compatible with the Wave 4 seed/admin writer):
 *   legacy:  { community: true, family: true, studio: true, ar: true }
 *   current: { community: { enabled: true, rolloutPercent: 25 }, ... }
 *
 * Staged rollout: a per-flag `rolloutPercent` (0–100) is evaluated with
 * deterministic SHA-256 bucketing — SHA-256(flag + ':' + userId) → first 4
 * bytes as unsigned int % 100 < percent. Deterministic across processes and
 * restarts (no Math.random), so a user's flag state is stable.
 *
 * Caching: 30s in-memory TTL; the admin flags route calls invalidateFlagsCache()
 * after saving so changes apply immediately on that instance.
 */

export type FlagName = 'community' | 'family' | 'studio' | 'ar';

export const FLAG_NAMES: FlagName[] = ['community', 'family', 'studio', 'ar'];

export interface FlagState {
  enabled: boolean;
  rolloutPercent: number | null; // null = 100% (no staged rollout)
}

type StoredFlags = Partial<Record<FlagName, boolean | { enabled?: boolean; rolloutPercent?: number }>>;

const CACHE_TTL_MS = 30_000;
let cache: { at: number; flags: Record<FlagName, FlagState> } | null = null;

function normalize(raw: unknown): Record<FlagName, FlagState> {
  const out = {} as Record<FlagName, FlagState>;
  const stored = (raw ?? {}) as StoredFlags;
  for (const name of FLAG_NAMES) {
    const v = stored[name];
    if (typeof v === 'boolean') {
      out[name] = { enabled: v, rolloutPercent: null };
    } else if (v && typeof v === 'object') {
      const enabled = typeof v.enabled === 'boolean' ? v.enabled : true;
      const pct = typeof v.rolloutPercent === 'number' && Number.isFinite(v.rolloutPercent)
        ? Math.min(100, Math.max(0, Math.round(v.rolloutPercent)))
        : null;
      out[name] = { enabled, rolloutPercent: pct };
    } else {
      out[name] = { enabled: true, rolloutPercent: null };
    }
  }
  return out;
}

/** Reads + normalizes the Setting row with a 30s in-memory cache. */
export async function getFlags(): Promise<Record<FlagName, FlagState>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.flags;
  const row = await db.setting.findUnique({ where: { key: 'featureFlags' } });
  let parsed: unknown = {};
  if (row) {
    try {
      parsed = JSON.parse(row.value);
    } catch {
      parsed = {};
    }
  }
  const flags = normalize(parsed);
  cache = { at: Date.now(), flags };
  return flags;
}

export function invalidateFlagsCache(): void {
  cache = null;
}

/** Deterministic 0–99 bucket for a (flag, userId) pair. */
export function flagBucket(flag: string, userId: string): number {
  const h = createHash('sha256').update(`${flag}:${userId}`).digest();
  return h.readUInt32BE(0) % 100;
}

/**
 * Effective flag evaluation for a specific user. With no userId (anonymous,
 * e.g. the public flags endpoint) only the enabled bit applies.
 */
export async function isFlagEnabled(flag: FlagName, userId?: string): Promise<boolean> {
  const flags = await getFlags();
  const f = flags[flag];
  if (!f.enabled) return false;
  if (f.rolloutPercent === null || f.rolloutPercent >= 100) return true;
  if (!userId) return false; // staged flag without a bucket identity → off
  return flagBucket(flag, userId) < f.rolloutPercent;
}

/**
 * Route-top guard: returns a 403 FEATURE_DISABLED response when the flag is
 * off for this user, or null when the feature is available. Mechanical to use:
 *   const gated = await ensureFeature('community', user.id);
 *   if (gated) return gated;
 */
export async function ensureFeature(flag: FlagName, userId: string): Promise<NextResponse | null> {
  const enabled = await isFlagEnabled(flag, userId);
  if (enabled) return null;
  return NextResponse.json(
    { error: { code: 'FEATURE_DISABLED', message: 'این قابلیت در حال حاضر غیرفعال است. | This feature is currently disabled.' } },
    { status: 403 }
  );
}

/** Plain booleans for unauthenticated consumers (no per-user rollout applied). */
export async function getPublicFlags(): Promise<Record<FlagName, boolean>> {
  const flags = await getFlags();
  const out = {} as Record<FlagName, boolean>;
  for (const name of FLAG_NAMES) out[name] = flags[name].enabled;
  return out;
}
