-- ============================================================
-- Migration 009: Fix auth.users trigger conflict
-- Run in: Supabase Dashboard → SQL Editor
--
-- Problem: migration 008 added a second trigger
-- (on_auth_candidate_created → handle_new_candidate) on
-- auth.users. Postgres fires AFTER INSERT triggers in name
-- order, so on_auth_candidate_created fires BEFORE the
-- existing on_auth_user_created. handle_new_candidate tried
-- to INSERT into profiles without the NOT NULL email column,
-- causing "Database error saving new user" on every signup.
--
-- Fix: drop the conflicting trigger + function, then merge
-- the candidate_profiles creation into the existing
-- handle_new_user function (single trigger, no conflict).
-- ============================================================

-- 1. Remove the conflicting trigger and its function
drop trigger  if exists on_auth_candidate_created on auth.users;
drop function if exists public.handle_new_candidate();

-- 2. Replace handle_new_user to also seed candidate_profiles
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Always create a profiles row (covers all roles)
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'candidate'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  -- For candidates: also seed candidate_profiles so the
  -- portal loads immediately after registration/verification
  if coalesce(new.raw_user_meta_data->>'role', '') = 'candidate' then
    insert into public.candidate_profiles (user_id, full_name, email, phone, current_title)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.email,
      nullif(trim(coalesce(new.raw_user_meta_data->>'phone',         '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'current_title', '')), '')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- on_auth_user_created trigger already exists and points to
-- handle_new_user — no trigger DDL changes needed.
