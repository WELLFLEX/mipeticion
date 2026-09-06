export const TOOL_NAME = 'entregar_contenido_peticion';
export const CONTENT_TOOL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    asunto: { type: 'string' },
    hechos: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 40 },
    peticiones: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
  },
  required: ['asunto', 'hechos', 'peticiones'],
} as const;
