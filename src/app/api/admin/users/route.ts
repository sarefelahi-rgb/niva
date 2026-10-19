import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

export async function GET(req: Request) {
  return withUser(req, ['ADMIN'], async () => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.toLowerCase() ?? '';
    const users = await db.user.findMany({
      where: q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { entitlement: { select: { plan: true } } },
    });
    return json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        locale: u.locale,
        plan: u.entitlement?.plan ?? 'FREE',
        createdAt: u.createdAt,
      })),
    });
  });
}
