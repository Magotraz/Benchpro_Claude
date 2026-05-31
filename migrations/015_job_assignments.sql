-- ============================================================
-- Migration 015: Assignment-based access control for recruiters
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create job_assignments table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_assignments (
  job_id       uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  recruiter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at  timestamptz DEFAULT now(),
  PRIMARY KEY (job_id, recruiter_id)
);

ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

-- 2. RLS policies for job_assignments
-- ────────────────────────────────────────────────────────────

-- super_recruiter: full CRUD on all assignments
CREATE POLICY "super_recruiter_all_assignments"
ON public.job_assignments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_recruiter'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_recruiter'
  )
);

-- recruiter: read only their own assignments
CREATE POLICY "recruiter_read_own_assignments"
ON public.job_assignments
FOR SELECT TO authenticated
USING (recruiter_id = auth.uid());

-- 3. Indexes for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS job_assignments_recruiter_idx
  ON public.job_assignments(recruiter_id);

CREATE INDEX IF NOT EXISTS job_assignments_job_idx
  ON public.job_assignments(job_id);

-- 4. Update jobs SELECT policy — restrict recruiters to assigned jobs only
--    (Drops the existing "authenticated_browse_jobs" policy from migration 010)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_browse_jobs" ON public.jobs;

CREATE POLICY "authenticated_browse_jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    -- super_recruiters see all jobs
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_recruiter'
    )
    -- recruiters only see jobs they are explicitly assigned to
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'recruiter'
      )
      AND EXISTS (
        SELECT 1 FROM public.job_assignments ja
        WHERE ja.job_id = jobs.id AND ja.recruiter_id = auth.uid()
      )
    )
    -- clients see their own jobs
    OR client_id = auth.uid()
    -- candidates / unauthenticated see open public jobs (job board)
    OR (status = 'open' AND is_public = true)
  );
