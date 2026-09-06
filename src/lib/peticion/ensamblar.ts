import { getEntidad, getRuta } from '@/lib/entidades';
import { docTypeLabel, type DocType } from '@/lib/legal/constants';
import { FUNDAMENTOS, fraseTermino } from '@/lib/legal/rules';
import {
  peticionDocumentSchema,
  type GeneratedContent,
  type IntakeInput,
  type PeticionDocument,
} from '@/lib/schema/peticion';
export { fraseTermino };
export const firmaDocumento = (type: DocType, number: string) =>
  `${docTypeLabel(type)} No. ${number}`;
export function ensamblarPeticion({
  input,
  content,
  ciudadFecha,
}: {
  input: IntakeInput;
  content: GeneratedContent;
  ciudadFecha: string;
}): PeticionDocument {
  const entity = getEntidad(input.entitySlug);
  if (!entity) throw new Error('Entidad no disponible');
  const route = getRuta(entity, input.pathway);
  const p = input.peticionario;
  return peticionDocumentSchema.parse({
    tipo: route.tipo,
    ciudadFecha,
    destinatario: { entidad: entity.nombre, dependencia: '', ciudad: '' },
    asunto: content.asunto,
    peticionario: p,
    saludo: 'Respetados señores:',
    cuerpoIntro: 'Me dirijo respetuosamente a ustedes para presentar la siguiente solicitud.',
    hechos: content.hechos,
    fundamentos: FUNDAMENTOS,
    peticiones: content.peticiones,
    solicitudRespuestaTermino: fraseTermino(route.diasHabiles),
    notificacion: { direccion: p.direccionNotificacion, correo: p.correo },
    firma: { nombre: p.nombre, documento: firmaDocumento(p.docType, p.docNumber) },
  });
}
