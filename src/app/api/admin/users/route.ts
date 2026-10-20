import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, json, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { ALL_ROLES, can } from '@/lib/roles';

/**
 * Wave 6.2 user management.
 *
 * GET  — search + paginated directory (no passwordHash, no pregnancy data;
 *        counts are aggregate numbers only).
 * PATCH — two disjoint mutations:
 *   {userId, role}           → SUPER_ADMIN only (`roles.manage` capability);
 *                               cannot change own role; cannot demote the last
 *                               SUPER_ADMIN. Audited with before/after roles.
 *   {userId, deactivated}    → ADMIN+ (`users.deactivate`); deactivation sets
 *                               deactivatedAt and cascade-deletes ALL session
 *                               rows (count logged); reactivation clears it.
 *                               A deactivated account is blocked at login AND
 *                               at every session-validation point (src/lib/auth.ts).
 */

const msg = (fa: string, en: string) => `${fa} | ${en}`;

const patchSchema = z
  .object({
    userId: z.string().min(1),
    role: z.enum(ALL_ROLES).optional(),
    deactivated: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.deactivated !== undefined, {
    message: 'role or deactivated required',
  });

export async function GET(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN'], async () => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim() ?? '';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20') || 20));

    const where = q
      ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] }
      : {};

    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          locale: true,
          deactivatedAt: true,
          createdAt: true,
          entitlement: { select: { plan: true } },
          _count: {
            select: {
              communityPosts: true,
              tickets: { where: { status: 'OPEN' } },
            },
          },
        },
      }),
    ]);

    return json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        locale: u.locale,
        plan: u.entitlement?.plan ?? 'FREE',
        deactivatedAt: u.deactivatedAt,
        createdAt: u.createdAt,
        posts: u._count.communityPosts,
        ticketsOpen: u._count.tickets,
      })),
      total,
      page,
      limit,
    });
  });
}

export async function PATCH(req: Request) {
  return withUser(req, ['ADMIN', 'SUPER_ADMIN'], async ({ user }) => {
    const body = await readJson(req, patchSchema);
    const target = await db.user.findUnique({ where: { id: body.userId } });
    if (!target) return apiError(404, 'NOT_FOUND', 'کاربر یافت نشد | User not found');

    // ── Role change — SUPER_ADMIN only (`roles.manage`) ─────────────────────
    if (body.role !== undefined && body.role !== target.role) {
      if (!can(user, 'roles.manage')) {
        return apiError(
          403,
          'ROLE_CHANGE_FORBIDDEN',
          msg('تغییر نقش کاربران فقط توسط ابرمدیر مجاز است.', 'Role changes require the SUPER_ADMIN role.')
        );
      }
      if (target.id === user.id) {
        return apiError(
          400,
          'SELF_ROLE_CHANGE',
          msg('نمی‌توانید نقش خودتان را تغییر دهید.', 'You cannot change your own role.')
        );
      }
      if (target.role === 'SUPER_ADMIN') {
        const remaining = await db.user.count({
          where: { role: 'SUPER_ADMIN', id: { not: target.id }, deactivatedAt: null },
        });
        if (remaining === 0) {
          return apiError(
            409,
            'LAST_SUPER_ADMIN',
            msg('آخرین ابرمدیر را نمی‌توان تنزل داد.', 'Cannot demote the last SUPER_ADMIN.')
          );
        }
      }
      const updated = await db.user.update({
        where: { id: target.id },
        data: { role: body.role },
      });
      await logAudit(
        user.id,
        'USER_ROLE_CHANGED',
        'User',
        target.id,
        { before: target.role, after: body.role },
        req.headers.get('x-forwarded-for')
      );
      return json({
        user: { id: updated.id, email: updated.email, role: updated.role, deactivatedAt: updated.deactivatedAt },
        changed: true,
      });
    }

    // ── Deactivate / reactivate — ADMIN+ (`users.deactivate`) ───────────────
    if (body.deactivated !== undefined) {
      if (!can(user, 'users.deactivate')) {
        return apiError(
          403,
          'FORBIDDEN',
          msg('غیرفعال‌سازی کاربران نیازمند نقش مدیر است.', 'Deactivation requires an administrator role.')
        );
      }
      if (target.id === user.id) {
        return apiError(
          400,
          'SELF_DEACTIVATION',
          msg('نمی‌توانید حساب خودتان را غیرفعال کنید.', 'You cannot deactivate your own account.')
        );
      }
      if (
        body.deactivated &&
        (target.role === 'ADMIN' || target.role === 'SUPER_ADMIN') &&
        !can(user, 'roles.manage')
      ) {
        return apiError(
          403,
          'TARGET_PRIVILEGED',
          msg('غیرفعال‌سازی حساب‌های مدیریتی فقط توسط ابرمدیر مجاز است.', 'Disabling administrator accounts requires SUPER_ADMIN.')
        );
      }

      if (body.deactivated && target.deactivatedAt == null) {
        const updated = await db.user.update({
          where: { id: target.id },
          data: { deactivatedAt: new Date() },
        });
        // Cascade: kill every live session so the block is immediate.
        const sessions = await db.session.deleteMany({ where: { userId: target.id } });
        await logAudit(
          user.id,
          'USER_DEACTIVATED',
          'User',
          target.id,
          { sessionsRevoked: sessions.count },
          req.headers.get('x-forwarded-for')
        );
        return json({
          user: { id: updated.id, email: updated.email, role: updated.role, deactivatedAt: updated.deactivatedAt },
          changed: true,
          sessionsRevoked: sessions.count,
        });
      }

      if (!body.deactivated && target.deactivatedAt != null) {
        const updated = await db.user.update({
          where: { id: target.id },
          data: { deactivatedAt: null },
        });
        await logAudit(user.id, 'USER_REACTIVATED', 'User', target.id, null, req.headers.get('x-forwarded-for'));
        return json({
          user: { id: updated.id, email: updated.email, role: updated.role, deactivatedAt: updated.deactivatedAt },
          changed: true,
        });
      }

      // Idempotent no-op — return current state honestly.
      return json({
        user: { id: target.id, email: target.email, role: target.role, deactivatedAt: target.deactivatedAt },
        changed: false,
      });
    }

    return json({ user: { id: target.id, email: target.email, role: target.role, deactivatedAt: target.deactivatedAt }, changed: false });
  });
}
