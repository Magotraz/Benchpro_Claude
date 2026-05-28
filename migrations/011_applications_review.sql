-- ============================================================
-- Migration 011: Application recruiter review + client verdict
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add recruiter review fields + client verdict to applications
-- ────────────────────────────────────────────────────────────
alter table public.applications
  add column if not exists recruiter_score  int          check (recruiter_score between 1 and 5),
  add column if not exists recruiter_notes  text,
  add column if not exists passed_to_client bool         default false,
  add column if not exists reviewed_by      uuid         references auth.users(id),
  add column if not exists reviewed_at      timestamptz,
  add column if not exists resume_url       text,
  add column if not exists resume_filename  text,
  add column if not exists client_verdict   text         check (client_verdict in ('interested','hold','pass'));

-- Enable RLS if not already enabled
alter table public.applications enable row level security;

-- 2. Candidates can INSERT and read their own applications
-- ────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public'
      and tablename='applications' and policyname='candidates_insert_own'
  ) then
    create policy "candidates_insert_own" on public.applications
      for insert to authenticated
      with check (
        candidate_profile_id in (
          select id from public.candidate_profiles where user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public'
      and tablename='applications' and policyname='candidates_read_own'
  ) then
    create policy "candidates_read_own" on public.applications
      for select to authenticated
      using (
        candidate_profile_id in (
          select id from public.candidate_profiles where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- 3. Recruiters can read ALL applications and update for review
-- ────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public'
      and tablename='applications' and policyname='recruiters_read_applications'
  ) then
    create policy "recruiters_read_applications" on public.applications
      for select to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role in ('recruiter','super_recruiter')
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public'
      and tablename='applications' and policyname='recruiters_update_applications'
  ) then
    create policy "recruiters_update_applications" on public.applications
      for update to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role in ('recruiter','super_recruiter')
        )
      );
  end if;
end $$;

-- 4. Clients can read applications passed to their jobs
-- ────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public'
      and tablename='applications' and policyname='clients_read_passed'
  ) then
    create policy "clients_read_passed" on public.applications
      for select to authenticated
      using (
        passed_to_client = true
        and job_id in (
          select id from public.jobs where client_id = auth.uid()
        )
        and exists (
          select 1 from public.profiles where id = auth.uid() and role = 'client'
        )
      );
  end if;
end $$;

-- 5. Clients can update the verdict on passed applications
-- ────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public'
      and tablename='applications' and policyname='clients_update_verdict'
  ) then
    create policy "clients_update_verdict" on public.applications
      for update to authenticated
      using (
        passed_to_client = true
        and job_id in (
          select id from public.jobs where client_id = auth.uid()
        )
        and exists (
          select 1 from public.profiles where id = auth.uid() and role = 'client'
        )
      )
      with check (true);
  end if;
end $$;

-- 6. Allow recruiters and clients to read candidate resume files
--    (bucket: candidate-resumes, private)
-- ────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='storage'
      and tablename='objects' and policyname='staff_read_candidate_resumes'
  ) then
    create policy "staff_read_candidate_resumes"
    on storage.objects for select to authenticated
    using (
      bucket_id = 'candidate-resumes'
      and (
        -- file owner
        (storage.foldername(name))[1] = auth.uid()::text
        or
        -- recruiters and clients
        exists (
          select 1 from public.profiles
          where id = auth.uid()
            and role in ('recruiter','super_recruiter','client')
        )
      )
    );
  end if;
end $$;
