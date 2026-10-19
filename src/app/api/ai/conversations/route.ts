import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const conversations = await db.aIConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 200 } },
    });
    return json({ conversations });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, z.object({ title: z.string().max(80).optional() }));
    const conv = await db.aIConversation.create({
      data: { userId: user.id, title: body.title ?? 'Conversation', language: user.locale },
    });
    return json({ id: conv.id }, 201);
  });
}

export async function DELETE(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');
    const conv = await db.aIConversation.findUnique({ where: { id } });
    if (!conv || conv.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Conversation not found');
    await db.aIConversation.delete({ where: { id } });
    return json({ ok: true });
  });
}
