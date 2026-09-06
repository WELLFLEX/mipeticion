import { describe, it, expect } from 'vitest';
import { CATALOGO, ENTIDADES, getEntidad, getRuta, fuenteDesactualizada } from './index';
describe('versioned pilot directory', () => {
  it('contains five unique entities and exactly fifteen supported routes', () => {
    expect(ENTIDADES).toHaveLength(5);
    expect(new Set(ENTIDADES.map((e) => e.slug)).size).toBe(5);
    expect(ENTIDADES.flatMap((e) => e.rutas)).toHaveLength(15);
    for (const entity of ENTIDADES) {
      expect(new Set(entity.rutas.map((r) => r.id)).size).toBe(3);
      for (const route of entity.rutas) {
        expect(entity.fuentes.some((s) => s.id === route.fuenteId)).toBe(true);
        expect(route.diasHabiles).toBe(route.id === 'informacion' ? 10 : 15);
        expect(getRuta(entity, route.id)).toBe(route);
      }
      for (const channel of entity.canales) {
        expect(entity.fuentes.some((s) => s.id === channel.fuenteId)).toBe(true);
        expect(new URL(channel.url).hostname).toMatch(/(\.gov\.co|\.sena\.edu\.co)$/);
      }
    }
    expect(CATALOGO.version).toBe('1.0.0');
    expect(getEntidad('missing')).toBeUndefined();
  });
  it('flags stale sources independently of HTTP availability', () => {
    expect(fuenteDesactualizada('2026-09-06', new Date('2026-09-07'))).toBe(false);
    expect(fuenteDesactualizada('2026-09-06', new Date('2026-11-01'))).toBe(true);
  });
});
