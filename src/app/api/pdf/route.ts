import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { PeticionPdf } from '@/lib/pdf/PeticionPdf';
import { peticionDocumentSchema } from '@/lib/schema/peticion';
import { requestLimit } from '@/lib/rate-limit';
import { readJson, fail, HttpError } from '@/lib/server/http';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  try {
    const body = await readJson(req, 96_000);
    const parsed = peticionDocumentSchema.safeParse((body as { documento?: unknown })?.documento);
    if (!parsed.success) throw new HttpError(400, 'Revisa los campos del documento.');
    if (!(await requestLimit(req, 'pdf', 12)))
      throw new HttpError(429, 'Demasiadas descargas. Intenta de nuevo en un minuto.');
    const buffer = await renderToBuffer(
      createElement(PeticionPdf, { documento: parsed.data }) as Parameters<
        typeof renderToBuffer
      >[0],
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="peticion.pdf"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return fail(e);
  }
}
