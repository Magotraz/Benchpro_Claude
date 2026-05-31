-- ============================================================
-- Migration 013: Storage RLS fix for recruiter CV uploads
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Allow recruiters and super_recruiters to upload to candidate-resumes bucket.
-- The upload path format is: {recruiter_uid}/{candidate_id}_{timestamp}.{ext}
-- so the folder is the recruiter's own auth.uid(), satisfying any existing
-- owner-folder policies while still being accessible by staff.

create policy "recruiters_upload_candidate_resumes"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'candidate-resumes'
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('recruiter', 'super_recruiter')
  )
);
