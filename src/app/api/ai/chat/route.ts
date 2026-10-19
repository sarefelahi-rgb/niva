import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { answerQuestion, type ChatTurn, type Lang } from '@/lib/rag';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logSafetyEvent } from '@/lib/audit';
import { getEntitlementFeatures } from '@/lib/entitlements';

const schema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1).max(2000),
  lang: z.enum(['fa', 'en']).default('fa'),
});

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    if (!rateLimit(clientKey(req, 'ai-chat'), 20, 60_000)) {
      return apiError(429, 'RATE_LIMIT', 'Too many messages. Please slow down.');
    }
    const body = await readJson(req, schema);
    const conv = await db.aIConversation.findUnique({
      where: { id: body.conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conv || conv.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Conversation not found');

    // Server-side entitlement enforcement (free daily message cap).
    // Advisory pre-check only: the authoritative, atomic check happens inside
    // the persistence transaction below (TOCTOU fix, risk R-04).
    const { features } = await getEntitlementFeatures(user.id);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const pregnancy = await db.pregnancy.findFirst({ where: { userId: user.id, status: 'ACTIVE' } });
    let pregnancyContext: string | undefined;
    if (pregnancy?.lmpDate) {
      const w = Math.max(0, Math.floor((Date.now() - pregnancy.lmpDate.getTime()) / (7 * 86_400_000)));
      pregnancyContext = `Gestational week ≈ ${w} (educational estimate)`;
    }

    const history: ChatTurn[] = conv.messages
      .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
      .slice(-6)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const answer = await answerQuestion({
      question: body.message,
      lang: body.lang as Lang,
      history,
      pregnancyContext,
      userId: user.id,
    });

    // Atomic quota + persistence: count-check and message inserts happen in
    // ONE transaction, so concurrent requests cannot exceed the daily cap.
    // Deterministic EMERGENCY guidance is always persisted (safety first).
    const persisted = await db.$transaction(async (tx) => {
      if (features.aiMessagesPerDay >= 0 && answer.safetyLevel !== 'EMERGENCY') {
        const usedToday = await tx.aIMessage.count({
          where: {
            conversation: { userId: user.id },
            role: 'ASSISTANT',
            createdAt: { gte: startOfDay },
          },
        });
        if (usedToday >= features.aiMessagesPerDay) return null;
      }
      await tx.aIMessage.create({
        data: { conversationId: conv.id, role: 'USER', content: body.message },
      });
      const assistant = await tx.aIMessage.create({
        data: {
          conversationId: conv.id,
          role: 'ASSISTANT',
          content: answer.content,
          citations: answer.citations.length ? JSON.stringify(answer.citations) : null,
          safetyLevel: answer.safetyLevel,
          flagged: answer.injectionFlagged,
        },
      });
      await tx.aIConversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date(), language: body.lang },
      });
      return assistant;
    });

    if (!persisted) {
      return json({ limitReached: true, used: features.aiMessagesPerDay, limit: features.aiMessagesPerDay }, 402);
    }
    const assistant = persisted;

    if (answer.safetyLevel === 'EMERGENCY') {
      await logSafetyEvent(user.id, 'EMERGENCY_ESCALATION', 'HIGH', 'AI assistant returned deterministic emergency guidance');
    }
    if (answer.injectionFlagged) {
      await logSafetyEvent(user.id, 'INJECTION_ATTEMPT', 'MEDIUM', 'Prompt-injection pattern detected in user message');
    }

    return json({
      id: assistant.id,
      content: answer.content,
      citations: answer.citations,
      safetyLevel: answer.safetyLevel,
    });
  });
}
