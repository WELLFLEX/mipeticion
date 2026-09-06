import { z } from 'zod';
import { quota } from '@/lib/rate-limit';
import { requireUser, serviceClient } from '@/lib/server/db';
import { readJson, json, fail, sameOrigin, HttpError } from '@/lib/server/http';
import { caseEventSchema, estimateFor } from '@/lib/tracking/model';
import { rutaIdSchema } from '@/lib/entidades/types';
import { LEGAL_VERSION } from '@/lib/legal/rules';
async function owned(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, 'Solicitud no encontrada.');
  const { db, user } = await requireUser();
  const { data, error } = await db
    .from('petitions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Solicitud no encontrada.');
  return { data, user, db, id };
}
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, id } = await owned(params);
    const { data, error } = await db
      .from('petitions')
      .select('*, filings!filings_petition_id_fkey(*), events(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return json({ case: data });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data, user, db, id } = await owned(params);
    if (!(await quota('case-event:' + user.id, 60, 3600)))
      throw new HttpError(
        429,
        'Alcanzaste el límite temporal de novedades. Vuelve a intentarlo más tarde.',
      );
    const event = caseEventSchema.safeParse(await readJson(req));
    if (!event.success) throw new HttpError(400, event.error.issues[0].message);
    const body = event.data;
    const route = rutaIdSchema.safeParse(data.pathway);
    const estimate =
      route.success && data.rule_version === LEGAL_VERSION
        ? estimateFor(data.entity, route.data, body.date)
        : null;
    if (data.current_filing_id && !['receipt_corrected', 'note'].includes(body.type)) {
      const { data: filing } = await db
        .from('filings')
        .select('filed_date')
        .eq('id', data.current_filing_id)
        .single();
      if (filing && body.date < filing.filed_date)
        throw new HttpError(400, 'La novedad debe ser posterior a la recepción de la solicitud.');
    }
    const { data: ok, error } = await serviceClient().rpc('apply_case_event', {
      p_user_id: user.id,
      p_petition_id: id,
      p_type: body.type,
      p_date: body.date,
      p_radicado: body.radicado,
      p_note: body.note,
      p_due_date: estimate?.date ?? null,
      p_term: estimate?.days ?? null,
    });
    if (error)
      throw new HttpError(
        400,
        'No pudimos registrar la novedad. Verifica que exista un radicado y que el tipo corresponda al estado actual.',
      );
    if (!ok) throw new HttpError(404, 'Solicitud no encontrada.');
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(req);
    const { user, id } = await owned(params);
    const { error } = await serviceClient()
      .from('petitions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
