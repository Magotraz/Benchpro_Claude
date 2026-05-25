-- ============================================================
-- Migration 006: Analytics RPC Functions
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Pipeline funnel — submission counts per stage
create or replace function get_pipeline_funnel()
returns table(stage text, count bigint)
language sql security definer as $$
  select stage, count(*)
  from submissions
  group by stage
  order by
    case stage
      when 'sourced'   then 1
      when 'screening' then 2
      when 'interview' then 3
      when 'offer'     then 4
      when 'placed'    then 5
      when 'rejected'  then 6
      else 7
    end;
$$;

-- 2. Monthly revenue — approved + invoiced quotations grouped by month
--    Pass months = 6 for a 6-month rolling window (default)
create or replace function get_monthly_revenue(months int default 6)
returns table(month text, revenue numeric)
language sql security definer as $$
  select
    to_char(date_trunc('month', created_at), 'Mon ''YY') as month,
    coalesce(sum(fee_amount), 0)                          as revenue
  from quotations
  where status in ('approved', 'invoiced')
    and created_at >= date_trunc('month', now())
                    - (greatest(months - 1, 0) || ' months')::interval
  group by date_trunc('month', created_at)
  order by date_trunc('month', created_at) asc;
$$;

-- 3. Recruiter performance — per recruiter stats
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
    p.full_name                                                     as recruiter_name,
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
  group by p.id, p.full_name
  order by submissions desc;
$$;

-- 4. Time to fill — days from job creation to first 'placed' submission
--    Uses the placed submission's updated_at as a proxy for fill date.
--    Returns only jobs that have at least one placed candidate.
create or replace function get_time_to_fill()
returns table(job_id uuid, job_title text, days_to_fill numeric)
language sql security definer as $$
  select
    j.id    as job_id,
    j.title as job_title,
    round(
      extract(epoch from (min(s.updated_at) - j.created_at)) / 86400
    )::numeric as days_to_fill
  from jobs j
  join submissions s on s.job_id = j.id and s.stage = 'placed'
  group by j.id, j.title
  order by days_to_fill asc;
$$;

-- Grant to authenticated users
grant execute on function get_pipeline_funnel()           to authenticated;
grant execute on function get_monthly_revenue(int)        to authenticated;
grant execute on function get_recruiter_performance()     to authenticated;
grant execute on function get_time_to_fill()              to authenticated;
