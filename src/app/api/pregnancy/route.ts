import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { proposeDating, resolveDating, gestationalAgeAt, trimesterOf } from '@/lib/gestational';
import { logAudit } from '@/lib/audit';

const createSchema = z.object({
  label: z.string().min(1).max(60).default('My pregnancy'),
  method: z.enum(['LMP', 'ULTRASOUND_CRL', 'CLINICIAN', 'IVF']),
  lmpDate: z.string().optional(),
  scanDate: z.string().optional(),
  crlMm: z.number().min(1).max(120).optional(),
  transferDate: z.string().optional(),
  embryoAgeDays: z.number().min(1).max(6).optional(),
  clinicianDueDate: z.string().optional(),
  plurality: z.enum(['SINGLETON', 'TWINS', 'TRIPLETS_OR_MORE']).default('SINGLETON'),
  uncertainDates: z.boolean().default(false),
});

const updateSchema = z.object({
  action: z.enum(['UPDATE_DATING', 'TRANSITION', 'UPDATE_PLURALITY']),
  method: z.enum(['LMP', 'ULTRASOUND_CRL', 'CLINICIAN', 'IVF']).optional(),
  lmpDate: z.string().optional(),
  scanDate: z.string().optional(),
  crlMm: z.number().min(1).max(120).optional(),
  transferDate: z.string().optional(),
  embryoAgeDays: z.number().min(1).max(6).optional(),
  clinicianDueDate: z.string().optional(),
  confirmOverwrite: z.boolean().default(false),
  transition: z.enum(['POSTPARTUM', 'COMPLETED', 'LOSS', 'REACTIVATE']).optional(),
  plurality: z.enum(['SINGLETON', 'TWINS', 'TRIPLETS_OR_MORE']).optional(),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const pregnancies = await db.pregnancy.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { datings: { orderBy: { setAt: 'desc' }, take: 5 }, events: { orderBy: { date: 'desc' }, take: 10 } },
    });
    return json({ pregnancies });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, createSchema);
    const proposal = proposeDating({
      method: body.method,
      lmpDate: body.lmpDate,
      scanDate: body.scanDate,
      crlMm: body.crlMm,
      transferDate: body.transferDate,
      embryoAgeDays: body.embryoAgeDays,
      clinicianDueDate: body.clinicianDueDate,
    });
    if (!proposal.valid || !proposal.dueDate) {
      return apiError(400, 'INVALID_DATING', proposal.warnings.join(' ') || 'Dating information is invalid');
    }
    const active = await db.pregnancy.findFirst({
      where: { userId: user.id, status: { in: ['ACTIVE', 'POSTPARTUM'] } },
    });
    if (active) return apiError(409, 'ACTIVE_EXISTS', 'You already have an active pregnancy profile');

    const resolution = resolveDating(null, proposal);
    const pregnancy = await db.pregnancy.create({
      data: {
        userId: user.id,
        label: body.label.trim(),
        lmpDate: body.method === 'LMP' && body.lmpDate ? new Date(body.lmpDate) : null,
        dueDate: resolution.dueDate,
        datingMethod: body.method,
        datingLocked: resolution.locked,
        datingConfidence: body.uncertainDates ? 'LOW' : proposal.confidence,
        datingNote: proposal.warnings.join(' | ') || null,
        plurality: body.plurality,
        status: 'ACTIVE',
      },
    });
    await db.gestationalDating.create({
      data: {
        pregnancyId: pregnancy.id,
        method: body.method,
        referenceDate: new Date(proposal.referenceDate || Date.now()),
        crlMm: body.crlMm ?? null,
        dueDate: resolution.dueDate,
        confidence: proposal.confidence,
        source: body.method === 'CLINICIAN' ? 'CLINICIAN' : 'SELF',
        note: body.uncertainDates ? 'User-flagged uncertain dates' : null,
      },
    });
    await logAudit(user.id, 'PREGNANCY_CREATE', 'Pregnancy', pregnancy.id, { method: body.method }, req.headers.get('x-forwarded-for'));
    const ga = gestationalAgeAt({ dueDate: resolution.dueDate });
    return json(
      {
        id: pregnancy.id,
        dueDate: resolution.dueDate,
        locked: resolution.locked,
        warnings: resolution.warnings,
        gestationalAge: { weeks: Math.max(ga.weeks, 0), days: Math.max(ga.days, 0) },
        trimester: trimesterOf(Math.max(ga.weeks, 0)),
      },
      201
    );
  });
}

export async function PATCH(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, updateSchema);
    const pregnancy = await db.pregnancy.findFirst({
      where: { userId: user.id, status: { in: ['ACTIVE', 'POSTPARTUM'] } },
    });
    if (!pregnancy) return apiError(404, 'NOT_FOUND', 'No active pregnancy');

    if (body.action === 'TRANSITION') {
      if (!body.transition) return apiError(400, 'VALIDATION', 'transition required');
      if (body.transition === 'REACTIVATE') {
        await db.pregnancy.update({ where: { id: pregnancy.id }, data: { status: 'ACTIVE', outcomeAt: null } });
      } else {
        await db.pregnancy.update({
          where: { id: pregnancy.id },
          data: { status: body.transition, outcomeAt: new Date() },
        });
        await logAudit(user.id, `PREGNANCY_${body.transition}`, 'Pregnancy', pregnancy.id, null, req.headers.get('x-forwarded-for'));
      }
      return json({ ok: true, status: body.transition === 'REACTIVATE' ? 'ACTIVE' : body.transition });
    }

    if (body.action === 'UPDATE_PLURALITY') {
      if (!body.plurality) return apiError(400, 'VALIDATION', 'plurality required');
      await db.pregnancy.update({ where: { id: pregnancy.id }, data: { plurality: body.plurality } });
      return json({ ok: true });
    }

    // UPDATE_DATING
    const proposal = proposeDating({
      method: body.method ?? 'LMP',
      lmpDate: body.lmpDate,
      scanDate: body.scanDate,
      crlMm: body.crlMm,
      transferDate: body.transferDate,
      embryoAgeDays: body.embryoAgeDays,
      clinicianDueDate: body.clinicianDueDate,
    });
    if (!proposal.valid || !proposal.dueDate) {
      return apiError(400, 'INVALID_DATING', proposal.warnings.join(' ') || 'Dating information is invalid');
    }
    const resolution = resolveDating(
      { dueDate: pregnancy.dueDate, datingLocked: pregnancy.datingLocked, datingMethod: pregnancy.datingMethod },
      proposal
    );
    if (resolution.conflict && !body.confirmOverwrite) {
      return json({ conflict: true, conflictDays: resolution.conflictDays, warnings: resolution.warnings }, 409);
    }
    await db.pregnancy.update({
      where: { id: pregnancy.id },
      data: {
        dueDate: resolution.dueDate,
        datingMethod: proposal.method,
        datingLocked: resolution.locked,
        datingConfidence: proposal.confidence,
        datingNote: resolution.warnings.join(' | ') || null,
        lmpDate: proposal.method === 'LMP' && body.lmpDate ? new Date(body.lmpDate) : pregnancy.lmpDate,
      },
    });
    await db.gestationalDating.create({
      data: {
        pregnancyId: pregnancy.id,
        method: proposal.method,
        referenceDate: new Date(proposal.referenceDate || Date.now()),
        crlMm: body.crlMm ?? null,
        dueDate: resolution.dueDate,
        confidence: proposal.confidence,
        source: proposal.method === 'CLINICIAN' ? 'CLINICIAN' : 'SELF',
      },
    });
    await logAudit(user.id, 'PREGNANCY_DATING_UPDATE', 'Pregnancy', pregnancy.id, { method: proposal.method }, req.headers.get('x-forwarded-for'));
    return json({ ok: true, dueDate: resolution.dueDate, locked: resolution.locked, warnings: resolution.warnings });
  });
}
