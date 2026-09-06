import { serviceConfigured } from './config';
import { serviceClient } from './db';
export function aiSettings() {
  const input = Number(process.env.AI_INPUT_USD_PER_M),
    output = Number(process.env.AI_OUTPUT_USD_PER_M);
  if (
    !process.env.ANTHROPIC_API_KEY ||
    !process.env.LLM_MODEL ||
    !serviceConfigured() ||
    !Number.isFinite(input) ||
    !Number.isFinite(output) ||
    input <= 0 ||
    output <= 0
  )
    return null;
  return {
    key: process.env.ANTHROPIC_API_KEY,
    model: process.env.LLM_MODEL,
    input,
    output,
    cap: Math.min(25, Math.max(0, Number(process.env.AI_MONTHLY_BUDGET_USD ?? 25))),
  };
}
export async function reserveAi(outputTokens = 3000, promptVersion = 'draft-v2') {
  const config = aiSettings();
  if (!config || !Number.isFinite(config.cap)) return null;
  // Bounds exceed the maximum UTF-8 narrative + fixed prompt/catalog supplied by this app.
  const reserved = Math.ceil(
    ((32000 * config.input + outputTokens * config.output) / 1_000_000) * 1_000_000,
  );
  try {
    const { data, error } = await serviceClient().rpc('reserve_ai_budget', {
      p_reserve_micros: reserved,
      p_cap_micros: Math.floor(config.cap * 1_000_000),
      p_model: config.model,
      p_prompt_version: promptVersion,
    });
    return error || !data ? null : { id: data as string, config, reserved };
  } catch {
    return null;
  }
}
export async function finishAi(
  reservation: NonNullable<Awaited<ReturnType<typeof reserveAi>>>,
  usage: { inputTokens: number; outputTokens: number } | null,
  ok: boolean,
  latencyMs: number,
) {
  const actual = usage
    ? Math.ceil(
        usage.inputTokens * reservation.config.input +
          usage.outputTokens * reservation.config.output,
      )
    : reservation.reserved;
  // Unknown provider outcomes consume the full reservation; no budget is released on uncertainty.
  try {
    await serviceClient().rpc('finish_ai_budget', {
      p_id: reservation.id,
      p_actual_micros: actual,
      p_success: ok,
      p_input_tokens: usage?.inputTokens ?? 0,
      p_output_tokens: usage?.outputTokens ?? 0,
      p_latency_ms: Math.round(latencyMs),
    });
  } catch {
    /* The reservation remains charged. */
  }
}
