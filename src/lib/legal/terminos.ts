/**
 * Cálculo de términos legales en días hábiles (Ley 1755 de 2015).
 *
 * "Días hábiles" = excluye sábados, domingos y festivos nacionales de Colombia.
 * La convención de conteo es "los N días siguientes a la recepción": se cuenta a
 * partir del día siguiente a la radicación (el día de radicación no cuenta).
 */
import { PetitionTipo, terminoDias } from './constants';
import { addUTCDays, esFinDeSemana, parseISODate, toISODate } from './date-utils';
import { esFestivo } from './festivos';

/** True si la fecha es día hábil (ni fin de semana ni festivo). */
export function esDiaHabil(date: Date): boolean {
  return !esFinDeSemana(date) && !esFestivo(date);
}

/**
 * Suma `n` días hábiles a partir del día SIGUIENTE a `desde`.
 * Devuelve la fecha del n-ésimo día hábil (la fecha de vencimiento del término).
 */
export function sumarDiasHabiles(desde: Date, n: number): Date {
  let cursor = new Date(desde.getTime());
  if (n <= 0) return cursor;
  let contados = 0;
  while (contados < n) {
    cursor = addUTCDays(cursor, 1);
    if (esDiaHabil(cursor)) contados++;
  }
  return cursor;
}

/**
 * Cuenta los días hábiles en el intervalo (desde, hasta] — excluye `desde` e
 * incluye `hasta` si es hábil. Devuelve 0 si `hasta` <= `desde`.
 */
export function contarDiasHabiles(desde: Date, hasta: Date): number {
  if (hasta.getTime() <= desde.getTime()) return 0;
  let cursor = new Date(desde.getTime());
  let contados = 0;
  while (cursor.getTime() < hasta.getTime()) {
    cursor = addUTCDays(cursor, 1);
    if (esDiaHabil(cursor)) contados++;
  }
  return contados;
}

export interface Vencimiento {
  terminoDias: number;
  fechaRadicacion: string; // YYYY-MM-DD
  fechaVencimiento: string; // YYYY-MM-DD
}

/** Calcula la fecha de vencimiento del término legal para una radicación. */
export function calcularVencimiento(fechaRadicacionISO: string, tipo: PetitionTipo): Vencimiento {
  const dias = terminoDias(tipo);
  const inicio = parseISODate(fechaRadicacionISO);
  const fin = sumarDiasHabiles(inicio, dias);
  return {
    terminoDias: dias,
    fechaRadicacion: toISODate(inicio),
    fechaVencimiento: toISODate(fin),
  };
}

export type EstadoTermino = 'en_termino' | 'por_vencer' | 'vencido';

export interface EstadoVencimiento {
  estado: EstadoTermino;
  /** Días hábiles restantes hasta el vencimiento (0 si ya venció). */
  diasHabilesRestantes: number;
  vencido: boolean;
}

/**
 * Evalúa el estado de un término frente a una fecha de referencia.
 * `por_vencer` cuando faltan 3 días hábiles o menos.
 */
export function evaluarTermino(fechaVencimientoISO: string, referencia: Date): EstadoVencimiento {
  const vencimiento = parseISODate(fechaVencimientoISO);
  const restantes = contarDiasHabiles(referencia, vencimiento);
  const vencido = vencimiento.getTime() < referencia.getTime();
  let estado: EstadoTermino;
  if (vencido) estado = 'vencido';
  else if (restantes <= 3) estado = 'por_vencer';
  else estado = 'en_termino';
  return { estado, diasHabilesRestantes: vencido ? 0 : restantes, vencido };
}
