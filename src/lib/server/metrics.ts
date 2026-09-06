import { serviceConfigured } from './config';
import { serviceClient } from './db';
export async function metric(
  name: 'draft_template' | 'draft_ai' | 'draft_fallback' | 'routing_clarify' | 'routing_referral',
) {
  if (!serviceConfigured()) return;
  try {
    await serviceClient().rpc('record_metric', { p_name: name });
  } catch {
    /* Metrics never block citizen work. */
  }
}
