import { db } from '@/lib/db';
import { json } from '@/lib/api';
import { getPublicFlags } from '@/lib/feature-flags';

/**
 * Wave 6.2 — unauthenticated public feature flags. Lets the client shell hide
 * nav entries for disabled features WITHOUT a user session (honest base
 * state; per-user staged rollout is evaluated server-side only). Returning
 * plain booleans only — no internal rollout percentages leak here.
 */
export async function GET() {
  const flags = await getPublicFlags();
  return json({ flags });
}
