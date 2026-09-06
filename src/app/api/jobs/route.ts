import { timingSafeEqual } from 'node:crypto';
import { storageConfigured } from '@/lib/server/config';
import { serviceClient } from '@/lib/server/db';
import { json } from '@/lib/server/http';
import { sendJobEmail } from '@/lib/server/mail';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(req: Request) {
  const expected = 'Bearer ' + process.env.CRON_SECRET,
    actual = req.headers.get('authorization') ?? '';
  if (
    !process.env.CRON_SECRET ||
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return json({ error: 'Unauthorized' }, 401);
  if (!storageConfigured() || !process.env.RESEND_API_KEY || !process.env.MAIL_FROM)
    return json({ error: 'Worker not configured' }, 503);
  const db = serviceClient();
  const { error: sweepError } = await db.rpc('sweep_retention');
  if (sweepError) return json({ error: 'Maintenance unavailable' }, 503);
  const { data: jobs, error } = await db.rpc('claim_jobs', { p_limit: 5 });
  if (error) return json({ error: 'Queue unavailable' }, 503);
  let sent = 0,
    failed = 0;
  for (const job of jobs ?? []) {
    const { data: context, error: contextError } = await db.rpc('job_context', { p_id: job.id });
    if (contextError) {
      await db.rpc('finish_job', { p_id: job.id, p_success: false });
      failed++;
      continue;
    }
    if (!context) {
      await db.rpc('finish_job', { p_id: job.id, p_success: false, p_cancel: true });
      continue;
    }
    try {
      await sendJobEmail(job.id, context.email, context.kind);
      const { error: finishError } = await db.rpc('finish_job', { p_id: job.id, p_success: true });
      if (finishError) failed++;
      else sent++;
    } catch {
      await db.rpc('finish_job', { p_id: job.id, p_success: false });
      failed++;
    }
  }
  const { data: health, error: healthError } = await db.rpc('worker_health');
  return json(
    { processed: (jobs ?? []).length, sent, failed, queue: health },
    failed || healthError || health?.failed ? 503 : 200,
  );
}
