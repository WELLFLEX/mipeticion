import { z } from 'zod';
import raw from '../../../data/catalog/entidades.v1.json';
import { entidadSchema, type Entidad, type RutaId } from './types';
export const CATALOGO = z
  .object({
    version: z.string(),
    publicadoEl: z.iso.date(),
    licencia: z.string(),
    entidades: z.array(entidadSchema),
  })
  .parse(raw);
export const ENTIDADES = CATALOGO.entidades;
export const DIAN = ENTIDADES.find((e) => e.slug === 'dian')!;
export const getEntidad = (slug: string) => ENTIDADES.find((e) => e.slug === slug);
export const getRuta = (entidad: Entidad, id: RutaId) => entidad.rutas.find((r) => r.id === id)!;
export const listarEntidadesActivas = () => ENTIDADES.filter((e) => e.activa);
export function fuenteDesactualizada(fecha: string, now = new Date()): boolean {
  return now.getTime() - Date.parse(fecha + 'T00:00:00Z') > 30 * 86400_000;
}
export type { Entidad, Ruta, RutaId, Fuente } from './types';
