import { it, expect } from 'vitest';
import { readJson, sameOrigin } from './http';
it('rejects cross-site writes and oversized streaming bodies', async () => {
  expect(() =>
    sameOrigin(
      new Request('https://example.com/api/cases', {
        headers: { origin: 'https://attacker.example' },
      }),
    ),
  ).toThrow('Origen no permitido');
  await expect(
    readJson(
      new Request('https://example.com/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: 'x'.repeat(100) }),
      }),
      20,
    ),
  ).rejects.toThrow('El contenido es demasiado extenso');
});
