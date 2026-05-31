-- ============================================================
-- Migration 014: Add availability column to candidates table
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS availability text
  DEFAULT 'bench'
  CONSTRAINT candidates_availability_check
  CHECK (availability IN ('available', 'bench', 'notice', 'placed'));

-- Backfill any existing rows that still have NULL
UPDATE public.candidates SET availability = 'bench' WHERE availability IS NULL;
