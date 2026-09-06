import { createHmac } from 'node:crypto';
import { serviceConfigured } from '@/lib/server/config';
import { serviceClient } from '@/lib/server/db';
const local = new Map<string, { count: number; until: number }>();
export function callerKey(req: Request) {
  const ip = process.env.VERCEL
    ? req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    : process.env.TRUST_PROXY === 'true'
      ? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      : 'local';
  return createHmac('sha256', process.env.RATE_LIMIT_SECRET || 'local-development')
    .update(ip || 'unknown')
    .digest('hex');
}
export async function quota(key: string, limit: number, seconds = 60): Promise<boolean> {
  if (serviceConfigured()) {
    try {
      const { data, error } = await serviceClient().rpc('consume_quota', {
        p_key: key,
        p_limit: limit,
        p_seconds: seconds,
      });
      return !error && data === true;
    } catch {
      return false;
    }
  }
  // Local, cost-free mode only. Paid AI and accounts require the shared database.
  if (process.env.NODE_ENV === 'production') return false;
  const now = Date.now();
  for (const [k, b] of local) {
    if (b.until < now) local.delete(k);
  }
  if (local.size > 10000) return false;
  const b = local.get(key) ?? { count: 0, until: now + seconds * 1000 };
  b.count++;
  local.set(key, b);
  return b.count <= limit;
}
export async function requestLimit(req: Request, scope: string, limit = 20) {
  return quota(scope + ':' + callerKey(req), limit);
}
