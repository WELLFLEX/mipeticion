import { z } from 'zod';
import { narrativeSchema } from '@/lib/intake/analyze';
import { rutaIdSchema } from '@/lib/entidades/types';
export const docTypeSchema = z.enum(['CC', 'NIT', 'CE', 'PASAPORTE', 'TI']);
export const petitionTipoSchema = z.enum([
  'peticion_interes_particular',
  'peticion_interes_general',
  'peticion_informacion',
  'consulta',
  'queja',
  'reclamo',
  'sugerencia',
  'denuncia',
]);
export const peticionarioSchema = z.object({
  nombre: z.string().trim().min(3, 'Ingresa tu nombre completo.').max(160),
  docType: docTypeSchema,
  docNumber: z.string().trim().min(3, 'Ingresa tu documento.').max(40),
  correo: z.string().trim().email('Ingresa un correo válido.').max(160),
  ciudad: z.string().trim().min(2, 'Ingresa tu ciudad.').max(80),
  direccionNotificacion: z.string().trim().max(200).default(''),
});
export type Peticionario = z.infer<typeof peticionarioSchema>;
// Identity is deliberately absent from this API contract.
export const draftInputSchema = narrativeSchema
  .extend({
    entitySlug: z.string().max(60),
    pathway: rutaIdSchema,
    mode: z.enum(['ai', 'template']).default('template'),
    aceptaVeracidad: z.literal(true),
    aceptaTratamientoDatos: z.literal(true),
  })
  .strict();
export type DraftInput = z.infer<typeof draftInputSchema>;
export const intakeInputSchema = draftInputSchema.extend({ peticionario: peticionarioSchema });
export type IntakeInput = z.infer<typeof intakeInputSchema>;
const item = z.string().trim().min(1).max(1200);
export const generatedContentSchema = z.object({
  asunto: z.string().trim().min(3).max(240),
  saludo: z.string().trim().max(200).default('Respetados señores:'),
  cuerpoIntro: z.string().trim().max(1200).default(''),
  hechos: z.array(item).min(1).max(40),
  peticiones: z.array(item).min(1).max(20),
});
export type GeneratedContent = z.infer<typeof generatedContentSchema>;
export const peticionDocumentSchema = z.object({
  tipo: petitionTipoSchema,
  ciudadFecha: z.string().min(3).max(120),
  destinatario: z.object({
    entidad: z.string().min(3).max(200),
    dependencia: z.string().max(160).default(''),
    ciudad: z.string().max(80).default(''),
  }),
  asunto: z.string().min(3).max(240),
  peticionario: peticionarioSchema,
  saludo: z.string().max(200).default(''),
  cuerpoIntro: z.string().max(1200).default(''),
  hechos: z.array(item).min(1).max(40),
  fundamentos: z.array(item).min(1).max(20),
  peticiones: z.array(item).min(1).max(20),
  solicitudRespuestaTermino: z.string().min(3).max(800),
  notificacion: z.object({
    direccion: z.string().max(200).default(''),
    correo: z.string().email().max(160),
  }),
  firma: z.object({ nombre: z.string().min(1).max(160), documento: z.string().min(1).max(120) }),
});
export type PeticionDocument = z.infer<typeof peticionDocumentSchema>;
export const generationMetaSchema = z.object({
  tipo: petitionTipoSchema,
  tipoLabel: z.string(),
  terminoDias: z.number(),
  proveedor: z.string(),
  entitySlug: z.string(),
  pathway: rutaIdSchema,
  catalogVersion: z.string(),
  ruleVersion: z.string(),
  fallbackReason: z.string().optional(),
});
export const generateResponseSchema = z.object({
  documento: peticionDocumentSchema,
  meta: generationMetaSchema,
});
export type GenerateResponse = z.infer<typeof generateResponseSchema>;
export const contentResponseSchema = z.object({
  content: generatedContentSchema,
  meta: generationMetaSchema,
});
