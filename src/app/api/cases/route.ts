import { z } from 'zod';
import { requireUser, serviceClient } from '@/lib/server/db';
import { readJson, json, fail, HttpError } from '@/lib/server/http';
import { peticionDocumentSchema } from '@/lib/schema/peticion';
import { rutaIdSchema } from '@/lib/entidades/types';
import { CATALOGO, getEntidad, getRuta } from '@/lib/entidades';
import { FUNDAMENTOS, LEGAL_VERSION, fraseTermino } from '@/lib/legal/rules';
import { analizarRelato } from '@/lib/intake/analyze';
export async function GET() {
  try {
    const { db, user } = await requireUser();
    const { data, error } = await db
      .from('petitions')
      .select('*, filings!filings_petition_id_fkey(*), events(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return json({ cases: data });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    const { user } = await requireUser();
    const schema = z.object({
      id: z.uuid(),
      entitySlug: z.string(),
      pathway: rutaIdSchema,
      documento: peticionDocumentSchema,
      consent: z.literal(true),
    });
    const result = schema.safeParse(await readJson(req, 96_000));
    if (!result.success)
      throw new HttpError(400, 'Revisa el documento y confirma que deseas guardarlo.');
    const body = result.data,
      entity = getEntidad(body.entitySlug);
    if (!entity?.activa) throw new HttpError(400, 'Entidad no disponible.');
    if (
      analizarRelato({
        quePaso: body.documento.hechos.join(' '),
        quePides: body.documento.peticiones.join(' '),
      }).status === 'referral'
    )
      throw new HttpError(
        422,
        'Este caso requiere una ruta especializada. Consulta la guía oficial.',
      );
    const route = getRuta(entity, body.pathway),
      admin = serviceClient();
    const document = {
      ...body.documento,
      tipo: route.tipo,
      destinatario: { entidad: entity.nombre, dependencia: '', ciudad: '' },
      fundamentos: FUNDAMENTOS,
      solicitudRespuestaTermino: fraseTermino(route.diasHabiles),
    };
    const { data: id, error } = await admin.rpc('save_case', {
      p_id: body.id,
      p_user_id: user.id,
      p_entity: entity.slug,
      p_pathway: route.id,
      p_tipo: route.tipo,
      p_document: document,
      p_catalog: CATALOGO.version,
      p_rule: LEGAL_VERSION,
    });
    if (error) throw error;
    if (!id) throw new HttpError(429, 'Tu cuenta alcanzó el límite de 100 solicitudes.');
    return json({ id }, 201);
  } catch (e) {
    return fail(e);
  }
}
