import { describe, it, expect } from 'vitest';
import { ENTIDADES } from '@/lib/entidades';
import { TemplateProvider } from '@/lib/llm/template';
import { construirMensajeUsuario } from '@/lib/llm/prompt';
import { ensamblarPeticion } from './ensamblar';
import { generatedContentSchema, draftInputSchema } from '@/lib/schema/peticion';
import { FUNDAMENTOS } from '@/lib/legal/rules';
const identity = {
  nombre: 'Persona de Prueba',
  docType: 'CC' as const,
  docNumber: 'SYNTHETIC-123',
  correo: 'prueba@example.com',
  ciudad: 'Bogotá',
  direccionNotificacion: '',
};
describe('all fifteen drafting journeys', () => {
  for (const entity of ENTIDADES)
    for (const route of entity.rutas)
      it(entity.slug + ' / ' + route.id, async () => {
        const input = {
          quePaso: 'Realicé una gestión y necesito recibir orientación sobre lo sucedido.',
          quePides: 'Solicito que me expliquen los pasos que corresponden.',
          entitySlug: entity.slug,
          pathway: route.id,
          mode: 'template' as const,
          aceptaVeracidad: true as const,
          aceptaTratamientoDatos: true as const,
        };
        const content = generatedContentSchema.parse(
          await new TemplateProvider().generarContenido({ input, entity }),
        );
        const doc = ensamblarPeticion({
          input: { ...input, peticionario: identity },
          content,
          ciudadFecha: 'Bogotá, 6 de septiembre de 2026',
        });
        expect(doc.destinatario.entidad).toBe(entity.nombre);
        expect(doc.destinatario.ciudad).toBe('');
        expect(doc.hechos.join(' ')).toBe(input.quePaso);
        expect(doc.peticiones.join(' ')).toBe(input.quePides);
        expect(doc.fundamentos).toEqual(FUNDAMENTOS);
        const prompt = construirMensajeUsuario({
          input: { ...input, peticionario: identity } as typeof input,
          entity,
        });
        for (const secret of [identity.nombre, identity.docNumber, identity.correo])
          expect(prompt).not.toContain(secret);
        expect(draftInputSchema.safeParse({ ...input, peticionario: identity }).success).toBe(
          false,
        );
      });
  it('preserves a long narrative without truncating the last fact', async () => {
    const text = 'A'.repeat(3950) + ' Último hecho relevante.';
    const content = await new TemplateProvider().generarContenido({
      entity: ENTIDADES[0],
      input: {
        quePaso: text,
        quePides: 'Solicito una copia completa.',
        entitySlug: 'dian',
        pathway: 'informacion',
        mode: 'template',
        aceptaVeracidad: true,
        aceptaTratamientoDatos: true,
      },
    });
    expect(content.hechos.join('').replaceAll(' ', '')).toBe(text.replaceAll(' ', ''));
    expect(generatedContentSchema.safeParse(content).success).toBe(true);
  });
});
