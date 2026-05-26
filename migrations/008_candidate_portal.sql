-- ============================================================
-- Migration 008: Candidate Portal
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. candidate_profiles — self-registered candidate data
-- ────────────────────────────────────────────────────────────
create table public.candidate_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references auth.users(id) on delete cascade,
  full_name        text not null,
  email            text not null,
  phone            text,
  location         text,
  current_title    text,
  current_company  text,
  experience_years int,
  current_ctc      numeric,
  expected_ctc     numeric,
  notice_period    int,                            -- days
  availability     text default 'available',      -- available/bench/notice/placed
  summary          text,
  skills           text[],
  linkedin_url     text,
  resume_url       text,                           -- storage path: user_id/filename
  resume_filename  text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index candidate_profiles_user_id_idx on public.candidate_profiles(user_id);

alter table public.candidate_profiles enable row level security;

create policy "candidates_own_profile_all" on public.candidate_profiles
  for all to authenticated
  using     (user_id = auth.uid())
  with check(user_id = auth.uid());

-- 2. applications — candidate-initiated job applications
-- ────────────────────────────────────────────────────────────
create table public.applications (
  id                   uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid not null references public.candidate_profiles(id) on delete cascade,
  job_id               uuid not null references public.jobs(id) on delete cascade,
  status               text default 'applied',    -- applied/reviewing/shortlisted/rejected
  cover_note           text,
  created_at           timestamptz default now(),
  unique(candidate_profile_id, job_id)            -- one application per job
);

create index applications_candidate_idx on public.applications(candidate_profile_id);
create index applications_job_idx       on public.applications(job_id);

alter table public.applications enable row level security;

-- Candidates can manage only their own applications
create policy "candidates_own_applications_all" on public.applications
  for all to authenticated
  using (
    candidate_profile_id = (
      select id from public.candidate_profiles where user_id = auth.uid() limit 1
    )
  )
  with check (
    candidate_profile_id = (
      select id from public.candidate_profiles where user_id = auth.uid() limit 1
    )
  );

-- Recruiters and super_recruiters can view all applications
create policy "recruiters_view_applications" on public.applications
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('recruiter', 'super_recruiter')
    )
  );

-- 3. Jobs: allow all authenticated users to browse open jobs
-- ────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'jobs'
      and policyname = 'authenticated_browse_jobs'
  ) then
    create policy "authenticated_browse_jobs" on public.jobs
      for select to authenticated
      using (true);
  end if;
end $$;

-- 4. Trigger: auto-create profile rows on candidate signup
--    Fires on any new auth.users INSERT where metadata role = 'candidate'
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_candidate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data->>'role' = 'candidate' then
    insert into public.profiles (id, full_name, role, is_active)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      'candidate',
      true
    )
    on conflict (id) do nothing;

    insert into public.candidate_profiles (user_id, full_name, email, phone, current_title)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.email,
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'current_title'
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_candidate_created on auth.users;
create trigger on_auth_candidate_created
  after insert on auth.users
  for each row execute procedure public.handle_new_candidate();

-- 5. Storage: candidate-resumes bucket
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-resumes',
  'candidate-resumes',
  false,
  10485760,  -- 10 MB
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- Each user can only access their own folder (path: user_id/filename)
create policy "candidates_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'candidate-resumes'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );

create policy "candidates_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'candidate-resumes'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );

create policy "candidates_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'candidate-resumes'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );

create policy "candidates_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'candidate-resumes'
    and (string_to_array(name, '/'))[1] = auth.uid()::text
  );
