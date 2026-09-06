import { z } from 'zod';
const officialUrl = z
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'El canal debe usar HTTPS.');
export const rutaIdSchema = z.enum(['informacion', 'estado', 'atencion']);
export type RutaId = z.infer<typeof rutaIdSchema>;
export const fuenteSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  url: officialUrl,
  verificadoEl: z.iso.date(),
  metodo: z.literal('revision-documental'),
  alcance: z.string(),
});
export const rutaSchema = z.object({
  id: rutaIdSchema,
  titulo: z.string(),
  tipo: z.enum(['peticion_informacion', 'peticion_interes_particular', 'queja']),
  diasHabiles: z.number().int().positive(),
  orientacion: z.string(),
  requisitos: z.array(z.string()).min(1),
  reglaId: z.literal('ley1755-art14-v1'),
  fuenteId: z.string(),
});
export const entidadSchema = z.object({
  slug: z.string().regex(/^[a-z-]+$/),
  nombre: z.string(),
  nombreCorto: z.string(),
  descripcion: z.string(),
  competencia: z.string(),
  nivel: z.literal('nacional'),
  sector: z.string(),
  aliases: z.array(z.string()),
  codigoSigep: z.string().nullable(),
  activa: z.boolean(),
  fuentes: z.array(fuenteSchema).min(1),
  canales: z
    .array(
      z.object({
        tipo: z.enum(['web', 'orientacion']),
        nombre: z.string(),
        url: officialUrl,
        fuenteId: z.string(),
      }),
    )
    .min(1),
  tramiteDirecto: z.object({ titulo: z.string(), descripcion: z.string(), url: officialUrl }),
  ejemplo: z.string(),
  rutas: z.array(rutaSchema).length(3),
});
export type Entidad = z.infer<typeof entidadSchema>;
export type Ruta = z.infer<typeof rutaSchema>;
export type Fuente = z.infer<typeof fuenteSchema>;
