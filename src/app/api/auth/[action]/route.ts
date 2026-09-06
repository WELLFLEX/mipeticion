import { z } from 'zod';
import { createHmac } from 'node:crypto';
import { sessionClient, serviceClient } from '@/lib/server/db';
import { storageConfigured } from '@/lib/server/config';
import { readJson, json, fail, sameOrigin, HttpError } from '@/lib/server/http';
import { quota, requestLimit } from '@/lib/rate-limit';
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .transform((v) => v.toLowerCase());
export async function GET(_req: Request, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== 'session') return json({ error: 'No encontrado' }, 404);
  if (!storageConfigured()) return json({ available: false, user: null });
  try {
    const db = await sessionClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return json({ available: true, user: null });
    const { data: profile } = await db
      .from('profiles')
      .select('reminders_enabled')
      .eq('id', user.id)
      .single();
    return json({
      available: true,
      user: profile
        ? { email: user.email, id: user.id, reminders: profile.reminders_enabled }
        : null,
    });
  } catch {
    return json({ available: true, user: null });
  }
}
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    if (!storageConfigured())
      throw new HttpError(
        503,
        'El seguimiento con cuenta todavía no está disponible en esta instalación.',
      );
    sameOrigin(req);
    const action = (await params).action;
    if (!(await requestLimit(req, 'auth', 6)))
      throw new HttpError(429, 'Espera un minuto antes de intentar de nuevo.');
    const db = await sessionClient();
    if (action === 'logout') {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      return json({ ok: true });
    }
    const raw = await readJson(req);
    if (action === 'request') {
      const parsed = z.object({ email: emailSchema, consent: z.literal(true) }).safeParse(raw);
      if (!parsed.success)
        throw new HttpError(400, 'Revisa el correo y acepta el tratamiento para tu cuenta.');
      const email = parsed.data.email;
      const admin = serviceClient();
      const { count, error: countError } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      if (countError) throw new HttpError(503, 'El seguimiento no está disponible.');
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      const limit = Math.min(50, Math.max(0, Number(process.env.BETA_LIMIT ?? 50)));
      if (!existing && (count ?? 0) >= limit)
        throw new HttpError(
          429,
          'Los cupos de este piloto están completos. Puedes seguir preparando y descargando tus peticiones sin cuenta.',
        );
      const hash = createHmac('sha256', process.env.RATE_LIMIT_SECRET!).update(email).digest('hex');
      if (!(await quota('auth-email:' + hash, 3, 3600)) || !(await reserveEmail()))
        throw new HttpError(
          429,
          'Alcanzamos el límite temporal de correos. Vuelve a intentarlo más tarde.',
        );
      const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error)
        throw new HttpError(
          503,
          'No pudimos enviar el código. Revisa el correo e intenta más tarde.',
        );
      return json({ ok: true });
    }
    if (action === 'verify') {
      const parsed = z
        .object({ email: emailSchema, token: z.string().regex(/^\d{6,10}$/) })
        .safeParse(raw);
      if (!parsed.success) throw new HttpError(400, 'Revisa el código de tu correo.');
      const { data, error } = await db.auth.verifyOtp({ ...parsed.data, type: 'email' });
      if (error || !data.user?.email)
        throw new HttpError(401, 'El código no es válido o expiró. Solicita uno nuevo.');
      const { data: enrolled, error: enrollError } = await serviceClient().rpc('enroll_profile', {
        p_user_id: data.user.id,
        p_email: data.user.email,
        p_limit: Number(process.env.BETA_LIMIT ?? 50),
      });
      if (enrollError || !enrolled) {
        await db.auth.signOut();
        throw new HttpError(
          429,
          'No hay cupos disponibles para guardar solicitudes en este momento.',
        );
      }
      return json({ ok: true });
    }
    throw new HttpError(404, 'No encontrado.');
  } catch (e) {
    return fail(e);
  }
}

async function reserveEmail() {
  const { data, error } = await serviceClient().rpc('reserve_email', { p_kind: 'auth' });
  return !error && data === true;
}
