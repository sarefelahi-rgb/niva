import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { assessSafety } from '@/lib/safety';
import { logSafetyEvent } from '@/lib/audit';

const createSchema = z.object({
  date: z.string(),
  energy: z.number().int().min(1).max(5).optional(),
  nausea: z.number().int().min(0).max(5).optional(),
  sleep: z.number().int().min(1).max(5).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  weightKg: z.number().min(25).max(250).optional(),
  systolic: z.number().int().min(60).max(260).optional(),
  diastolic: z.number().int().min(30).max(180).optional(),
  kickCount: z.number().int().min(0).max(200).optional(),
  symptoms: z.array(z.string().max(40)).max(12).default([]),
  notes: z.string().max(1000).optional(),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get('take') ?? 60), 200);
    const entries = await db.symptomEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take,
    });
    const bpAlert = entries.some(
      (e) => (e.systolic && e.systolic >= 140) || (e.diastolic && e.diastolic >= 90)
    );
    return json({ entries, bpAlert });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, createSchema);
    // Deterministic red-flag scan on free-text symptoms and notes.
    const freeText = `${body.symptoms.join(' ')} ${body.notes ?? ''}`;
    const assessment = assessSafety(freeText);
    if (assessment.level === 'EMERGENCY') {
      await logSafetyEvent(user.id, 'RED_FLAG_SYMPTOM', 'HIGH', `Tracking entry categories: ${assessment.categories.join(',')}`);
    }
    const pregnancy = await db.pregnancy.findFirst({ where: { userId: user.id, status: 'ACTIVE' } });
    const date = new Date(body.date);
    const entry = await db.symptomEntry.create({
      data: {
        userId: user.id,
        date,
        week: pregnancy && pregnancy.lmpDate ? Math.max(0, Math.floor((date.getTime() - pregnancy.lmpDate.getTime()) / (7 * 86_400_000))) : null,
        energy: body.energy,
        nausea: body.nausea,
        sleep: body.sleep,
        mood: body.mood,
        weightKg: body.weightKg,
        systolic: body.systolic,
        diastolic: body.diastolic,
        kickCount: body.kickCount,
        symptoms: JSON.stringify(body.symptoms),
        notes: body.notes,
      },
    });
    return json({ id: entry.id, safetyLevel: assessment.level, categories: assessment.categories }, 201);
  });
}
