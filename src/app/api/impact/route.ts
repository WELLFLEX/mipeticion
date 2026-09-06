import { serviceConfigured } from '@/lib/server/config';
import { serviceClient } from '@/lib/server/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  let counts: Record<string, number> = {};
  if (serviceConfigured()) {
    try {
      const { data, error } = await serviceClient().rpc('public_impact');
      if (!error) counts = data ?? {};
    } catch {
      /* Suppress unavailable aggregates. */
    }
  }
  return Response.json(
    {
      period: new Date().toISOString().slice(0, 7),
      counts,
      methodology:
        'Solo eventos registrados por las personas. Grupos de al menos 10; totales redondeados hacia abajo a decenas.',
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
