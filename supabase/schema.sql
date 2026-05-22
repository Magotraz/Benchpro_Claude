-- ================================================================
-- BenchPro Database Schema  –  run this in Supabase SQL Editor
-- ================================================================

-- Required extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------

-- Client organisations
CREATE TABLE IF NOT EXISTS companies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  domain      TEXT        UNIQUE NOT NULL,
  logo_url    TEXT,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Domains approved by SuperRecruiter before any client can register
CREATE TABLE IF NOT EXISTS allowed_domains (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain      TEXT        UNIQUE NOT NULL,
  company_id  UUID        REFERENCES companies(id) ON DELETE CASCADE,
  notes       TEXT,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Extends auth.users with role + company context
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL UNIQUE,
  full_name   TEXT        DEFAULT '',
  role        TEXT        NOT NULL CHECK (role IN ('super_recruiter','recruiter','client','candidate')),
  company_id  UUID        REFERENCES companies(id) ON DELETE SET NULL,
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Time-limited invites for recruiters and clients (no self-signup)
CREATE TABLE IF NOT EXISTS invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('recruiter','client')),
  token       TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  company_id  UUID        REFERENCES companies(id) ON DELETE SET NULL,
  invited_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Public demo-request form (no auth required)
CREATE TABLE IF NOT EXISTS demo_requests (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  TEXT  NOT NULL,
  contact_name  TEXT  NOT NULL,
  email         TEXT  NOT NULL,
  phone         TEXT,
  company_size  TEXT,
  message       TEXT,
  status        TEXT  DEFAULT 'new' CHECK (status IN ('new','contacted','converted','closed')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------

-- Auto-creates a profile row whenever a new auth.user is inserted
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'candidate'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Keeps profiles.updated_at current
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper: returns the role of the currently authenticated user.
-- SECURITY DEFINER bypasses RLS so the function itself can read profiles freely.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_requests  ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (
  auth.uid() = id
  OR get_my_role() IN ('super_recruiter', 'recruiter')
);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_manage_super" ON profiles FOR ALL USING (get_my_role() = 'super_recruiter');

-- COMPANIES
CREATE POLICY "companies_read" ON companies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "companies_manage_super" ON companies FOR ALL USING (get_my_role() = 'super_recruiter');

-- ALLOWED DOMAINS
CREATE POLICY "allowed_domains_read" ON allowed_domains FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "allowed_domains_manage_super" ON allowed_domains FOR ALL USING (get_my_role() = 'super_recruiter');

-- INVITES  (super_recruiter manages; public can read a single invite by token for accept-invite page)
CREATE POLICY "invites_manage_super" ON invites FOR ALL USING (get_my_role() = 'super_recruiter');
CREATE POLICY "invites_read_by_token" ON invites FOR SELECT USING (true);

-- DEMO REQUESTS  (public insert; super_recruiter manages)
CREATE POLICY "demo_requests_insert" ON demo_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "demo_requests_manage_super" ON demo_requests FOR ALL USING (get_my_role() = 'super_recruiter');

-- ----------------------------------------------------------------
-- SEED: promote a user to super_recruiter
-- 1. Create the user via Supabase Auth (email: admin@benchpro.in)
-- 2. Uncomment and run the line below, replacing the email if needed
-- ----------------------------------------------------------------
-- UPDATE profiles SET role = 'super_recruiter' WHERE email = 'admin@benchpro.in';
