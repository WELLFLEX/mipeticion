import { z } from 'zod';
import { ENTIDADES, getEntidad, type RutaId } from '@/lib/entidades';
export const narrativeSchema = z.object({
  quePaso: z.string().trim().min(20, 'Cuéntanos un poco más: al menos 20 caracteres.').max(4000),
  quePides: z.string().trim().min(10, 'Describe qué necesitas: al menos 10 caracteres.').max(2000),
});
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export interface Analysis {
  notice?: string;
  provider?: string;
  status: 'supported' | 'clarify' | 'referral';
  candidates: { entitySlug: string; reason: string; sourceUrl: string }[];
  pathway: RutaId | null;
  questions: string[];
  referral?: { title: string; description: string; url: string };
}
const REFERRALS = [
  {
    pattern:
      /\b(eps|ips|supersalud|medicamento|urgencia|riesgo vital|hospital|salud|no puedo respirar)\b/,
    title: 'Tu situación necesita una ruta de salud',
    description:
      'Los reclamos de salud pueden requerir atención inmediata y reglas especiales. Consulta los canales oficiales de Supersalud. Si hay peligro inmediato, busca atención de urgencias; no esperes una petición.',
    url: 'https://www.supersalud.gov.co/es-co/atencion-ciudadano/pqrd',
  },
  {
    pattern:
      /\b(superservicios|acueducto|alcantarillado|energia|agua|gas|servicios publicos|luz)\b/,
    title: 'Consulta la ruta de servicios públicos',
    description:
      'El reclamo puede corresponder primero a la empresa prestadora. Superservicios explica los pasos y recursos aplicables.',
    url: 'https://www.superservicios.gov.co/',
  },
  {
    pattern:
      /\b(tutela|apelacion|recurso|revocatoria|reconocimiento de pension|reconozcan (?:mi |la )?pension|pensionarme|acuerdo de pago|negociar (?:mi |la )?deuda|condonacion|prescripcion|embargo|denuncia|corrupcion|amenaza|penal|anonim[ao]|colectiva|en nombre de|en representacion)\b/,
    title: 'Este caso necesita una orientación específica',
    description:
      'Esta versión ayuda con información, estado de trámites y atención administrativa. Los recursos, decisiones de fondo, denuncias y solicitudes de otras personas siguen rutas particulares. Consulta a la entidad o solicita orientación en la Defensoría.',
    url: 'https://www.defensoria.gov.co/',
  },
];
export function analizarRelato(input: z.infer<typeof narrativeSchema>): Analysis {
  const text = normalize(input.quePaso + ' ' + input.quePides);
  const explicit = ENTIDADES.filter((e) =>
    e.aliases.some((a) => new RegExp(`\\b${normalize(a)}\\b`).test(text)),
  );
  const referral = REFERRALS.find((r) => r.pattern.test(text));
  if (referral)
    return {
      status: 'referral',
      candidates: [],
      pathway: null,
      questions: [],
      referral: {
        title: referral.title,
        description: referral.description,
        url:
          explicit.length === 1 && referral === REFERRALS[2]
            ? explicit[0].tramiteDirecto.url
            : referral.url,
      },
    };
  const requested = normalize(input.quePides);
  const detect = (value: string): RutaId | null => {
    if (
      /\b(copia|copias|documento|documentos|historia laboral|certificad[oa]|estado de cuenta)\b/.test(
        value,
      )
    )
      return 'informacion';
    if (
      /\b(atencion|groser[oa]|maltrato|funcionario|trato|atendieron|queja|me gritaron)\b/.test(
        value,
      )
    )
      return 'atencion';
    if (
      /\b(estado|radicado|tramite|solicitud|respuesta|demora|no me responden|en que va|como va|en que quedo)\b/.test(
        value,
      )
    )
      return 'estado';
    if (/\b(informacion|requisitos|horario|horarios|orientacion)\b/.test(value))
      return 'informacion';
    return null;
  };
  const pathway = detect(requested) ?? detect(text);
  const candidates = explicit.map((e) => ({
    entitySlug: e.slug,
    reason: `Tu relato menciona asuntos relacionados con ${e.nombreCorto}. Confirma que esa fue la entidad con la que realizaste el trámite.`,
    sourceUrl: e.fuentes[0].url,
  }));
  return {
    status: explicit.length === 1 && pathway ? 'supported' : 'clarify',
    candidates,
    pathway,
    questions: [
      ...(explicit.length !== 1
        ? ['¿Con cuál entidad realizaste o necesitas realizar la solicitud?']
        : []),
      ...(!pathway
        ? ['¿Necesitas información, conocer el estado de un trámite o reportar la atención?']
        : []),
    ],
  };
}
export function validarDestino(entitySlug: string, pathway: RutaId) {
  const entity = getEntidad(entitySlug);
  return entity?.activa ? entity.rutas.find((r) => r.id === pathway) : undefined;
}
