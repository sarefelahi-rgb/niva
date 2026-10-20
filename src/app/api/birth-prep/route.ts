import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';

const upsertSchema = z.object({
  category: z.enum(['BIRTH_PLAN', 'HOSPITAL_BAG']),
  itemKey: z.string().regex(/^[a-z0-9_.-]{1,80}$/i, 'Invalid itemKey'),
  done: z.boolean(),
  note: z.string().max(300).optional(),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const items = await db.birthPlanItem.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return json({ items });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, upsertSchema);
    // Idempotent toggle keyed on (user, category, itemKey) so the client can
    // replay the same checkbox write safely (optimistic UI + retries).
    await db.birthPlanItem.upsert({
      where: {
        userId_category_itemKey: {
          userId: user.id,
          category: body.category,
          itemKey: body.itemKey,
        },
      },
      update: { done: body.done, note: body.note },
      create: {
        userId: user.id,
        category: body.category,
        itemKey: body.itemKey,
        done: body.done,
        note: body.note,
      },
    });
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const params = new URL(req.url).searchParams;
    const category = params.get('category');
    const itemKey = params.get('itemKey');
    if (!category || !itemKey) return apiError(400, 'VALIDATION', 'category and itemKey required');
    const existing = await db.birthPlanItem.findUnique({
      where: { userId_category_itemKey: { userId: user.id, category, itemKey } },
    });
    if (!existing) return apiError(404, 'NOT_FOUND', 'Item not found');
    await db.birthPlanItem.delete({ where: { id: existing.id } });
    return json({ ok: true });
  });
}
