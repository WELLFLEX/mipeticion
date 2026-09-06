import { it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/rate-limit', () => ({ requestLimit: vi.fn(async () => true) }));
vi.mock('@/lib/server/metrics', () => ({ metric: vi.fn() }));
vi.mock('@/lib/server/ai', () => ({ reserveAi: vi.fn(async () => null), finishAi: vi.fn() }));
vi.mock('@/lib/llm', async () => {
  const { TemplateProvider } = await import('@/lib/llm/template');
  return {
    TemplateProvider,
    AnthropicProvider: class {
      usage = { inputTokens: 0, outputTokens: 0 };
      generarContenido = async () => {
        throw new Error('provider unavailable');
      };
    },
  };
});
import { POST } from './route';
import { reserveAi } from '@/lib/server/ai';
import { validateModelContent } from '@/lib/llm/validate';
const input = {
  entitySlug: 'sena',
  pathway: 'estado' as const,
  quePaso: 'Presenté una solicitud en el SENA y no tengo respuesta.',
  quePides: 'Quiero conocer en qué va mi trámite.',
  mode: 'ai' as const,
  aceptaVeracidad: true as const,
  aceptaTratamientoDatos: true as const,
};
const req = (body: unknown) =>
  new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
beforeEach(() => vi.mocked(reserveAi).mockResolvedValue(null));
it('labels budget/unavailable fallbacks and preserves the narrative', async () => {
  const r = await POST(req(input));
  expect(r.status).toBe(200);
  const data = await r.json();
  expect(data.meta.proveedor).toBe('plantilla');
  expect(data.meta.fallbackReason).toBeTruthy();
  expect(data.content.hechos).toEqual([input.quePaso]);
});
it('falls back after provider failure without discarding text', async () => {
  vi.mocked(reserveAi).mockResolvedValue({
    id: 'test',
    reserved: 100,
    config: { key: 'synthetic', model: 'synthetic', input: 1, output: 1, cap: 25 },
  });
  const r = await POST(req(input));
  const data = await r.json();
  expect(r.status).toBe(200);
  expect(data.meta.proveedor).toBe('plantilla');
  expect(data.content.peticiones).toEqual([input.quePides]);
});
it('rejects unconfirmed entities, identity fields and explicitly unsupported requests', async () => {
  expect((await POST(req({ ...input, entitySlug: 'invented' }))).status).toBe(400);
  expect((await POST(req({ ...input, peticionario: { nombre: 'do not send' } }))).status).toBe(400);
  expect((await POST(req({ ...input, aceptaVeracidad: false }))).status).toBe(400);
  expect((await POST(req({ ...input, quePides: 'Quiero presentar una tutela.' }))).status).toBe(
    422,
  );
});
it('rejects legal authorities invented inside generated prose', () => {
  expect(() =>
    validateModelContent(
      {
        asunto: 'Solicitud de información',
        hechos: ['Solicito esto según la Ley 9999 de 2040.'],
        peticiones: ['Responda a mi solicitud.'],
      },
      input,
    ),
  ).toThrow('Model added legal authority');
});
