import { getRuta } from '@/lib/entidades';
import type { GenerarParams, LLMProvider } from './provider';
export class TemplateProvider implements LLMProvider {
  readonly nombre = 'plantilla';
  async generarContenido({ input, entity }: GenerarParams) {
    // Preserve every character: never truncate or silently discard the person's facts.
    const split = (text: string) =>
      text.split(/\n+/).flatMap((line) => {
        const chunks: string[] = [];
        let remaining = line.trim();
        while (remaining.length > 1100) {
          let at = remaining.lastIndexOf(' ', 1100);
          if (at < 1) at = 1100;
          chunks.push(remaining.slice(0, at));
          remaining = remaining.slice(at).trim();
        }
        if (remaining) chunks.push(remaining);
        return chunks;
      });
    return {
      asunto: `${getRuta(entity, input.pathway).titulo} — ${entity.nombreCorto}`,
      saludo: 'Respetados señores:',
      cuerpoIntro: '',
      hechos: split(input.quePaso),
      peticiones: split(input.quePides),
    };
  }
}
