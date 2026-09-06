import { CATALOGO, getEntidad, getRuta } from '@/lib/entidades';
import { LEGAL_VERSION } from '@/lib/legal/rules';
import { analizarRelato } from '@/lib/intake/analyze';
import { AnthropicProvider, TemplateProvider } from '@/lib/llm';
import { draftInputSchema, generatedContentSchema } from '@/lib/schema/peticion';
import { requestLimit } from '@/lib/rate-limit';
import { readJson, json, fail, HttpError } from '@/lib/server/http';
import { metric } from '@/lib/server/metrics';
import { finishAi, reserveAi } from '@/lib/server/ai';
export const runtime = 'nodejs';
export const maxDuration = 40;
export async function POST(req: Request) {
  try {
    const input = draftInputSchema.safeParse(await readJson(req));
    if (!input.success)
      throw new HttpError(400, 'Revisa el relato, la entidad y las autorizaciones.');
    const data = input.data;
    const entity = getEntidad(data.entitySlug);
    if (!entity?.activa) throw new HttpError(400, 'Entidad no disponible.');
    const analysis = analizarRelato(data);
    if (analysis.status === 'referral') throw new HttpError(422, analysis.referral!.description);
    if (!(await requestLimit(req, 'draft', 12)))
      throw new HttpError(429, 'Alcanzaste el límite temporal. Intenta de nuevo en un minuto.');
    const route = getRuta(entity, data.pathway);
    let provider = 'plantilla';
    let fallbackReason: string | undefined;
    let content = await new TemplateProvider().generarContenido({ input: data, entity });
    if (data.mode === 'ai') {
      const reservation = await reserveAi();
      if (!reservation)
        fallbackReason =
          'La IA no está disponible o alcanzó su presupuesto. Preparamos una plantilla sin IA que puedes editar.';
      else {
        const ai = new AnthropicProvider(reservation.config.key, reservation.config.model);
        const start = performance.now();
        let ok = false;
        try {
          content = await ai.generarContenido({ input: data, entity });
          provider = 'anthropic';
          ok = true;
        } catch {
          fallbackReason =
            'La IA no pudo terminar. Conservamos tus palabras en una plantilla editable.';
        } finally {
          await finishAi(
            reservation,
            ai.usage.inputTokens ? ai.usage : null,
            ok,
            performance.now() - start,
          );
        }
      }
    }
    await metric(
      provider === 'anthropic' ? 'draft_ai' : fallbackReason ? 'draft_fallback' : 'draft_template',
    );
    return json({
      content: generatedContentSchema.parse(content),
      meta: {
        tipo: route.tipo,
        tipoLabel: route.titulo,
        terminoDias: route.diasHabiles,
        proveedor: provider,
        entitySlug: entity.slug,
        pathway: route.id,
        catalogVersion: CATALOGO.version,
        ruleVersion: LEGAL_VERSION,
        fallbackReason,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
