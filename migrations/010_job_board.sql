-- ============================================================
-- Migration 010: Public Job Board
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add new columns to jobs
-- ────────────────────────────────────────────────────────────
alter table public.jobs add column if not exists show_salary    bool    default false;
alter table public.jobs add column if not exists skills_required text[] default '{}';
alter table public.jobs add column if not exists experience_min  int    default 0;
alter table public.jobs add column if not exists slug           text;
alter table public.jobs add column if not exists is_public      bool    default true;

-- 2. Normalise employment_type to display-ready strings
-- ────────────────────────────────────────────────────────────
update public.jobs set employment_type = 'Full-time'  where employment_type = 'full_time';
update public.jobs set employment_type = 'Part-time'  where employment_type = 'part_time';
update public.jobs set employment_type = 'Contract'   where employment_type = 'contract';
update public.jobs set employment_type = 'Freelance'  where employment_type = 'freelance';

-- 3. Generate slugs for existing rows
--    Format: title-location, lowercased, non-alphanumeric → hyphens
-- ────────────────────────────────────────────────────────────
update public.jobs
set slug = lower(
  regexp_replace(
    regexp_replace(
      title || '-' || coalesce(nullif(trim(location), ''), 'remote'),
      '[^a-zA-Z0-9\s]', ' ', 'g'   -- strip special chars (em dash, commas…)
    ),
    '\s+', '-', 'g'                  -- collapse whitespace → single hyphen
  )
)
where slug is null;

-- Deduplicate: append first 4 chars of id when slug collides
update public.jobs j
set slug = j.slug || '-' || substring(j.id::text, 1, 4)
where (
  select count(*) from public.jobs j2 where j2.slug = j.slug
) > 1;

-- 4. Unique index on slug
-- ────────────────────────────────────────────────────────────
create unique index if not exists jobs_slug_idx on public.jobs(slug)
  where slug is not null;

-- 5. Allow anonymous (unauthenticated) access for the public job board
-- ────────────────────────────────────────────────────────────
grant select on public.jobs to anon;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'jobs'
      and policyname = 'anon_browse_public_jobs'
  ) then
    create policy "anon_browse_public_jobs" on public.jobs
      for select to anon
      using (status = 'open' and is_public = true);
  end if;
end $$;

-- 6. Update authenticated policy to respect is_public for candidates
--    Recruiters/super_recruiters still see everything via their own context.
-- ────────────────────────────────────────────────────────────
drop policy if exists "authenticated_browse_jobs" on public.jobs;

create policy "authenticated_browse_jobs" on public.jobs
  for select to authenticated
  using (
    -- recruiters & admins see all jobs
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_recruiter', 'recruiter')
    )
    -- clients see jobs linked to them
    or client_id = auth.uid()
    -- candidates & public see only open public jobs
    or (status = 'open' and is_public = true)
  );
