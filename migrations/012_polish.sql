-- ============================================================
-- Migration 012: Phase 5.7 Polish
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add resume columns to candidates table
alter table public.candidates
  add column if not exists resume_url      text,
  add column if not exists resume_filename text;

-- 2. Audit log table
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  user_name   text,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  entity_name text,
  old_value   text,
  new_value   text,
  created_at  timestamptz default now()
);

alter table public.audit_log enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'audit_log' and policyname = 'super_recruiter_read_audit'
  ) then
    create policy "super_recruiter_read_audit" on public.audit_log
      for select to authenticated
      using (exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role = 'super_recruiter'
      ));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'audit_log' and policyname = 'recruiter_read_own_audit'
  ) then
    create policy "recruiter_read_own_audit" on public.audit_log
      for select to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'audit_log' and policyname = 'insert_audit_log'
  ) then
    create policy "insert_audit_log" on public.audit_log
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

create index if not exists audit_log_created_idx
  on public.audit_log(created_at desc);

create index if not exists audit_log_entity_idx
  on public.audit_log(entity_type, entity_id);

-- 3. Fix get_recruiter_performance to use coalesce for name
create or replace function get_recruiter_performance()
returns table(
  recruiter_id   uuid,
  recruiter_name text,
  submissions    bigint,
  placed         bigint,
  rejected       bigint,
  pipeline_value numeric
)
language sql security definer as $$
  select
    p.id                                                            as recruiter_id,
    coalesce(nullif(trim(p.full_name), ''), p.email, 'Unknown')    as recruiter_name,
    count(distinct s.id)                                            as submissions,
    count(distinct s.id) filter (where s.stage = 'placed')         as placed,
    count(distinct s.id) filter (where s.stage = 'rejected')       as rejected,
    coalesce(sum(distinct q.fee_amount) filter (
      where q.status in ('approved', 'invoiced')
    ), 0)                                                           as pipeline_value
  from profiles p
  left join submissions s on s.submitted_by = p.id
  left join quotations  q on q.created_by   = p.id
  where p.role in ('recruiter', 'super_recruiter')
  group by p.id, p.full_name, p.email
  order by submissions desc;
$$;

grant execute on function get_recruiter_performance() to authenticated;
