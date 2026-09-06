export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: PRIVATE_HEADERS });
}
export function fail(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof Error && error.message === 'Unauthorized')
    return json({ error: 'Inicia sesión para continuar.' }, 401);
  // Never log request bodies, provider error objects, SQL messages, or personal information.
  console.error('[request] operation_failed');
  return json({ error: 'El servicio no está disponible ahora. Intenta de nuevo.' }, 503);
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (
    origin &&
    origin !== (process.env.APP_URL ? new URL(process.env.APP_URL).origin : new URL(req.url).origin)
  )
    throw new HttpError(403, 'Origen no permitido.');
  if (req.headers.get('sec-fetch-site') === 'cross-site')
    throw new HttpError(403, 'Origen no permitido.');
}
export async function readJson(req: Request, maxBytes = 32_000): Promise<unknown> {
  sameOrigin(req);
  if (!req.headers.get('content-type')?.includes('application/json'))
    throw new HttpError(415, 'Se requiere JSON.');
  if (Number(req.headers.get('content-length') || 0) > maxBytes)
    throw new HttpError(413, 'El contenido es demasiado extenso.');
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, 'Solicitud vacía.');
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, 'El contenido es demasiado extenso.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    body.set(c, at);
    at += c.length;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
}
