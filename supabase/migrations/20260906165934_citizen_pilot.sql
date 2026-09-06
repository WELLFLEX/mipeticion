-- Additive citizen pilot migration. All privileged RPCs are service-role only.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

alter table public.petitions alter column entity drop default;
alter table public.profiles add column if not exists reminders_enabled boolean not null default false;
alter table public.petitions add column if not exists pathway text;
alter table public.petitions add column if not exists catalog_version text;
alter table public.petitions add column if not exists rule_version text;
alter table public.petitions add column if not exists estimate_state text not null default 'not_filed'
  check (estimate_state in ('not_filed','estimated','uncertain','responded'));
alter table public.petitions add column if not exists current_filing_id uuid references public.filings(id) on delete set null;
alter table public.petitions add column if not exists last_activity_at timestamptz not null default now();
alter table public.petitions add column if not exists expiry_notice_sent_at timestamptz;
alter table public.events add column if not exists occurred_on date;
update public.petitions set entity='dian' where entity='DIAN';
-- Old filings are retained; unsupported legacy estimates are not promoted to reliable estimates.
update public.petitions p set current_filing_id=(
 select f.id from public.filings f where f.petition_id=p.id order by f.created_at desc, f.id desc limit 1
) where p.current_filing_id is null;
update public.petitions set estimate_state='uncertain' where current_filing_id is not null;
create index if not exists petitions_activity_idx on public.petitions(last_activity_at);
create index if not exists events_order_idx on public.events(petition_id,created_at,id);
create index if not exists petitions_current_filing_idx on public.petitions(current_filing_id);

-- RLS is defense in depth. Browser credentials can read owned data, but cannot forge
-- filings, estimates, events, enrollment, or billing by bypassing application APIs.
revoke all on public.profiles,public.petitions,public.filings,public.events from anon,authenticated;
grant select on public.profiles,public.petitions,public.filings,public.events to authenticated;
grant all on public.profiles,public.petitions,public.filings,public.events to service_role;
revoke execute on function public.set_updated_at() from public,anon,authenticated;
grant execute on function public.set_updated_at() to service_role;

create table private.runtime_settings(id int primary key check(id=1));
insert into private.runtime_settings values(1);
create table private.quotas(key text primary key, used int not null, expires_at timestamptz not null);
create index quotas_expiry_idx on private.quotas(expires_at);
create table private.ai_months(month text primary key, spent_micros bigint not null default 0);
create table private.ai_reservations(
 id uuid primary key default gen_random_uuid(), month text not null references private.ai_months(month),
 reserved_micros bigint not null, actual_micros bigint, model text not null,
 prompt_version text not null default 'draft-v2', settled boolean not null default false,
 success boolean, input_tokens int, output_tokens int, latency_ms int, created_at timestamptz not null default now()
);
create index ai_reservations_month_idx on private.ai_reservations(month);
create table private.jobs(
 id uuid primary key default gen_random_uuid(),
 petition_id uuid not null references public.petitions(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('reminder','expiry')),
 source_version timestamptz not null, run_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','processing','sent','cancelled','failed')),
 attempts int not null default 0, locked_until timestamptz,
 first_attempt_at timestamptz, sent_at timestamptz,
 unique(petition_id,kind,source_version)
);
create index jobs_due_idx on private.jobs(run_at) where status in ('pending','processing');
create index jobs_user_idx on private.jobs(user_id);
create table private.metrics(day date not null, name text not null, value bigint not null default 0, primary key(day,name));
grant all on all tables in schema private to service_role;

create function public.consume_quota(p_key text,p_limit int,p_seconds int) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n int;
begin
 if p_limit<1 or p_seconds<1 or p_seconds>86400 or length(p_key)>250 then return false; end if;
 insert into private.quotas as q(key,used,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set
 used=case when q.expires_at<=now() then 1 else q.used+1 end,
 expires_at=case when q.expires_at<=now() then now()+make_interval(secs=>p_seconds) else q.expires_at end
 where q.expires_at<=now() or q.used<p_limit returning used into n;
 return n is not null;
end;$$;

create function public.reserve_ai_budget(p_reserve_micros bigint,p_cap_micros bigint,p_model text,p_prompt_version text default 'draft-v2') returns uuid
language plpgsql security invoker set search_path='' as $$
declare m text:=to_char(now() at time zone 'UTC','YYYY-MM'); rid uuid; n bigint;
begin
 if p_prompt_version not in ('draft-v2','intake-v1') then return null;end if;
 if p_reserve_micros<=0 or p_cap_micros<0 or p_cap_micros>25000000 then return null;end if;
 insert into private.ai_months(month) values(m) on conflict do nothing;
 update private.ai_months set spent_micros=spent_micros+p_reserve_micros
 where month=m and spent_micros+p_reserve_micros<=p_cap_micros returning spent_micros into n;
 if n is null then return null;end if;
 insert into private.ai_reservations(month,reserved_micros,model,prompt_version) values(m,p_reserve_micros,p_model,p_prompt_version) returning id into rid;
 return rid;
end;$$;

create function public.finish_ai_budget(p_id uuid,p_actual_micros bigint,p_success boolean,p_input_tokens int,p_output_tokens int,p_latency_ms int)
returns void language plpgsql security invoker set search_path='' as $$
declare r private.ai_reservations%rowtype; actual bigint;
begin
 select * into r from private.ai_reservations where id=p_id for update;
 if not found or r.settled then return;end if;
 actual=case when p_success then greatest(0,p_actual_micros) else greatest(r.reserved_micros,p_actual_micros) end;
 update private.ai_reservations set actual_micros=actual,settled=true,success=p_success,input_tokens=p_input_tokens,
 output_tokens=p_output_tokens,latency_ms=p_latency_ms where id=p_id;
 update private.ai_months set spent_micros=greatest(0,spent_micros+actual-r.reserved_micros) where month=r.month;
end;$$;

create function public.enroll_profile(p_user_id uuid,p_email text,p_limit int) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 perform id from private.runtime_settings where id=1 for update;
 if exists(select 1 from public.profiles where id=p_user_id) then
  update public.profiles set email=p_email where id=p_user_id;return true;
 end if;
 if (select count(*) from public.profiles)>=least(greatest(p_limit,0),50) then return false;end if;
 insert into public.profiles(id,email,consent_at) values(p_user_id,p_email,now());
 return true;
end;$$;

create function public.apply_case_event(
 p_user_id uuid,p_petition_id uuid,p_type text,p_date date,p_radicado text,p_note text,p_due_date date,p_term int
) returns boolean language plpgsql security invoker set search_path='' as $$
declare p public.petitions%rowtype; fid uuid; stamp timestamptz:=clock_timestamp();
begin
 select * into p from public.petitions where id=p_petition_id and user_id=p_user_id for update;
 if not found then return false;end if;
 if (select count(*) from public.events where petition_id=p.id)>=500 then raise exception 'Event capacity reached';end if;
 if p_type not in ('filed','receipt_corrected','responded','transferred','extended','information_requested','note') then raise exception 'Invalid event';end if;
 if p_date is null or p_date>(now() at time zone 'America/Bogota')::date or p_date<'2000-01-01' or length(coalesce(p_note,''))>2000 then raise exception 'Invalid event date';end if;
 if p_type in ('filed','receipt_corrected') then
  if length(trim(coalesce(p_radicado,'')))<1 or length(p_radicado)>120 then raise exception 'Missing receipt';end if;
  if p_type='filed' and p.current_filing_id is not null then raise exception 'Receipt already exists';end if;
  if p_type='receipt_corrected' and p.current_filing_id is null then raise exception 'Receipt required';end if;
  insert into public.filings(petition_id,radicado_number,filed_date,legal_term_days,due_date)
   values(p.id,p_radicado,p_date,p_term,p_due_date) returning id into fid;
  update public.petitions set current_filing_id=fid,status='awaiting_response',
   estimate_state=case when p.estimate_state in ('uncertain','responded') then p.estimate_state when p_due_date is null then 'uncertain' else 'estimated' end where id=p.id;
 else
  if p.current_filing_id is null and p_type<>'note' then raise exception 'Receipt required';end if;
  if p_type='responded' then
   update public.petitions set estimate_state='responded',status='responded' where id=p.id;
   update public.filings set response_received_at=p_date::timestamptz where id=p.current_filing_id;
  elsif p_type in ('transferred','extended','information_requested') then
   update public.petitions set estimate_state='uncertain' where id=p.id;
  end if;
 end if;
 insert into public.events(petition_id,type,occurred_on,payload)
 values(p.id,p_type,p_date,jsonb_build_object('note',coalesce(p_note,''),'radicado',p_radicado));
 update public.petitions set last_activity_at=stamp,expiry_notice_sent_at=null where id=p.id;
 update private.jobs set status='cancelled' where petition_id=p.id and status in ('pending','processing');
 insert into private.jobs(petition_id,user_id,kind,source_version,run_at)
 select p2.id,p2.user_id,'reminder',p2.last_activity_at,
 greatest((f.due_date::timestamp at time zone 'America/Bogota')+interval '9 hours',now()+interval '5 minutes')
 from public.petitions p2 join public.filings f on f.id=p2.current_filing_id join public.profiles pr on pr.id=p2.user_id
 where p2.id=p.id and p2.estimate_state='estimated' and f.due_date is not null and pr.reminders_enabled
 on conflict do nothing;
 if p_type='filed' or (p_type='responded' and (select count(*) from public.events where petition_id=p.id and type='responded')=1) then
  insert into private.metrics(day,name,value) values(current_date,p_type,1)
  on conflict(day,name) do update set value=private.metrics.value+1;
 end if;
 return true;
end;$$;

create function public.set_reminders(p_user_id uuid,p_enabled boolean) returns void
language plpgsql security invoker set search_path='' as $$
begin
 update public.profiles set reminders_enabled=p_enabled where id=p_user_id;
 if not p_enabled then
  update private.jobs set status='cancelled' where user_id=p_user_id and kind='reminder' and status in ('pending','processing');
 else
  insert into private.jobs(petition_id,user_id,kind,source_version,run_at)
  select p.id,p.user_id,'reminder',p.last_activity_at,
  greatest((f.due_date::timestamp at time zone 'America/Bogota')+interval '9 hours',now()+interval '5 minutes')
  from public.petitions p join public.filings f on f.id=p.current_filing_id
  where p.user_id=p_user_id and p.estimate_state='estimated' and f.due_date is not null
  on conflict(petition_id,kind,source_version) do update set status='pending'
  where private.jobs.status='cancelled';
 end if;
end;$$;

create function public.sweep_retention() returns void language plpgsql security invoker set search_path='' as $$
begin
 delete from private.quotas where expires_at<now();
 insert into private.jobs(petition_id,user_id,kind,source_version,run_at)
 select id,user_id,'expiry',last_activity_at,now() from public.petitions
 where last_activity_at<now()-interval '11 months' and expiry_notice_sent_at is null
 on conflict do nothing;
 delete from public.petitions where last_activity_at<now()-interval '12 months'
 and expiry_notice_sent_at is not null and expiry_notice_sent_at<now()-interval '30 days';
 delete from private.ai_reservations where created_at<now()-interval '90 days';
end;$$;

create function public.claim_jobs(p_limit int) returns setof jsonb
language plpgsql security invoker set search_path='' as $$
begin
 return query with candidates as(
  select j.id from private.jobs j where j.run_at<=now() and (
   j.status='pending' or (j.status='processing' and j.locked_until<now()))
   and j.attempts<5 and (j.first_attempt_at is null or j.first_attempt_at>now()-interval '23 hours')
  order by j.run_at for update skip locked limit least(greatest(p_limit,0),20)
 ), claimed as(
  update private.jobs j set status='processing',attempts=j.attempts+1,locked_until=now()+interval '5 minutes',
   first_attempt_at=coalesce(j.first_attempt_at,now()) from candidates c where j.id=c.id returning j.*
 )
 select to_jsonb(claimed) from claimed;
end;$$;

create function public.job_context(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('email',pr.email,'kind',j.kind)
 from private.jobs j join public.petitions p on p.id=j.petition_id join public.profiles pr on pr.id=j.user_id
 where j.id=p_id and j.status='processing' and j.source_version=p.last_activity_at and
 ((j.kind='reminder' and p.estimate_state='estimated' and pr.reminders_enabled) or
  (j.kind='expiry' and p.last_activity_at<now()-interval '11 months'));
$$;

create function public.finish_job(p_id uuid,p_success boolean,p_cancel boolean default false) returns void
language plpgsql security invoker set search_path='' as $$
declare j private.jobs%rowtype;
begin
 select * into j from private.jobs where id=p_id for update;
 if not found or j.status<>'processing' then return;end if;
 update private.jobs set status=case when p_cancel then 'cancelled' when p_success then 'sent'
  when attempts>=5 then 'failed' else 'pending' end,
 sent_at=case when p_success then now() else null end,locked_until=null,
 run_at=now()+make_interval(mins=>least(240,5*power(2,attempts)::int)) where id=p_id;
 if p_success and j.kind='expiry' then
  update public.petitions set expiry_notice_sent_at=now() where id=j.petition_id and last_activity_at=j.source_version;
 end if;
end;$$;

create function public.public_impact() returns jsonb language sql security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(name,rounded),'{}'::jsonb) from (
 select name,floor(sum(value)/10)*10 as rounded from private.metrics
 where day>=date_trunc('month',now())::date group by name having sum(value)>=10
 ) totals;
$$;

-- Explicit execution allowlist; function creation otherwise grants EXECUTE to PUBLIC.
revoke all on function public.consume_quota(text,int,int),public.reserve_ai_budget(bigint,bigint,text,text),
 public.finish_ai_budget(uuid,bigint,boolean,int,int,int),public.enroll_profile(uuid,text,int),
 public.apply_case_event(uuid,uuid,text,date,text,text,date,int),public.set_reminders(uuid,boolean),
 public.sweep_retention(),public.claim_jobs(int),public.job_context(uuid),public.finish_job(uuid,boolean,boolean),
 public.public_impact() from public,anon,authenticated;
grant execute on function public.consume_quota(text,int,int),public.reserve_ai_budget(bigint,bigint,text,text),
 public.finish_ai_budget(uuid,bigint,boolean,int,int,int),public.enroll_profile(uuid,text,int),
 public.apply_case_event(uuid,uuid,text,date,text,text,date,int),public.set_reminders(uuid,boolean),
 public.sweep_retention(),public.claim_jobs(int),public.job_context(uuid),public.finish_job(uuid,boolean,boolean),
 public.public_impact() to service_role;

-- Atomic email allocation shares the provider allowance with authentication.
create function public.reserve_email(p_kind text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare d text:='mail:day:'||to_char(now() at time zone 'UTC','YYYY-MM-DD');
 m text:='mail:month:'||to_char(now() at time zone 'UTC','YYYY-MM');
 r text:='mail:reminder:'||to_char(now() at time zone 'UTC','YYYY-MM-DD');
begin
 if p_kind not in ('auth','reminder') then return false;end if;
 perform id from private.runtime_settings where id=1 for update;
 if coalesce((select used from private.quotas where key=d),0)>=100
 or coalesce((select used from private.quotas where key=m),0)>=3000
 or (p_kind='reminder' and coalesce((select used from private.quotas where key=r),0)>=20) then return false;end if;
 insert into private.quotas(key,used,expires_at) values(d,1,now()+interval '2 days'),(m,1,now()+interval '32 days')
 on conflict(key) do update set used=private.quotas.used+1;
 if p_kind='reminder' then
 insert into private.quotas(key,used,expires_at) values(r,1,now()+interval '2 days')
 on conflict(key) do update set used=private.quotas.used+1;end if;
 return true;
end;$$;

-- A locked profile serializes case creation so simultaneous requests respect the limit.
create function public.save_case(p_id uuid,p_user_id uuid,p_entity text,p_pathway text,p_tipo public.petition_tipo,p_document jsonb,p_catalog text,p_rule text)
returns uuid language plpgsql security invoker set search_path='' as $$
begin
 perform id from public.profiles where id=p_user_id for update;
 if not found then return null;end if;
 if exists(select 1 from public.petitions where id=p_id and user_id=p_user_id) then return p_id;end if;
 if (select count(*) from public.petitions where user_id=p_user_id)>=100 then return null;end if;
 insert into public.petitions(id,user_id,entity,pathway,tipo,document,catalog_version,rule_version,status)
 values(p_id,p_user_id,p_entity,p_pathway,p_tipo,p_document,p_catalog,p_rule,'generated');
 return p_id;
end;$$;

create or replace function public.claim_jobs(p_limit int) returns setof jsonb
language plpgsql security invoker set search_path='' as $$
declare candidate private.jobs%rowtype; claimed private.jobs%rowtype;
begin
 update private.jobs set status='failed',locked_until=null where status in ('pending','processing')
 and (attempts>=5 or first_attempt_at<=now()-interval '23 hours')
 and (locked_until is null or locked_until<now());
 for candidate in
 select j.* from private.jobs j where j.run_at<=now()
 and (j.status='pending' or (j.status='processing' and j.locked_until<now()))
 and j.attempts<5 and (j.first_attempt_at is null or j.first_attempt_at>now()-interval '23 hours')
 order by j.run_at for update skip locked limit least(greatest(p_limit,0),5)
 loop
  if not public.reserve_email('reminder') then exit;end if;
  update private.jobs set status='processing',attempts=attempts+1,locked_until=now()+interval '5 minutes',
  first_attempt_at=coalesce(first_attempt_at,now()) where id=candidate.id returning * into claimed;
  return next to_jsonb(claimed);
 end loop;
end;$$;

create function public.record_metric(p_name text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_name not in ('draft_template','draft_ai','draft_fallback','routing_clarify','routing_referral') then return;end if;
 insert into private.metrics(day,name,value) values(current_date,p_name,1)
 on conflict(day,name) do update set value=private.metrics.value+1;
end;$$;
revoke all on function public.reserve_email(text),public.save_case(uuid,uuid,text,text,public.petition_tipo,jsonb,text,text),public.record_metric(text) from public,anon,authenticated;
grant execute on function public.reserve_email(text),public.save_case(uuid,uuid,text,text,public.petition_tipo,jsonb,text,text),public.record_metric(text) to service_role;

create function public.worker_health() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('failed',count(*) filter(where status='failed'),'pending',count(*) filter(where status='pending'))
 from private.jobs;
$$;
revoke all on function public.worker_health() from public,anon,authenticated;
grant execute on function public.worker_health() to service_role;
