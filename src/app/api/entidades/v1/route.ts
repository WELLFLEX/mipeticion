import { CATALOGO } from '@/lib/entidades';
export const dynamic = 'force-static';
export async function GET() {
  return Response.json(CATALOGO, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
