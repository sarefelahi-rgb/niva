/**
 * NIVA PHI-free AI observability (backlog 3.2).
 *
 * Every chat-pipeline request (cache hit, provider success, extractive or
 * template fallback, deterministic emergency) is recorded as an AIUsageLog row.
 *
 * PHI guarantees:
 * - userId is stored ONLY as HMAC-SHA256(userId, NIVA_AI_OBS_SALT), first 24
 *   hex chars — never the raw id, never an email.
 * - Message content / answer content are NEVER stored — only character counts.
 * - retrievalScores stores top-k combined similarity numbers (3 decimal places).
 * - errorCode is a stable machine code (e.g. 'PROVIDER_TIMEOUT'), never text.
 *
 * logAIUsage is fire-and-forget (void promise) and swallows all errors —
 * observability must never break or slow the chat path.
 */

import { createHmac } from 'crypto';
import { db } from '@/lib/db';

export interface AIUsageData {
  userId?: string | null;
  route: string; // 'chat'
  provider: string; // 'z-ai' | 'template-fallback' | 'cache' | 'extractive' | 'deterministic-emergency'
  model?: string | null;
  locale: string; // 'fa' | 'en'
  promptChars: number;
  completionChars: number;
  latencyMs: number;
  cacheHit: boolean;
  usedRetrieval: boolean;
  retrievalScores: number[]; // top-k combined scores only — no text
  safetyLevel: string; // NORMAL | CAUTION | EMERGENCY
  errorCode?: string | null;
}

export function hashUserId(userId: string): string {
  const salt = process.env.NIVA_AI_OBS_SALT || 'niva-dev-salt-not-for-production';
  return createHmac('sha256', salt).update(userId).digest('hex').slice(0, 24);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function logAIUsage(data: AIUsageData): void {
  void (async () => {
    try {
      await db.aIUsageLog.create({
        data: {
          userIdHash: data.userId ? hashUserId(data.userId) : null,
          route: data.route,
          provider: data.provider,
          model: data.model ?? null,
          locale: data.locale,
          promptChars: Math.max(0, Math.floor(data.promptChars)),
          completionChars: Math.max(0, Math.floor(data.completionChars)),
          latencyMs: Math.max(0, Math.floor(data.latencyMs)),
          cacheHit: data.cacheHit,
          usedRetrieval: data.usedRetrieval,
          retrievalScores: JSON.stringify((data.retrievalScores ?? []).slice(0, 4).map(round3)),
          safetyLevel: data.safetyLevel,
          errorCode: data.errorCode ?? null,
        },
      });
    } catch {
      // Observability must never break the chat — failures are silent here.
    }
  })();
}
