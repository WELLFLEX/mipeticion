import { generatedContentSchema, type GeneratedContent } from '@/lib/schema/peticion';
import type { DraftInput } from '@/lib/schema/peticion';
import { normalize } from '@/lib/intake/analyze';
export function validateModelContent(raw: unknown, input: DraftInput): GeneratedContent {
  const content = generatedContentSchema.parse(raw);
  const source = normalize(input.quePaso + ' ' + input.quePides);
  const output = normalize([content.asunto, ...content.hechos, ...content.peticiones].join(' '));
  // Legal references are controlled data. Reject model-added citations even if embedded in prose.
  const authorities =
    output.match(
      /\b(?:ley|decreto|articulo|sentencia|resolucion)\s+(?:[a-z]-?\s*)?\d+(?:\s+de\s+\d{4})?/g,
    ) ?? [];
  if (authorities.some((reference) => !source.includes(reference)))
    throw new Error('Model added legal authority');
  return content;
}
