-- ============================================================
-- Migration 016: Assignment-based access control for submissions
--                and submission_notes
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================
--
-- WHY
-- ----
-- Migration 015 locked the jobs SELECT policy to job_assignments, but
-- submissions and submission_notes still carried blanket "recruiters full
-- access" policies, so a recruiter could read/write submissions for jobs
-- they were never assigned to. This migration closes that gap.
--
-- EXISTING POLICIES (confirmed via pg_policies) being replaced:
--   submissions      → "recruiters full access submissions"  (FOR ALL,
--                        qual: my_role() = ANY('{recruiter,super_recruiter}'))
--   submission_notes → "recruiters full access notes"        (FOR ALL, same qual)
-- KEPT, NOT TOUCHED:
--   submissions      → "clients read submissions" (FOR SELECT, my_role()='client')
--
-- TARGET MODEL
-- ------------
--   • super_recruiter → full access (via the my_role()='super_recruiter' OR-clause)
--   • recruiter       → submissions (and their notes) ONLY for jobs assigned
--                       to them via job_assignments, OR ones they created
--                       (submitted_by = auth.uid())
--   • client          → unchanged ("clients read submissions" left intact)
--   • candidates       → unchanged (no submissions access)
--   • candidate pool   → unchanged (candidates table reads are NOT restricted here)
--
-- submissions keeps a single FOR ALL replacement. submission_notes is split
-- into per-command policies so that INSERT can additionally require
-- author_id = auth.uid() (recruiters may only author notes as themselves) —
-- a FOR ALL policy can't apply that to INSERT alone, and a looser FOR ALL
-- alongside a FOR INSERT policy would OR away the guard.
-- ============================================================

ALTER TABLE public.submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_notes ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 1. submissions — replace the blanket recruiter policy
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "recruiters full access submissions" ON public.submissions;

-- Recruiters may operate on a submission only when super_recruiter, the
-- creator, or assigned to the submission's job. FOR ALL → SELECT/INSERT/
-- UPDATE/DELETE. "clients read submissions" is left untouched and continues
-- to grant clients their SELECT access (permissive policies are OR'd).
CREATE POLICY "recruiters access assigned submissions" ON public.submissions
  FOR ALL TO authenticated
  USING (
    my_role() = 'super_recruiter'
    OR submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.job_assignments ja
      WHERE ja.job_id = submissions.job_id
        AND ja.recruiter_id = auth.uid()
    )
  )
  WITH CHECK (
    my_role() = 'super_recruiter'
    OR submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.job_assignments ja
      WHERE ja.job_id = submissions.job_id
        AND ja.recruiter_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 2. submission_notes — replace the blanket recruiter policy
-- ────────────────────────────────────────────────────────────
-- Notes are recruiter-internal (only Pipeline / InterviewCalendar via
-- SubmissionDrawer touch this table — no client/candidate page does), so
-- gating them through the parent submission's accessibility is sufficient.
-- Split per command: SELECT/UPDATE/DELETE use the parent-access check; INSERT
-- additionally requires author_id = auth.uid().
DROP POLICY IF EXISTS "recruiters full access notes" ON public.submission_notes;

-- Parent-submission accessibility for the current recruiter, reused below:
--   my_role() = 'super_recruiter'
--   OR the parent submission was created by them
--   OR the parent submission's job is assigned to them
CREATE POLICY "recruiters read assigned submission notes" ON public.submission_notes
  FOR SELECT TO authenticated
  USING (
    my_role() = 'super_recruiter'
    OR EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_notes.submission_id
        AND (
          s.submitted_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.job_assignments ja
            WHERE ja.job_id = s.job_id
              AND ja.recruiter_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "recruiters update assigned submission notes" ON public.submission_notes
  FOR UPDATE TO authenticated
  USING (
    my_role() = 'super_recruiter'
    OR EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_notes.submission_id
        AND (
          s.submitted_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.job_assignments ja
            WHERE ja.job_id = s.job_id
              AND ja.recruiter_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    my_role() = 'super_recruiter'
    OR EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_notes.submission_id
        AND (
          s.submitted_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.job_assignments ja
            WHERE ja.job_id = s.job_id
              AND ja.recruiter_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "recruiters delete assigned submission notes" ON public.submission_notes
  FOR DELETE TO authenticated
  USING (
    my_role() = 'super_recruiter'
    OR EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_notes.submission_id
        AND (
          s.submitted_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.job_assignments ja
            WHERE ja.job_id = s.job_id
              AND ja.recruiter_id = auth.uid()
          )
        )
    )
  );

-- INSERT: parent-submission access AND the note must be authored as the
-- current user (recruiters can only create notes authored as themselves).
CREATE POLICY "recruiters insert assigned submission notes" ON public.submission_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      my_role() = 'super_recruiter'
      OR EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.id = submission_notes.submission_id
          AND (
            s.submitted_by = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.job_assignments ja
              WHERE ja.job_id = s.job_id
                AND ja.recruiter_id = auth.uid()
            )
          )
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. Verification (run after applying). Expect, per table:
--    submissions      → "recruiters access assigned submissions" (ALL)
--                       + "clients read submissions" (SELECT, untouched)
--    submission_notes → "recruiters read assigned submission notes"   (SELECT)
--                       "recruiters insert assigned submission notes" (INSERT)
--                       "recruiters update assigned submission notes" (UPDATE)
--                       "recruiters delete assigned submission notes" (DELETE)
--    …and NO remaining "recruiters full access *" policy.
-- ────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('submissions', 'submission_notes')
-- ORDER BY tablename, cmd, policyname;
