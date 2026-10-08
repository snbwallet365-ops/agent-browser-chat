import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError, audit, authenticate, python, transaction } from '@/lib/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const report = z.object({ filename: z.string(), text: z.string().max(200000), names: z.array(z.string()), passportNumbers: z.array(z.string()), warnings: z.array(z.string()), extractionMethod: z.string() });
export async function POST(req: NextRequest) {
  try {
    authenticate(req);
    const length = Number(req.headers.get('content-length') ?? 0);
    if (length > 12 * 1024 * 1024) throw new AppError(413, 'Maximum document size is 10 MB');
    const form = await req.formData(), file = form.get('file'), id = z.string().uuid().parse(form.get('id'));
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024) throw new AppError(400, 'Select a document no larger than 10 MB');
    if (!/\.(pdf|doc|docx|jpe?g|png)$/i.test(file.name)) throw new AppError(400, 'Unsupported document type');
    const outbound = new FormData(); outbound.set('file', file);
    const response = await python('/extract', outbound);
    if (!response.ok) throw new AppError(response.status, 'Document extraction failed; verify format and Python/OCR configuration');
    const extracted = report.parse(await response.json());
    return NextResponse.json(await transaction(async store => {
      const item = store.cases.find(value => value.id === id); if (!item) throw new AppError(404, 'Case not found');
      item.documents.push(extracted); audit(store, 'document.extracted', item.id); return { item };
    }), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AppError ? error.message : 'Document request failed' }, { status: error instanceof AppError ? error.status : 400 });
  }
}
