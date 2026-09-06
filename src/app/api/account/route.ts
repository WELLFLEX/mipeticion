import { z } from 'zod';
import { requireUser, serviceClient, sessionClient } from '@/lib/server/db';
import { readJson, json, fail, sameOrigin, HttpError } from '@/lib/server/http';
export async function PATCH(req: Request) {
  try {
    const { user } = await requireUser();
    const result = z.object({ reminders: z.boolean() }).safeParse(await readJson(req));
    if (!result.success) throw new HttpError(400, 'Preferencia inválida.');
    const { error } = await serviceClient().rpc('set_reminders', {
      p_user_id: user.id,
      p_enabled: result.data.reminders,
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const { user } = await requireUser();
    const db = await sessionClient();
    const { error: signOutError } = await db.auth.signOut({ scope: 'global' });
    if (signOutError) throw signOutError;
    const { error } = await serviceClient().auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
