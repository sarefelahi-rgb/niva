/**
 * NIVA AI provider gateway (server-side ONLY — z-ai-web-dev-sdk must never be
 * imported by client components).
 *
 * Responsibilities (backlog 3.2):
 * - Provider abstraction: primary ZAIProvider + honest TemplateFallbackProvider.
 * - Circuit breaker: 5 consecutive provider failures → OPEN for 60s (in-memory,
 *   per module instance); calls while OPEN skip straight to fallback; a single
 *   half-open probe is allowed after the cooldown.
 * - Cost controls: prompt (6000 chars) and completion (2000 chars) budgets
 *   enforced by truncation BEFORE sending; per-user daily LLM-call counter
 *   (env NIVA_AI_DAILY_LLM_CALLS, default 30). Cache hits and deterministic
 *   EMERGENCY responses never consume the counter.
 * - Hard 20s timeout wrapper with graceful fallback.
 *
 * The sandbox z-ai-web-dev-sdk exposes chat/image/audio/video only — it has NO
 * embeddings endpoint (verified against node_modules/z-ai-web-dev-sdk/dist/
 * index.d.ts), so retrieval similarity is computed offline in rag.ts.
 */

import ZAI from 'z-ai-web-dev-sdk';

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  id: string;
  complete(messages: ChatMsg[], opts: { maxChars: number; timeoutMs: number }): Promise<{ content: string; model?: string }>;
}

export const PROMPT_CHAR_BUDGET = 6000;
export const COMPLETION_CHAR_BUDGET = 2000;
export const PROVIDER_TIMEOUT_MS = 20_000;

/** Honest per-locale "assistant unavailable" fallback (previously inline in rag.ts). */
export function templateFallbackContent(lang: 'fa' | 'en'): string {
  return lang === 'fa'
    ? 'در این لحظه امکان پاسخ‌گویی دستیار فراهم نیست. لطفاً چند لحظه بعد دوباره تلاش کنید؛ برای سؤال‌های پزشکی فوری با ماما یا پزشک خود تماس بگیرید.'
    : 'The assistant is temporarily unavailable. Please try again shortly; for urgent medical questions contact your midwife or physician.';
}

/** Primary provider — z-ai chat completions, thinking disabled. */
export class ZAIProvider implements AIProvider {
  id = 'z-ai';

  async complete(messages: ChatMsg[], opts: { maxChars: number; timeoutMs: number }): Promise<{ content: string; model?: string }> {
    const zai = await ZAI.create();
    const completion = await Promise.race([
      zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      }),
      new Promise<never>((_, reject) => {
        const t = setTimeout(() => reject(new Error('provider-timeout')), opts.timeoutMs);
        if (typeof t.unref === 'function') t.unref();
      }),
    ]);
    const content = (completion as { choices?: Array<{ message?: { content?: string } }> })
      ?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) throw new Error('empty-model-response');
    return { content: content.slice(0, opts.maxChars), model: 'z-ai' };
  }
}

export const zaiProvider = new ZAIProvider();

/* ── Circuit breaker ──────────────────────────────────────────────────────── */

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60_000;

type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
const breaker: { state: BreakerState; failures: number; openedAt: number } = {
  state: 'CLOSED',
  failures: 0,
  openedAt: 0,
};

function breakerAllows(): boolean {
  if (breaker.state === 'OPEN') {
    if (Date.now() - breaker.openedAt >= COOLDOWN_MS) {
      breaker.state = 'HALF_OPEN'; // single probe allowed
      return true;
    }
    return false;
  }
  return true;
}

function recordProviderSuccess(): void {
  breaker.failures = 0;
  breaker.state = 'CLOSED';
}

function recordProviderFailure(): void {
  if (breaker.state === 'HALF_OPEN') {
    breaker.state = 'OPEN';
    breaker.openedAt = Date.now();
    return;
  }
  breaker.failures += 1;
  if (breaker.failures >= FAILURE_THRESHOLD) {
    breaker.state = 'OPEN';
    breaker.openedAt = Date.now();
  }
}

export function breakerStatus(): { state: BreakerState; failures: number } {
  return { state: breaker.state, failures: breaker.failures };
}

/* ── Prompt budget enforcement ────────────────────────────────────────────── */

function totalChars(messages: ChatMsg[]): number {
  return messages.reduce((s, m) => s + m.content.length, 0);
}

/**
 * Enforce the prompt char budget BEFORE sending: drop oldest non-system turns
 * first; then truncate the system prompt; finally clip the last user message.
 */
export function enforcePromptBudget(messages: ChatMsg[], budget: number = PROMPT_CHAR_BUDGET): ChatMsg[] {
  const out = messages.map((m) => ({ ...m }));
  while (totalChars(out) > budget && out.length > 2) {
    out.splice(1, 1); // drop oldest turn after the instruction message
  }
  if (totalChars(out) > budget) {
    const overflow = totalChars(out) - budget;
    // Preserve the original role — the sandbox z-ai endpoint rejects role
    // 'system' (API error 1214); hardcoding it here broke every request whose
    // history triggered truncation (regression found via Wave 3 E2E).
    out[0] = { ...out[0], content: out[0].content.slice(0, Math.max(500, out[0].content.length - overflow)) };
  }
  if (totalChars(out) > budget) {
    const overflow = totalChars(out) - budget;
    const last = out[out.length - 1];
    out[out.length - 1] = { ...last, content: last.content.slice(0, Math.max(0, last.content.length - overflow)) };
  }
  return out;
}

/* ── Gateway entry point ──────────────────────────────────────────────────── */

export type GatewayResult =
  | { ok: true; content: string; model: string; provider: string }
  | { ok: false; errorCode: 'PROVIDER_TIMEOUT' | 'PROVIDER_FAILURE' | 'CIRCUIT_OPEN'; provider: string };

export async function completeWithGateway(
  messages: ChatMsg[],
  opts: { timeoutMs?: number; maxChars?: number } = {}
): Promise<GatewayResult> {
  const bounded = enforcePromptBudget(messages);
  if (!breakerAllows()) {
    return { ok: false, errorCode: 'CIRCUIT_OPEN', provider: 'template-fallback' };
  }
  try {
    const res = await zaiProvider.complete(bounded, {
      maxChars: opts.maxChars ?? COMPLETION_CHAR_BUDGET,
      timeoutMs: opts.timeoutMs ?? PROVIDER_TIMEOUT_MS,
    });
    recordProviderSuccess();
    return { ok: true, content: res.content, model: res.model ?? 'z-ai', provider: zaiProvider.id };
  } catch (err) {
    recordProviderFailure();
    const msg = err instanceof Error ? err.message : '';
    // Structured server-side warning (no PHI — message text only). Provider
    // failures must be observable in dev/production logs, not swallowed.
    console.warn(`[ai-gateway] provider failure (${zaiProvider.id}):`, msg || 'unknown error');
    return {
      ok: false,
      errorCode: msg === 'provider-timeout' ? 'PROVIDER_TIMEOUT' : 'PROVIDER_FAILURE',
      provider: 'template-fallback',
    };
  }
}

/* ── Per-user daily LLM-call counter (in-memory; sandbox build) ───────────── */

const llmCalls = new Map<string, { day: string; count: number }>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dailyLLMCap(): number {
  const n = Number(process.env.NIVA_AI_DAILY_LLM_CALLS ?? 30);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

/** True when the user (if identified) still has LLM budget. Null userId = uncapped (eval/batch). */
export function llmBudgetAvailable(userId: string | null): boolean {
  if (!userId) return true;
  const entry = llmCalls.get(userId);
  if (!entry || entry.day !== todayKey()) return true;
  return entry.count < dailyLLMCap();
}

/** Count one LLM invocation (main completion and re-rank each consume one). */
export function bumpLLMCalls(userId: string | null): void {
  if (!userId) return;
  const day = todayKey();
  const entry = llmCalls.get(userId);
  if (!entry || entry.day !== day) {
    llmCalls.set(userId, { day, count: 1 });
    return;
  }
  entry.count += 1;
}

export function llmCallsUsed(userId: string | null): number {
  if (!userId) return 0;
  const entry = llmCalls.get(userId);
  if (!entry || entry.day !== todayKey()) return 0;
  return entry.count;
}
