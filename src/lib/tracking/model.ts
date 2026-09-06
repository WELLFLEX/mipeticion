import { z } from 'zod';
import { getEntidad, getRuta, type RutaId } from '@/lib/entidades';
import { parseISODate, hoyEnColombia, toISODate, formatFechaLarga } from '@/lib/legal/date-utils';
import { sumarDiasHabiles } from '@/lib/legal/terminos';
export const caseEventSchema = z
  .object({
    type: z.enum([
      'filed',
      'receipt_corrected',
      'responded',
      'transferred',
      'extended',
      'information_requested',
      'note',
    ]),
    date: z.iso
      .date()
      .refine(
        (v) => v >= '2000-01-01' && v <= toISODate(hoyEnColombia()),
        'Usa una fecha válida de recepción, hasta hoy.',
      ),
    radicado: z.string().trim().max(120).default(''),
    note: z.string().trim().max(2000).default(''),
  })
  .refine(
    (v) => !['filed', 'receipt_corrected'].includes(v.type) || v.radicado.length > 0,
    'Escribe el número de radicado.',
  );
export type CaseEventInput = z.infer<typeof caseEventSchema>;
export interface Filing {
  id: string;
  radicado_number: string;
  filed_date: string;
  due_date: string | null;
  legal_term_days: number | null;
}
export interface CaseEvent {
  id: string;
  type: string;
  occurred_on: string;
  payload: { note?: string; radicado?: string };
  created_at: string;
}
export interface CaseRecord {
  id: string;
  entity: string;
  pathway: RutaId | null;
  document: import('@/lib/schema/peticion').PeticionDocument | null;
  current_filing_id: string | null;
  estimate_state: 'not_filed' | 'estimated' | 'uncertain' | 'responded';
  last_activity_at: string;
  filings: Filing[];
  events: CaseEvent[];
  created_at: string;
}
export const EVENT_LABELS: Record<string, string> = {
  filed: 'Radicación registrada',
  receipt_corrected: 'Fecha o radicado corregido',
  responded: 'Respuesta registrada',
  transferred: 'Traslado informado',
  extended: 'Ampliación informada',
  information_requested: 'La entidad pidió más información',
  note: 'Nota personal',
};
export function estimateFor(entitySlug: string, pathway: RutaId, receipt: string) {
  const entity = getEntidad(entitySlug);
  if (!entity) return null;
  const start = parseISODate(receipt);
  if (receipt < '2000-01-01' || receipt > toISODate(hoyEnColombia())) return null;
  const route = getRuta(entity, pathway);
  return { days: route.diasHabiles, date: toISODate(sumarDiasHabiles(start, route.diasHabiles)) };
}
export function caseStatus(c: CaseRecord, now = hoyEnColombia()) {
  const filing = c.filings.find((f) => f.id === c.current_filing_id);
  if (c.estimate_state === 'responded')
    return {
      label: 'Registraste una respuesta',
      description:
        'Revisa si responde a lo que solicitaste. Puedes consultar orientación oficial si necesitas otro paso.',
    };
  if (c.estimate_state === 'uncertain')
    return {
      label: 'El plazo necesita revisión',
      description:
        'Hay un cambio o una regla que esta calculadora no puede interpretar. Consulta la comunicación de la entidad. No mostramos un conteo que podría ser incorrecto.',
    };
  if (!filing?.due_date)
    return {
      label: 'Pendiente de radicar',
      description: 'Envía la solicitud por el canal oficial y guarda la constancia de recepción.',
    };
  const date = formatFechaLarga(parseISODate(filing.due_date));
  return {
    label:
      filing.due_date < toISODate(now) ? 'No has registrado una respuesta' : 'Esperando respuesta',
    description:
      'Fecha estimada de respuesta: ' +
      date +
      '. Es una referencia general; no verifica el estado oficial ni determina un incumplimiento.',
  };
}
