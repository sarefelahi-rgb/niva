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
    const { features } = await getEntitlementFeatures(user.id);
    if (features.aiMessagesPerDay >= 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const usedToday = await db.aIMessage.count({
        where: {
          conversation: { userId: user.id },
          role: 'ASSISTANT',
          createdAt: { gte: startOfDay },
        },
      });
      if (usedToday >= features.aiMessagesPerDay) {
        return json({ limitReached: true, used: usedToday, limit: features.aiMessagesPerDay }, 402);
      }
    }

    const pregnancy = await db.pregnancy.findFirst({ where: { userId: user.id, status: 'ACTIVE' } });
    let pregnancyContext: string | undefined;
    if (pregnancy?.lmpDate) {
      const w = Math.max(0, Math.floor((Date.now() - pregnancy.lmpDate.getTime()) / (7 * 86_400_000)));
      pregnancyContext = `Gestational week ≈ ${w} (educational estimate)`;
    }

    await db.aIMessage.create({
      data: { conversationId: conv.id, role: 'USER', content: body.message },
    });

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

    const assistant = await db.aIMessage.create({
      data: {
        conversationId: conv.id,
        role: 'ASSISTANT',
        content: answer.content,
        citations: answer.citations.length ? JSON.stringify(answer.citations) : null,
        safetyLevel: answer.safetyLevel,
        flagged: answer.injectionFlagged,
      },
    });
    await db.aIConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date(), language: body.lang },
    });

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
