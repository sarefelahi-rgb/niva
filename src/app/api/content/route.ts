import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

/**
 * Educational content delivery. Public knowledge entries and weekly content are
 * served with their TRUE governance status; the UI renders the review badge so
 * users are never misled into thinking content is clinically approved when it is not.
 */
export async function GET(req: Request) {
  return withUser(req, [], async () => {
    const url = new URL(req.url);
    const week = url.searchParams.get('week');
    const category = url.searchParams.get('category');
    const contents = await db.educationalContent.findMany({
      where: {
        ...(week ? { week: Number(week) } : {}),
        ...(category ? { category } : {}),
        status: { in: ['IN_REVIEW', 'APPROVED'] },
      },
      orderBy: [{ week: 'asc' }, { category: 'asc' }],
      take: 80,
    });
    return json({ contents });
  });
}
