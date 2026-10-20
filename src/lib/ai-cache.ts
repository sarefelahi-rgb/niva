/**
 * NIVA safe-content answer cache (backlog 3.2).
 *
 * In-memory LRU (max 500 entries, TTL 24h). Key binds the normalized question
 * to the answer locale, the pregnancy-week bucket and the KB version, so a KB
 * revision or a clinically meaningful week change produces a different key.
 *
 * Only NORMAL-safety, retrieval-grounded, disclaimer-bearing answers are ever
 * cached — CAUTION/EMERGENCY/injection-flagged/unavailable answers are never
 * cached (enforced here AND at the call site for defence-in-depth).
 *
 * The cache is answer-level only: callers still persist chat messages and still
 * log an AIUsageLog row (cacheHit=true) for every served answer.
 */

import { createHash } from 'crypto';
import { KB_VERSION } from '@/data/kb-v2';
import { AI_DISCLAIMER_EN, AI_DISCLAIMER_FA } from '@/lib/safety';
import type { GroundedAnswer } from '@/lib/rag';

const MAX_ENTRIES = 500;
const TTL_MS = 24 * 3_600_000;

interface CacheEntry {
  answer: GroundedAnswer;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

/** Lowercase, collapse whitespace, strip punctuation and ZWNJ/RTL marks. */
export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCacheKey(question: string, lang: 'fa' | 'en', weekBucket: string | undefined): string {
  const normalized = normalizeQuestion(question);
  return createHash('sha256')
    .update(`${normalized}|${lang}|${weekBucket ?? ''}|${KB_VERSION}`)
    .digest('hex');
}

export function cacheEnabled(): boolean {
  return process.env.NIVA_AI_CACHE !== 'false';
}

/** Returns the cached answer, refreshing LRU recency; null on miss/expiry. */
export function cacheGet(key: string): GroundedAnswer | null {
  if (!cacheEnabled()) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  // LRU: re-insert to mark as most-recently-used.
  store.delete(key);
  store.set(key, entry);
  return entry.answer;
}

/** Cache-eligibility is checked here AND at the call site (defence-in-depth). */
export function isCacheEligible(answer: GroundedAnswer): boolean {
  if (answer.safetyLevel !== 'NORMAL') return false;
  if (!answer.usedRetrieval) return false;
  if (answer.injectionFlagged) return false;
  if (!answer.content || answer.content.trim().length === 0) return false;
  if (!answer.content.includes(AI_DISCLAIMER_FA) && !answer.content.includes(AI_DISCLAIMER_EN)) return false;
  return true;
}

export function cachePut(key: string, answer: GroundedAnswer): void {
  if (!cacheEnabled()) return;
  if (!isCacheEligible(answer)) return;
  if (store.size >= MAX_ENTRIES) {
    // Evict least-recently-used (first key in insertion order).
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { answer, expiresAt: Date.now() + TTL_MS });
}

/** Test/ops helper — honest cache size for diagnostics. */
export function cacheSize(): number {
  return store.size;
}
