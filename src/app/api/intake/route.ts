import { z } from 'zod';
import { narrativeSchema, analizarRelato } from '@/lib/intake/analyze';
import { analyzeWithAi } from '@/lib/intake/ai';
import { readJson, json, fail, HttpError } from '@/lib/server/http';
import { requestLimit } from '@/lib/rate-limit';
export const maxDuration = 35;
export async function POST(req: Request) {
  try {
    const result = narrativeSchema
      .extend({ useAi: z.boolean().default(false), consent: z.boolean().default(false) })
      .strict()
      .safeParse(await readJson(req));
    if (!result.success) throw new HttpError(400, 'Revisa la descripción de tu caso.');
    if (!(await requestLimit(req, 'intake', 8)))
      throw new HttpError(429, 'Intenta de nuevo en un minuto.');
    if (result.data.useAi && !result.data.consent)
      throw new HttpError(400, 'Autoriza el envío del relato a Anthropic para usar IA.');
    return json(
      result.data.useAi
        ? await analyzeWithAi(result.data)
        : { ...analizarRelato(result.data), provider: 'directorio' },
    );
  } catch (e) {
    return fail(e);
  }
}
