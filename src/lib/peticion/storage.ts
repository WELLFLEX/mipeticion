import { z } from 'zod';
import {
  generationMetaSchema,
  peticionDocumentSchema,
  peticionarioSchema,
  type Peticionario,
} from '@/lib/schema/peticion';
import { rutaIdSchema } from '@/lib/entidades/types';
import { CATALOGO } from '@/lib/entidades';
import { LEGAL_VERSION } from '@/lib/legal/rules';
export type IdentificacionData = Peticionario;
export interface ProblemaData {
  categoria: string;
  tipoSugerido?: string;
  quePaso: string;
  quePides: string;
  aceptaVeracidad: boolean;
  aceptaTratamientoDatos: boolean;
}
export const DRAFT_KEY = 'mipeticion:borrador:v2';
const LEGACY_KEY = 'mipeticion:borrador:v1';
export const DRAFT_TTL = 7 * 86400_000;
export const borradorSchema = z.object({
  version: z.literal(2),
  actualizado: z.iso.datetime(),
  persistent: z.boolean().default(false),
  quePaso: z.string().max(4000).default(''),
  quePides: z.string().max(2000).default(''),
  entitySlug: z.string().default(''),
  pathway: rutaIdSchema.default('informacion'),
  mode: z.enum(['ai', 'template']).default('template'),
  identificacion: peticionarioSchema.partial().optional(),
  documento: peticionDocumentSchema
    .extend({
      asunto: z.string().max(240),
      hechos: z.array(z.string().max(1200)).min(1).max(40),
      peticiones: z.array(z.string().max(1200)).min(1).max(20),
    })
    .optional(),
  meta: generationMetaSchema.optional(),
});
export type Borrador = z.infer<typeof borradorSchema>;
function decode(raw: string | null, now: number): Borrador | null {
  if (!raw) return null;
  try {
    const b = borradorSchema.parse(JSON.parse(raw));
    return now - Date.parse(b.actualizado) < DRAFT_TTL && Date.parse(b.actualizado) <= now + 60_000
      ? b
      : null;
  } catch {
    return null;
  }
}
export function migrateLegacy(raw: string, now = Date.now()): Borrador | null {
  try {
    const legacy = z
      .object({
        actualizado: z.iso.datetime(),
        identificacion: peticionarioSchema.partial().optional(),
        problema: z
          .object({ quePaso: z.string().max(4000), quePides: z.string().max(2000) })
          .optional(),
        documento: peticionDocumentSchema.optional(),
      })
      .parse(JSON.parse(raw));
    if (
      now - Date.parse(legacy.actualizado) >= DRAFT_TTL ||
      Date.parse(legacy.actualizado) > now + 60_000
    )
      return null;
    const pathway =
      legacy.documento?.tipo === 'queja'
        ? 'atencion'
        : legacy.documento?.tipo === 'peticion_informacion'
          ? 'informacion'
          : 'estado';
    // Legacy documents are preserved for editing; the next generation applies current rules.
    return borradorSchema.parse({
      version: 2,
      actualizado: legacy.actualizado,
      persistent: false,
      identificacion: legacy.identificacion,
      quePaso: legacy.problema?.quePaso ?? '',
      quePides: legacy.problema?.quePides ?? '',
      entitySlug: 'dian',
      pathway,
      documento: legacy.documento,
      meta: legacy.documento
        ? {
            tipo: legacy.documento.tipo,
            tipoLabel: 'Borrador anterior: revisa su contenido',
            terminoDias: 0,
            proveedor: 'legacy',
            entitySlug: 'dian',
            pathway,
            catalogVersion: CATALOGO.version,
            ruleVersion: LEGAL_VERSION,
          }
        : undefined,
    });
  } catch {
    return null;
  }
}
export function cargarBorrador(): Borrador | null {
  if (typeof window === 'undefined') return null;
  try {
    const now = Date.now();
    const b =
      decode(sessionStorage.getItem(DRAFT_KEY), now) ??
      decode(localStorage.getItem(DRAFT_KEY), now);
    if (b) return b;
    sessionStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_KEY);
    const raw = localStorage.getItem(LEGACY_KEY);
    const migrated = raw ? migrateLegacy(raw, now) : null;
    if (migrated) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_KEY);
    return migrated;
  } catch {
    return null;
  }
}
export function guardarBorrador(b: Borrador): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const value = JSON.stringify(borradorSchema.parse(b));
    sessionStorage.setItem(DRAFT_KEY, value);
    if (b.persistent) localStorage.setItem(DRAFT_KEY, value);
    else localStorage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}
export function limpiarBorrador() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* Storage can be disabled. */
  }
}
