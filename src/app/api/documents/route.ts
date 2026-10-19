import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { logAudit } from '@/lib/audit';

/**
 * Medical documents — metadata registry in the sandbox build.
 * Binary upload + malware scanning + S3 storage is the documented production target
 * (docs/07-security-privacy.md §uploads). Deliberately rejecting raw file payloads
 * here prevents unscanned binaries entering the sandbox datastore.
 */
const createSchema = z.object({
  title: z.string().min(2).max(120),
  category: z.enum(['REPORT', 'ULTRASOUND', 'LAB', 'PRESCRIPTION', 'OTHER']).default('REPORT'),
  fileName: z.string().min(1).max(200),
  fileType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/octet-stream']).default('application/octet-stream'),
  sizeKb: z.number().int().min(1).max(51_200),
  notes: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const docs = await db.medicalDocument.findMany({
      where: { userId: user.id },
      orderBy: { uploadedAt: 'desc' },
    });
    return json({ docs });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, createSchema);
    if (!/^[a-zA-Z0-9._-]+$/.test(body.fileName)) {
      return apiError(400, 'VALIDATION', 'File name may only contain letters, digits, dot, dash, underscore');
    }
    const doc = await db.medicalDocument.create({
      data: {
        userId: user.id,
        title: body.title,
        category: body.category,
        fileName: body.fileName,
        fileType: body.fileType,
        sizeKb: body.sizeKb,
        notes: body.notes,
      },
    });
    await logAudit(user.id, 'DOCUMENT_REGISTER', 'MedicalDocument', doc.id, { category: body.category, sizeKb: body.sizeKb }, req.headers.get('x-forwarded-for'));
    return json({ id: doc.id }, 201);
  });
}

export async function DELETE(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');
    const doc = await db.medicalDocument.findUnique({ where: { id } });
    if (!doc || doc.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Document not found');
    await db.medicalDocument.delete({ where: { id } });
    return json({ ok: true });
  });
}
