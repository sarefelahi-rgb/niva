import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

export async function GET(req: Request) {
  return withUser(req, ['ADMIN'], async () => {
    const events = await db.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 150,
      include: { actor: { select: { name: true, email: true } } },
    });
    return json({ events });
  });
}
