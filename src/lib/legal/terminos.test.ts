import { describe, expect, it } from 'vitest';
import {
  calcularVencimiento,
  contarDiasHabiles,
  esDiaHabil,
  evaluarTermino,
  sumarDiasHabiles,
} from './terminos';
import { parseISODate } from './date-utils';

describe('esDiaHabil', () => {
  it('excluye fines de semana y festivos', () => {
    expect(esDiaHabil(parseISODate('2026-07-16'))).toBe(true); // jueves
    expect(esDiaHabil(parseISODate('2026-07-18'))).toBe(false); // sábado
    expect(esDiaHabil(parseISODate('2026-07-19'))).toBe(false); // domingo
    expect(esDiaHabil(parseISODate('2026-07-20'))).toBe(false); // festivo
  });
});

describe('sumarDiasHabiles', () => {
  it('cuenta a partir del día siguiente (no incluye el día de inicio)', () => {
    // viernes 2026-07-17 + 1 hábil = lunes 2026-07-20 es festivo -> martes 21
    expect(sumarDiasHabiles(parseISODate('2026-07-17'), 1)).toEqual(parseISODate('2026-07-21'));
  });
  it('devuelve la misma fecha con n <= 0', () => {
    expect(sumarDiasHabiles(parseISODate('2026-07-16'), 0)).toEqual(parseISODate('2026-07-16'));
  });
});

describe('calcularVencimiento — radicación 2026-07-16 (jueves)', () => {
  // Días hábiles trazados a mano contra el calendario oficial 2026
  // (festivos relevantes: 20-jul, 07-ago, 17-ago).
  it('petición de información = 10 días hábiles -> 2026-07-31', () => {
    const v = calcularVencimiento('2026-07-16', 'peticion_informacion');
    expect(v.terminoDias).toBe(10);
    expect(v.fechaVencimiento).toBe('2026-07-31');
  });

  it('petición general = 15 días hábiles -> 2026-08-10', () => {
    const v = calcularVencimiento('2026-07-16', 'peticion_interes_particular');
    expect(v.terminoDias).toBe(15);
    expect(v.fechaVencimiento).toBe('2026-08-10');
  });

  it('consulta = 30 días hábiles -> 2026-09-01', () => {
    const v = calcularVencimiento('2026-07-16', 'consulta');
    expect(v.terminoDias).toBe(30);
    expect(v.fechaVencimiento).toBe('2026-09-01');
  });
});

describe('contarDiasHabiles', () => {
  it('cuenta el intervalo (desde, hasta] excluyendo el inicio', () => {
    // 2026-07-16 (jue) -> 2026-07-21 (mar): 17 hábil, 20 festivo, 21 hábil = 2
    expect(contarDiasHabiles(parseISODate('2026-07-16'), parseISODate('2026-07-21'))).toBe(2);
  });
  it('devuelve 0 cuando hasta <= desde', () => {
    expect(contarDiasHabiles(parseISODate('2026-07-20'), parseISODate('2026-07-16'))).toBe(0);
  });
});

describe('evaluarTermino', () => {
  const venc = '2026-08-10';
  it('en término cuando faltan varios días hábiles', () => {
    const r = evaluarTermino(venc, parseISODate('2026-07-16'));
    expect(r.estado).toBe('en_termino');
    expect(r.vencido).toBe(false);
    expect(r.diasHabilesRestantes).toBe(15);
  });
  it('por vencer cuando faltan 3 días hábiles o menos', () => {
    // 2026-08-06 (jue) -> 07 festivo, fin de semana, 10 lunes = 1 hábil restante
    const r = evaluarTermino(venc, parseISODate('2026-08-06'));
    expect(r.estado).toBe('por_vencer');
    expect(r.vencido).toBe(false);
  });
  it('vencido cuando la referencia supera el vencimiento', () => {
    const r = evaluarTermino(venc, parseISODate('2026-08-11'));
    expect(r.estado).toBe('vencido');
    expect(r.vencido).toBe(true);
    expect(r.diasHabilesRestantes).toBe(0);
  });
});
