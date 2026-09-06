import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cargarBorrador,
  guardarBorrador,
  migrateLegacy,
  DRAFT_KEY,
  DRAFT_TTL,
  limpiarBorrador,
  type Borrador,
} from './storage';
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
    clear: () => data.clear(),
  };
}
beforeEach(() => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('sessionStorage', storage());
  vi.stubGlobal('localStorage', storage());
});
afterEach(() => vi.unstubAllGlobals());
const draft = (): Borrador => ({
  version: 2,
  actualizado: new Date().toISOString(),
  persistent: false,
  quePaso: 'Mi relato sintético de prueba',
  quePides: 'Necesito información',
  entitySlug: 'sena',
  pathway: 'informacion',
  mode: 'template',
});
it('keeps guest data in the session unless persistent storage is explicitly selected', () => {
  guardarBorrador(draft());
  expect(sessionStorage.getItem(DRAFT_KEY)).toBeTruthy();
  expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  guardarBorrador({ ...draft(), persistent: true });
  expect(localStorage.getItem(DRAFT_KEY)).toBeTruthy();
  guardarBorrador(draft());
  expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  limpiarBorrador();
  expect(cargarBorrador()).toBeNull();
});
it('discards expired, future and malformed drafts', () => {
  for (const value of [
    JSON.stringify({ ...draft(), actualizado: new Date(Date.now() - DRAFT_TTL - 1).toISOString() }),
    JSON.stringify({ ...draft(), actualizado: '2099-01-01T00:00:00Z' }),
    'broken',
  ]) {
    localStorage.setItem(DRAFT_KEY, value);
    expect(cargarBorrador()).toBeNull();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  }
});
it('migrates a recent DIAN draft once into session storage without inventing identity', () => {
  const old = JSON.stringify({
    actualizado: new Date().toISOString(),
    problema: {
      quePaso: 'Tengo un problema en el portal de la DIAN.',
      quePides: 'Quiero conocer cómo va mi trámite.',
    },
  });
  localStorage.setItem('mipeticion:borrador:v1', old);
  expect(cargarBorrador()?.entitySlug).toBe('dian');
  expect(localStorage.getItem('mipeticion:borrador:v1')).toBeNull();
  expect(cargarBorrador()?.identificacion).toBeUndefined();
  expect(migrateLegacy(JSON.stringify({ actualizado: '2000-01-01T00:00:00Z' }))).toBeNull();
});
