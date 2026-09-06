import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
let db: PGlite;
const alice = randomUUID(),
  bob = randomUUID(),
  charlie = randomUUID();
async function scalar<T = unknown>(sql: string, params: unknown[] = []) {
  return (await db.query<Record<string, T>>(sql, params)).rows[0]?.v;
}
async function makeCase(owner = alice) {
  const id = randomUUID();
  await db.query(
    "select public.save_case($1,$2,'sena','estado','peticion_interes_particular','{}','1.0.0','ley1755-art14-v1')",
    [id, owner],
  );
  return id;
}
async function event(id: string, type: string, date = '2026-07-16') {
  return scalar(
    "select public.apply_case_event($1,$2,$3,$4,'SYNTHETIC-1','',case when $3 in ('filed','receipt_corrected') then '2026-08-10'::date else null end,15) as v",
    [alice, id, type, date],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,service_role,anon;`);
  for (const f of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(readFileSync('supabase/migrations/' + f, 'utf8'));
  for (const [id, email] of [
    [alice, 'alice@example.com'],
    [bob, 'bob@example.com'],
    [charlie, 'charlie@example.com'],
  ])
    await db.query('insert into auth.users values($1,$2)', [id, email]);
  expect(
    await scalar('select public.enroll_profile($1,$2,2) as v', [alice, 'alice@example.com']),
  ).toBe(true);
  expect(await scalar('select public.enroll_profile($1,$2,2) as v', [bob, 'bob@example.com'])).toBe(
    true,
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
it('caps enrollment atomically while allowing existing users back in', async () => {
  expect(
    await scalar('select public.enroll_profile($1,$2,2) as v', [charlie, 'charlie@example.com']),
  ).toBe(false);
  expect(
    await scalar('select public.enroll_profile($1,$2,2) as v', [alice, 'alice@example.com']),
  ).toBe(true);
});
it('enforces ownership on petitions, filings, events and profiles and denies direct writes/RPCs', async () => {
  const a = await makeCase(),
    b = await makeCase(bob);
  await event(a, 'filed');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [bob]);
  await db.exec('set role authenticated');
  try {
    expect(await scalar('select count(*)::int as v from public.petitions where id=$1', [a])).toBe(
      0,
    );
    expect(await scalar('select count(*)::int as v from public.petitions where id=$1', [b])).toBe(
      1,
    );
    expect(
      await scalar('select count(*)::int as v from public.filings where petition_id=$1', [a]),
    ).toBe(0);
    expect(
      await scalar('select count(*)::int as v from public.events where petition_id=$1', [a]),
    ).toBe(0);
    expect(await scalar('select count(*)::int as v from public.profiles')).toBe(1);
    await expect(
      db.query("update public.petitions set status='responded' where id=$1", [b]),
    ).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.consume_quota('steal',10,60)")).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.query('select * from private.jobs')).rejects.toThrow(/permission denied/);
  } finally {
    await db.exec('reset role');
  }
});
it('atomically limits quota and budget; duplicate settlements do not refund twice', async () => {
  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      scalar("select public.consume_quota('test-concurrent',3,60) as v"),
    ),
  );
  expect(results.filter(Boolean)).toHaveLength(3);
  const reservation = await scalar<string>(
    "select public.reserve_ai_budget(20000000,25000000,'synthetic-model') as v",
  );
  expect(reservation).toBeTruthy();
  expect(
    await scalar("select public.reserve_ai_budget(6000000,25000000,'synthetic-model') as v"),
  ).toBeNull();
  await db.query('select public.finish_ai_budget($1,1000000,true,100,100,10)', [reservation]);
  await db.query('select public.finish_ai_budget($1,0,true,0,0,0)', [reservation]);
  expect(Number(await scalar('select spent_micros as v from private.ai_months limit 1'))).toBe(
    1000000,
  );
});
it('retains receipt corrections and suppresses dates after exceptional events', async () => {
  const id = await makeCase();
  expect(await event(id, 'filed')).toBe(true);
  await expect(event(id, 'filed')).rejects.toThrow('Receipt already exists');
  await event(id, 'receipt_corrected', '2026-07-17');
  expect(
    await scalar('select count(*)::int as v from public.filings where petition_id=$1', [id]),
  ).toBe(2);
  await event(id, 'extended', '2026-07-20');
  await event(id, 'receipt_corrected', '2026-07-18');
  expect(await scalar('select estimate_state as v from public.petitions where id=$1', [id])).toBe(
    'uncertain',
  );
  for (const type of ['transferred', 'information_requested']) {
    await event(id, type, '2026-07-20');
    expect(await scalar('select estimate_state as v from public.petitions where id=$1', [id])).toBe(
      'uncertain',
    );
  }
  await event(id, 'responded', '2026-07-21');
  expect(await scalar('select estimate_state as v from public.petitions where id=$1', [id])).toBe(
    'responded',
  );
  expect(
    await scalar("select public.apply_case_event($1,$2,'note','2026-07-21','','',null,null) as v", [
      bob,
      id,
    ]),
  ).toBe(false);
});
it('leases reminders once, retries with the same key and cancels stale jobs', async () => {
  await db.query('select public.set_reminders($1,true)', [alice]);
  const id = await makeCase();
  await event(id, 'filed');
  await db.query("update private.jobs set run_at=now()-interval '1 minute' where petition_id=$1", [
    id,
  ]);
  const first = await scalar<{ id: string }>('select public.claim_jobs(1) as v');
  expect(first?.id).toBeTruthy();
  expect(await scalar('select public.claim_jobs(1) as v')).toBeUndefined();
  await db.query('select public.finish_job($1,false,false)', [first!.id]);
  await db.query("update private.jobs set run_at=now()-interval '1 minute' where id=$1", [
    first!.id,
  ]);
  const retry = await scalar<{ id: string }>('select public.claim_jobs(1) as v');
  expect(retry?.id).toBe(first?.id);
  await db.query('select public.finish_job($1,true,false)', [retry!.id]);
  expect(await scalar('select public.claim_jobs(1) as v')).toBeUndefined();
  await event(id, 'receipt_corrected');
  await db.query(
    "update private.jobs set run_at=now()-interval '1 minute' where petition_id=$1 and status='pending'",
    [id],
  );
  const stale = await scalar<{ id: string }>('select public.claim_jobs(1) as v');
  await event(id, 'transferred');
  expect(await scalar('select public.job_context($1) as v', [stale!.id])).toBeNull();
});
it('cascades deletion and waits for advance notice before expiry', async () => {
  const id = await makeCase();
  await event(id, 'filed');
  await db.query(
    "update public.petitions set last_activity_at=now()-interval '13 months' where id=$1",
    [id],
  );
  await db.exec('select public.sweep_retention()');
  expect(await scalar('select count(*)::int as v from public.petitions where id=$1', [id])).toBe(1);
  await db.query(
    "update public.petitions set expiry_notice_sent_at=now()-interval '31 days' where id=$1",
    [id],
  );
  await db.exec('select public.sweep_retention()');
  for (const table of ['filings', 'events'])
    expect(
      await scalar('select count(*)::int as v from public.' + table + ' where petition_id=$1', [
        id,
      ]),
    ).toBe(0);
  expect(
    await scalar('select count(*)::int as v from private.jobs where petition_id=$1', [id]),
  ).toBe(0);
});
it('reserves daily email capacity for authentication and suppresses small aggregates', async () => {
  const used = Number(
    await scalar(
      "select coalesce(max(used),0)::int as v from private.quotas where key like 'mail:reminder:%'",
    ),
  );
  for (let i = used; i < 20; i++)
    expect(await scalar("select public.reserve_email('reminder') as v")).toBe(true);
  expect(await scalar("select public.reserve_email('reminder') as v")).toBe(false);
  expect(await scalar("select public.reserve_email('auth') as v")).toBe(true);
  await db.exec(
    "delete from private.metrics;insert into private.metrics values(current_date,'filed',9)",
  );
  expect(await scalar('select public.public_impact() as v')).toEqual({});
  await db.exec('update private.metrics set value=19');
  expect(await scalar('select public.public_impact() as v')).toEqual({ filed: 10 });
});

it('permits the trusted service role while keeping stale retry failures visible', async () => {
  await db.exec('set role service_role');
  try {
    expect(await scalar("select public.consume_quota('service-test',1,60) as v")).toBe(true);
    const id = await makeCase();
    await event(id, 'filed');
    await db.query(
      "update private.jobs set status='processing',attempts=1,first_attempt_at=now()-interval '25 hours',locked_until=now()-interval '1 hour' where petition_id=$1",
      [id],
    );
    await db.exec('select public.claim_jobs(1)');
    const health = await scalar<{ failed: number }>('select public.worker_health() as v');
    expect(Number(health?.failed)).toBeGreaterThan(0);
  } finally {
    await db.exec('reset role');
  }
});
