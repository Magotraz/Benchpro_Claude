-- ============================================================
-- Migration 007: Interview Rounds
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

create table interview_rounds (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references submissions(id) on delete cascade,
  round_number   int not null default 1,
  type           text not null default 'video',     -- phone/video/onsite/technical/hr
  scheduled_at   timestamptz not null,
  interviewer    text,
  location       text,
  outcome        text not null default 'pending',   -- pending/pass/fail/hold
  notes          text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

create index interview_rounds_submission_idx on interview_rounds(submission_id);
create index interview_rounds_scheduled_idx  on interview_rounds(scheduled_at);

alter table interview_rounds enable row level security;

-- Recruiters can see rounds for their own submissions; super_recruiters see all
create policy "select_interview_rounds" on interview_rounds
  for select to authenticated
  using (
    exists (
      select 1 from submissions s
      join  profiles p on p.id = auth.uid()
      where s.id = interview_rounds.submission_id
        and (s.submitted_by = auth.uid() or p.role = 'super_recruiter')
    )
  );

-- Can only insert for own submissions; created_by must be self
create policy "insert_interview_rounds" on interview_rounds
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from submissions s
      join  profiles p on p.id = auth.uid()
      where s.id = submission_id
        and (s.submitted_by = auth.uid() or p.role = 'super_recruiter')
    )
  );

-- Can only update rounds belonging to their own submissions (or super_recruiter)
create policy "update_interview_rounds" on interview_rounds
  for update to authenticated
  using (
    exists (
      select 1 from submissions s
      join  profiles p on p.id = auth.uid()
      where s.id = interview_rounds.submission_id
        and (s.submitted_by = auth.uid() or p.role = 'super_recruiter')
    )
  );

grant select, insert, update on interview_rounds to authenticated;
