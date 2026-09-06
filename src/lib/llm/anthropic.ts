import Anthropic from '@anthropic-ai/sdk';
import { validateModelContent } from './validate';
import { CONTENT_TOOL_SCHEMA, TOOL_NAME } from './json-schema';
import { SYSTEM_PROMPT, construirMensajeUsuario } from './prompt';
import type { GenerarParams, LLMProvider, GenerationUsage } from './provider';
export class AnthropicProvider implements LLMProvider {
  readonly nombre = 'anthropic';
  usage: GenerationUsage = { inputTokens: 0, outputTokens: 0 };
  private client: Anthropic;
  constructor(
    key: string,
    private model: string,
  ) {
    this.client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: 25_000 });
  }
  async generarContenido(params: GenerarParams) {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: construirMensajeUsuario(params) }],
      tools: [
        {
          name: TOOL_NAME,
          description: 'Entrega el asunto, los hechos y las peticiones.',
          input_schema: { ...CONTENT_TOOL_SCHEMA, required: [...CONTENT_TOOL_SCHEMA.required] },
        },
      ],
      tool_choice: { type: 'tool', name: TOOL_NAME },
    });
    this.usage = {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
    const result = message.content.find((b) => b.type === 'tool_use');
    if (!result || result.type !== 'tool_use') throw new Error('Invalid generation');
    return validateModelContent(result.input, params.input);
  }
}
