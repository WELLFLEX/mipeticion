/**
 * Utilidades de fecha ancladas a UTC.
 *
 * Colombia es UTC-5 sin horario de verano, así que representar las fechas "solo
 * día" en UTC es determinista y evita corrimientos por zona horaria del servidor
 * o del navegador. Todas las funciones trabajan sobre la parte de fecha (Y-M-D).
 */

/** Formatea una fecha como 'YYYY-MM-DD' usando sus componentes UTC. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Crea una fecha UTC a partir de componentes (mes 1-based: 1 = enero). */
export function utcDate(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day));
}

/** Parsea 'YYYY-MM-DD' a una fecha anclada a medianoche UTC. Lanza si es inválida. */
export function parseISODate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) throw new Error(`Fecha ISO inválida: "${iso}" (se espera YYYY-MM-DD)`);
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (Number.isNaN(date.getTime()) || toISODate(date) !== iso.trim())
    throw new Error(`Fecha inválida: "${iso}"`);
  return date;
}

/** Devuelve una nueva fecha desplazada `days` días (puede ser negativo). */
export function addUTCDays(date: Date, days: number): Date {
  const r = new Date(date.getTime());
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

/** Día de la semana en UTC: 0 = domingo … 6 = sábado. */
export function utcDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

/** True si la fecha cae en sábado o domingo. */
export function esFinDeSemana(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6;
}

/** Fecha de "hoy" en la zona horaria de Colombia, anclada a UTC (solo día). */
export function hoyEnColombia(now: Date = new Date()): Date {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // 'YYYY-MM-DD'
  return parseISODate(iso);
}

/** Formatea una fecha en español largo: "18 de julio de 2026". */
export function formatFechaLarga(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
