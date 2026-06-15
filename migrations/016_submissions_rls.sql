-- ============================================================
-- Migration 016: Assignment-based access control for submissions
--                and submission_notes
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================
--
-- WHY
-- ----
-- Migration 015 locked the jobs SELECT policy to job_assignments, but
-- submissions and submission_notes still use the old permissive
-- "recruiters read/write everything" model. A recruiter could therefore
-- query submissions for jobs they are NOT assigned to. This migration
-- closes that gap to match the assignment-based model.
--
-- TARGET MODEL
-- ------------
--   • super_recruiter → full access (UNCHANGED — its FOR ALL policy is kept)
--   • recruiter       → submissions (and their notes) ONLY for jobs assigned
--                       to them via job_assignments, OR ones they created
--                       (submitted_by / author_id = auth.uid())
--   • client          → UNCHANGED (its own SELECT policy is not touched)
--   • candidates       → UNCHANGED (no submissions access)
--   • candidate pool   → UNCHANGED — candidate (candidates table) reads are a
--                       shared pool and are intentionally NOT restricted here.
--
-- ⚠️  CONFIRM POLICY NAMES BEFORE RUNNING
-- ----------------------------------------
-- The original submissions / submission_notes policies were created directly
-- in the dashboard and are not in version control, so the DROP statements
-- below target this project's conventional names (see migration 011:
-- "recruiters_read_applications" / "recruiters_update_applications").
-- List the current policies first and adjust the DROPs if a permissive
-- recruiter SELECT/UPDATE/INSERT policy uses a different name:
--
--   SELECT tablename, policyname, cmd, roles, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('submissions', 'submission_notes')
--   ORDER BY tablename, cmd, policyname;
--
-- DROP IF EXISTS is safe to re-run; an extra/legacy permissive recruiter
-- policy left behind would silently re-open access (permissive policies are
-- OR'd), so verify nothing recruiter-broad remains after running (see the
-- verification query at the bottom).
-- ============================================================

ALTER TABLE public.submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_notes ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 1. submissions — replace permissive recruiter SELECT + UPDATE
-- ────────────────────────────────────────────────────────────
-- Drop the old permissive recruiter policies (adjust names per introspection).
DROP POLICY IF EXISTS "recruiters_read_submissions"   ON public.submissions;
DROP POLICY IF EXISTS "recruiters_select_submissions" ON public.submissions;
DROP POLICY IF EXISTS "recruiters_view_submissions"   ON public.submissions;
DROP POLICY IF EXISTS "recruiters_update_submissions" ON public.submissions;

-- Recruiters may READ a submission only if super_recruiter, the creator,
-- or assigned to the submission's job.
CREATE POLICY "recruiters_read_submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_recruiter'
    )
    OR submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.job_assignments ja
      WHERE ja.job_id = submissions.job_id
        AND ja.recruiter_id = auth.uid()
    )
  );

-- Recruiters may UPDATE (e.g. drag a card to a new stage) under the same rule.
CREATE POLICY "recruiters_update_submissions" ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_recruiter'
    )
    OR submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.job_assignments ja
      WHERE ja.job_id = submissions.job_id
        AND ja.recruiter_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_recruiter'
    )
    OR submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.job_assignments ja
      WHERE ja.job_id = submissions.job_id
        AND ja.recruiter_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 2. submission_notes — same scope, via the parent submission
-- ────────────────────────────────────────────────────────────
-- submission_notes are recruiter-internal: only recruiter pages
-- (Pipeline, InterviewCalendar via SubmissionDrawer) read/write them — no
-- client or candidate page touches this table — so scoping it to the
-- recruiter's accessible submissions does not affect other roles.
DROP POLICY IF EXISTS "recruiters_read_submission_notes"   ON public.submission_notes;
DROP POLICY IF EXISTS "recruiters_select_submission_notes" ON public.submission_notes;
DROP POLICY IF EXISTS "recruiters_insert_submission_notes" ON public.submission_notes;
DROP POLICY IF EXISTS "recruiters_write_submission_notes"  ON public.submission_notes;
DROP POLICY IF EXISTS "recruiters_manage_submission_notes" ON public.submission_notes;

-- READ notes only when the parent submission is accessible to this recruiter.
CREATE POLICY "recruiters_read_submission_notes" ON public.submission_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_recruiter'
    )
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

-- WRITE notes only as yourself, and only on an accessible parent submission.
CREATE POLICY "recruiters_insert_submission_notes" ON public.submission_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'super_recruiter'
      )
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
-- 3. Verification (run after applying — should return ONLY the
--    policies created above plus untouched super_recruiter / client ones;
--    no leftover "recruiters read everything" policy should remain).
-- ────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('submissions', 'submission_notes')
-- ORDER BY tablename, cmd, policyname;
