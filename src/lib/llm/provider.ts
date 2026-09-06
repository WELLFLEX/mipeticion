import type { Entidad } from '@/lib/entidades';
import type { DraftInput, GeneratedContent } from '@/lib/schema/peticion';
export interface GenerarParams {
  input: DraftInput;
  entity: Entidad;
}
export interface GenerationUsage {
  inputTokens: number;
  outputTokens: number;
}
export interface LLMProvider {
  readonly nombre: string;
  generarContenido(params: GenerarParams): Promise<GeneratedContent>;
}
