-- ============================================================
-- BenchPro — Seed Data v1.1
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run: deletes existing seed records first
--
-- STEP 1 — Create auth users BEFORE running this script.
--   Supabase blocks INSERT INTO auth.users via SQL.
--   Go to Authentication → Add User for each account below,
--   setting the UUID manually via the Admin API or CLI.
--   See Section 1 in this file for the full UUID → email table.
--
-- STEP 2 — Run this script. Profiles use ON CONFLICT (id) DO NOTHING
--   so re-runs never fail on existing rows.
-- ============================================================
--
-- TEST ACCOUNTS (password: BenchPro@2026)
--   Recruiter : recruiter@benchpro.in
--   Client    : client@benchpro.in
--
-- COMPANY SEED ACCOUNTS (same password, internal data only)
--   techcorp@benchpro.in | acme@benchpro.in | startup@benchpro.in
--   dataviz@benchpro.in  | fintech@benchpro.in
--
-- UUID KEY
--   Profiles  00000000-0000-cafe-{0001-0007}-000000000000
--   Jobs      00000000-0000-babe-{0001-0010}-000000000000
--   Candidates 00000000-0000-dead-{0001-0015}-000000000000
--   Submissions 00000000-0000-feed-{0001-0015}-000000000000
--   Notes     00000000-0000-fade-{0001-0020}-000000000000
--   Quotations 00000000-0000-face-{0001-0003}-000000000000
--   Feedback  00000000-0000-beef-{0001-0002}-000000000000
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0.  CLEANUP  (reverse dependency order so FK constraints pass)
-- ────────────────────────────────────────────────────────────

DELETE FROM client_feedback WHERE id IN (
  '00000000-0000-beef-0001-000000000000',
  '00000000-0000-beef-0002-000000000000'
);

DELETE FROM submission_notes WHERE id IN (
  '00000000-0000-fade-0001-000000000000','00000000-0000-fade-0002-000000000000',
  '00000000-0000-fade-0003-000000000000','00000000-0000-fade-0004-000000000000',
  '00000000-0000-fade-0005-000000000000','00000000-0000-fade-0006-000000000000',
  '00000000-0000-fade-0007-000000000000','00000000-0000-fade-0008-000000000000',
  '00000000-0000-fade-0009-000000000000','00000000-0000-fade-0010-000000000000',
  '00000000-0000-fade-0011-000000000000','00000000-0000-fade-0012-000000000000',
  '00000000-0000-fade-0013-000000000000','00000000-0000-fade-0014-000000000000',
  '00000000-0000-fade-0015-000000000000','00000000-0000-fade-0016-000000000000',
  '00000000-0000-fade-0017-000000000000','00000000-0000-fade-0018-000000000000',
  '00000000-0000-fade-0019-000000000000','00000000-0000-fade-0020-000000000000'
);

DELETE FROM quotations WHERE id IN (
  '00000000-0000-face-0001-000000000000',
  '00000000-0000-face-0002-000000000000',
  '00000000-0000-face-0003-000000000000'
);

DELETE FROM submissions WHERE id IN (
  '00000000-0000-feed-0001-000000000000','00000000-0000-feed-0002-000000000000',
  '00000000-0000-feed-0003-000000000000','00000000-0000-feed-0004-000000000000',
  '00000000-0000-feed-0005-000000000000','00000000-0000-feed-0006-000000000000',
  '00000000-0000-feed-0007-000000000000','00000000-0000-feed-0008-000000000000',
  '00000000-0000-feed-0009-000000000000','00000000-0000-feed-0010-000000000000',
  '00000000-0000-feed-0011-000000000000','00000000-0000-feed-0012-000000000000',
  '00000000-0000-feed-0013-000000000000','00000000-0000-feed-0014-000000000000',
  '00000000-0000-feed-0015-000000000000'
);

DELETE FROM candidates WHERE id IN (
  '00000000-0000-dead-0001-000000000000','00000000-0000-dead-0002-000000000000',
  '00000000-0000-dead-0003-000000000000','00000000-0000-dead-0004-000000000000',
  '00000000-0000-dead-0005-000000000000','00000000-0000-dead-0006-000000000000',
  '00000000-0000-dead-0007-000000000000','00000000-0000-dead-0008-000000000000',
  '00000000-0000-dead-0009-000000000000','00000000-0000-dead-0010-000000000000',
  '00000000-0000-dead-0011-000000000000','00000000-0000-dead-0012-000000000000',
  '00000000-0000-dead-0013-000000000000','00000000-0000-dead-0014-000000000000',
  '00000000-0000-dead-0015-000000000000'
);

DELETE FROM jobs WHERE id IN (
  '00000000-0000-babe-0001-000000000000','00000000-0000-babe-0002-000000000000',
  '00000000-0000-babe-0003-000000000000','00000000-0000-babe-0004-000000000000',
  '00000000-0000-babe-0005-000000000000','00000000-0000-babe-0006-000000000000',
  '00000000-0000-babe-0007-000000000000','00000000-0000-babe-0008-000000000000',
  '00000000-0000-babe-0009-000000000000','00000000-0000-babe-0010-000000000000'
);

DELETE FROM profiles WHERE id IN (
  '00000000-0000-cafe-0001-000000000000','00000000-0000-cafe-0002-000000000000',
  '00000000-0000-cafe-0003-000000000000','00000000-0000-cafe-0004-000000000000',
  '00000000-0000-cafe-0005-000000000000','00000000-0000-cafe-0006-000000000000',
  '00000000-0000-cafe-0007-000000000000'
);

-- NOTE: auth.users and auth.identities are managed by Supabase GoTrue.
-- Create the 7 test accounts manually in Supabase Dashboard → Authentication → Users
-- (or via the Admin API) using the emails and UUIDs listed at the top of this file.

-- ────────────────────────────────────────────────────────────
-- 1.  CREATE AUTH USERS FIRST (outside this script)
-- ────────────────────────────────────────────────────────────
-- Supabase blocks direct INSERT INTO auth.users via SQL.
-- Create all 7 accounts in Supabase Dashboard → Authentication → Add User
-- (or use the Admin API / supabase-js admin.createUser).
-- IMPORTANT: set each user's UUID to match the values below so the
-- profiles and FK references in this seed file align correctly.
--
--  UUID                                   Email                    Role
--  00000000-0000-cafe-0001-000000000000   recruiter@benchpro.in   recruiter
--  00000000-0000-cafe-0002-000000000000   client@benchpro.in      client
--  00000000-0000-cafe-0003-000000000000   techcorp@benchpro.in    client
--  00000000-0000-cafe-0004-000000000000   acme@benchpro.in        client
--  00000000-0000-cafe-0005-000000000000   startup@benchpro.in     client
--  00000000-0000-cafe-0006-000000000000   dataviz@benchpro.in     client
--  00000000-0000-cafe-0007-000000000000   fintech@benchpro.in     client
--
-- Password for all accounts: BenchPro@2026
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- 3.  PROFILES
-- ────────────────────────────────────────────────────────────

INSERT INTO profiles (id, email, full_name, role, is_active, created_at) VALUES
  -- u1: recruiter
  ('00000000-0000-cafe-0001-000000000000', 'recruiter@benchpro.in',
   'Rahul Sharma', 'recruiter', true, NOW() - INTERVAL '60 days'),

  -- u2: client (FinTech Solutions contact — sees all data in client portal)
  ('00000000-0000-cafe-0002-000000000000', 'client@benchpro.in',
   'Priya Kapoor', 'client', true, NOW() - INTERVAL '55 days'),

  -- u3: TechCorp India
  ('00000000-0000-cafe-0003-000000000000', 'techcorp@benchpro.in',
   'TechCorp India', 'client', true, NOW() - INTERVAL '50 days'),

  -- u4: Acme Ltd
  ('00000000-0000-cafe-0004-000000000000', 'acme@benchpro.in',
   'Acme Ltd', 'client', true, NOW() - INTERVAL '48 days'),

  -- u5: StartupXYZ
  ('00000000-0000-cafe-0005-000000000000', 'startup@benchpro.in',
   'StartupXYZ', 'client', true, NOW() - INTERVAL '45 days'),

  -- u6: DataViz Corp
  ('00000000-0000-cafe-0006-000000000000', 'dataviz@benchpro.in',
   'DataViz Corp', 'client', true, NOW() - INTERVAL '42 days'),

  -- u7: FinTech Solutions
  ('00000000-0000-cafe-0007-000000000000', 'fintech@benchpro.in',
   'FinTech Solutions', 'client', true, NOW() - INTERVAL '40 days')
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 4.  JOBS  (10 open positions across 5 companies)
-- Salaries in INR annual (e.g. 2500000 = ₹25 LPA)
-- ────────────────────────────────────────────────────────────

INSERT INTO jobs (
  id, title, status, employment_type, location,
  client_id, salary_min, salary_max, description, requirements,
  created_at, updated_at
) VALUES

  -- ── TechCorp India ──────────────────────────────────────
  ('00000000-0000-babe-0001-000000000000',
   'Senior Backend Engineer', 'open', 'full_time', 'Bangalore',
   '00000000-0000-cafe-0003-000000000000',
   2500000, 3500000,
   'We are looking for a seasoned backend engineer to join our platform team. You will architect and build scalable microservices powering our SaaS product used by 500+ enterprises across India and SEA.',
   '7+ years of experience with Java/Spring Boot or Python/FastAPI. Strong understanding of distributed systems, microservices architecture, and cloud platforms (AWS/GCP). Hands-on experience with Kubernetes and PostgreSQL required.',
   NOW() - INTERVAL '50 days', NOW() - INTERVAL '2 days'),

  ('00000000-0000-babe-0002-000000000000',
   'Product Manager — Analytics Suite', 'open', 'full_time', 'Bangalore',
   '00000000-0000-cafe-0003-000000000000',
   3000000, 4500000,
   'Lead the product strategy for our flagship analytics suite. Work closely with engineering, design, and enterprise sales to deliver outstanding product experiences for Fortune 500 clients.',
   '5+ years of product management experience in B2B SaaS. Strong analytical skills with experience in data-driven decision making. Demonstrated ability to define and ship large-scale features. MBA from a premier institute preferred.',
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '1 day'),

  -- ── Acme Ltd ────────────────────────────────────────────
  ('00000000-0000-babe-0003-000000000000',
   'Digital Marketing Manager', 'open', 'full_time', 'Mumbai',
   '00000000-0000-cafe-0004-000000000000',
   1200000, 1800000,
   'Drive Acme''s digital marketing strategy across SEO, paid media, and content. Own the performance marketing budget of ₹3Cr+ and optimise for customer acquisition costs across D2C and B2B channels.',
   '6+ years in digital marketing with strong hands-on experience in Google Ads, Meta Ads, and SEO. Proficiency in Google Analytics 4, Data Studio, and HubSpot. Experience running pan-India campaigns preferred.',
   NOW() - INTERVAL '40 days', NOW() - INTERVAL '3 days'),

  ('00000000-0000-babe-0004-000000000000',
   'HR Business Partner', 'open', 'full_time', 'Mumbai',
   '00000000-0000-cafe-0004-000000000000',
   1000000, 1500000,
   'Partner with Acme''s 1,200-person India operations team on all people matters. Drive engagement surveys, performance management cycles, and organisational effectiveness initiatives for the manufacturing division.',
   '5+ years as an HRBP ideally in a manufacturing, FMCG, or industrial environment. Experience with SAP SuccessFactors or similar HRMS. Strong stakeholder management skills; fluency in Marathi is a plus.',
   NOW() - INTERVAL '38 days', NOW() - INTERVAL '5 days'),

  -- ── StartupXYZ ──────────────────────────────────────────
  ('00000000-0000-babe-0005-000000000000',
   'Full Stack Developer', 'open', 'full_time', 'Remote (India)',
   '00000000-0000-cafe-0005-000000000000',
   1800000, 2800000,
   'Join our 40-person product team as a full stack engineer. You will own features end-to-end — from schema design to pixel-perfect UIs. We ship to production every week and move fast with a strong engineering culture.',
   '3+ years of professional experience with React and Node.js. Comfortable with PostgreSQL and MongoDB. Strong ownership mindset and experience working in a startup or high-growth product company preferred.',
   NOW() - INTERVAL '35 days', NOW() - INTERVAL '4 days'),

  ('00000000-0000-babe-0006-000000000000',
   'DevOps Engineer', 'open', 'full_time', 'Hyderabad',
   '00000000-0000-cafe-0005-000000000000',
   2000000, 3000000,
   'Own our cloud infrastructure on AWS. Build and maintain CI/CD pipelines, ensure high availability of our core APIs (99.95% SLA), and drive our platform reliability goals as we scale to 10M users.',
   '5+ years in DevOps or SRE. Deep expertise in AWS (EKS, RDS, CloudFront), Terraform, and Kubernetes. Experience with an observability stack (Datadog or New Relic). Python scripting for automation is a must.',
   NOW() - INTERVAL '33 days', NOW() - INTERVAL '6 days'),

  -- ── DataViz Corp ────────────────────────────────────────
  ('00000000-0000-babe-0007-000000000000',
   'Data Scientist', 'open', 'full_time', 'Bangalore',
   '00000000-0000-cafe-0006-000000000000',
   2200000, 3200000,
   'Build predictive models that help our clients make sense of complex business data. You will work with petabyte-scale datasets, deploy models to production, and present insights to C-suite stakeholders at top Indian enterprises.',
   '4+ years in data science with strong Python skills (pandas, scikit-learn, TensorFlow or PyTorch). Experience with MLOps tooling and model deployment (FastAPI/Docker). Graduate degree in Statistics, Maths, or CS required.',
   NOW() - INTERVAL '55 days', NOW() - INTERVAL '8 days'),

  ('00000000-0000-babe-0008-000000000000',
   'Business Analyst', 'open', 'full_time', 'Pune',
   '00000000-0000-cafe-0006-000000000000',
   1500000, 2200000,
   'Bridge the gap between our data engineering team and business stakeholders. Translate complex data insights into actionable recommendations for Fortune 500 clients in BFSI, retail, and manufacturing.',
   '4+ years as a BA with expert-level SQL and experience with Tableau or Power BI. Excellent communication and deck-building skills. Prior consulting experience is a big plus. Knowledge of Python for data wrangling preferred.',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'),

  -- ── FinTech Solutions ────────────────────────────────────
  ('00000000-0000-babe-0009-000000000000',
   'Risk Analyst', 'open', 'full_time', 'Mumbai',
   '00000000-0000-cafe-0007-000000000000',
   1800000, 2500000,
   'Join our risk management team to model credit and market risks for our rapidly growing personal lending and BNPL products. You will work with sophisticated quantitative models and large transaction datasets from 5M+ customers.',
   '4+ years in risk analytics in banking or fintech. Proficiency in SAS, SQL, and advanced Excel. Solid understanding of Basel III, RBI lending guidelines, and IFRS 9 provisioning standards. FRM or CFA certification is a strong plus.',
   NOW() - INTERVAL '42 days', NOW() - INTERVAL '3 days'),

  ('00000000-0000-babe-0010-000000000000',
   'iOS Developer', 'open', 'full_time', 'Hyderabad',
   '00000000-0000-cafe-0007-000000000000',
   2000000, 3000000,
   'Build the iOS app used by 2M+ customers to manage their loans, investments, and insurance. You will own features from design review to App Store deployment, with direct impact on customer NPS.',
   '3+ years of native iOS development with Swift and SwiftUI. Experience with Core Data, push notifications, biometric auth, and payment gateway integrations. At least one published app on the App Store required.',
   NOW() - INTERVAL '28 days', NOW() - INTERVAL '1 day');

-- ────────────────────────────────────────────────────────────
-- 5.  CANDIDATES  (15 with full profiles)
-- ────────────────────────────────────────────────────────────

INSERT INTO candidates (
  id, full_name, email, phone, current_title, current_company,
  location, experience_years, skills, linkedin_url,
  created_by, created_at, updated_at
) VALUES

  -- c01
  ('00000000-0000-dead-0001-000000000000',
   'Arjun Mehta', 'arjun.mehta@gmail.com', '+91 98765 43210',
   'Senior Software Engineer', 'Infosys', 'Bangalore', 8,
   ARRAY['Java','Spring Boot','Microservices','Kubernetes','PostgreSQL','Redis'],
   'https://linkedin.com/in/arjunmehta',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '52 days', NOW() - INTERVAL '10 days'),

  -- c02
  ('00000000-0000-dead-0002-000000000000',
   'Kavitha Nair', 'kavitha.nair@outlook.com', '+91 97654 32109',
   'Frontend Developer', 'Wipro', 'Chennai', 5,
   ARRAY['React','TypeScript','Redux','GraphQL','Tailwind CSS','Jest'],
   'https://linkedin.com/in/kavithanair',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '48 days', NOW() - INTERVAL '15 days'),

  -- c03
  ('00000000-0000-dead-0003-000000000000',
   'Rohit Bhatia', 'rohit.bhatia@gmail.com', '+91 96543 21098',
   'DevOps Engineer', 'HCL Technologies', 'Hyderabad', 6,
   ARRAY['Kubernetes','Docker','AWS','Terraform','Jenkins','Python','Linux'],
   'https://linkedin.com/in/rohitbhatia',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '12 days'),

  -- c04
  ('00000000-0000-dead-0004-000000000000',
   'Sneha Patel', 'sneha.patel@gmail.com', '+91 95432 10987',
   'Data Scientist', 'Mu Sigma', 'Pune', 4,
   ARRAY['Python','Machine Learning','TensorFlow','scikit-learn','SQL','Tableau'],
   'https://linkedin.com/in/snehapatel',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '58 days', NOW() - INTERVAL '10 days'),

  -- c05
  ('00000000-0000-dead-0005-000000000000',
   'Vikram Singh', 'vikram.singh@hotmail.com', '+91 94321 09876',
   'Senior Product Manager', 'Flipkart', 'Bangalore', 7,
   ARRAY['Product Strategy','Agile','JIRA','OKRs','SQL','A/B Testing','Mixpanel'],
   'https://linkedin.com/in/vikramsingh',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '46 days', NOW() - INTERVAL '7 days'),

  -- c06
  ('00000000-0000-dead-0006-000000000000',
   'Ananya Krishnan', 'ananya.k@gmail.com', '+91 93210 98765',
   'Full Stack Developer', 'Zoho Corporation', 'Chennai', 3,
   ARRAY['Node.js','React','MongoDB','Express','TypeScript','REST APIs'],
   'https://linkedin.com/in/ananyakrishnan',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '36 days', NOW() - INTERVAL '5 days'),

  -- c07
  ('00000000-0000-dead-0007-000000000000',
   'Siddharth Joshi', 'siddharth.joshi@gmail.com', '+91 92109 87654',
   'Risk Analyst', 'HDFC Bank', 'Mumbai', 5,
   ARRAY['Risk Modelling','SAS','SQL','Excel','Basel III','IFRS 9','VBA'],
   'https://linkedin.com/in/siddharthjoshi',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '44 days', NOW() - INTERVAL '8 days'),

  -- c08
  ('00000000-0000-dead-0008-000000000000',
   'Pooja Sharma', 'pooja.sharma@gmail.com', '+91 91098 76543',
   'HR Business Partner', 'Tata Consultancy Services', 'Mumbai', 6,
   ARRAY['Talent Management','Performance Management','SAP HR','Employee Relations','HRBP'],
   'https://linkedin.com/in/poojasharma',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '40 days', NOW() - INTERVAL '12 days'),

  -- c09
  ('00000000-0000-dead-0009-000000000000',
   'Kiran Reddy', 'kiran.reddy@gmail.com', '+91 90987 65432',
   'iOS Developer', 'Mindtree', 'Hyderabad', 4,
   ARRAY['Swift','SwiftUI','Xcode','Core Data','Push Notifications','REST APIs'],
   'https://linkedin.com/in/kiranreddy',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'),

  -- c10
  ('00000000-0000-dead-0010-000000000000',
   'Meghna Iyer', 'meghna.iyer@gmail.com', '+91 89876 54321',
   'Business Analyst', 'Capgemini', 'Pune', 5,
   ARRAY['Tableau','SQL','Power BI','Agile','Requirements Analysis','BFSI Domain'],
   'https://linkedin.com/in/meghnaiyer',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '32 days', NOW() - INTERVAL '6 days'),

  -- c11
  ('00000000-0000-dead-0011-000000000000',
   'Rahul Verma', 'rahul.verma@gmail.com', '+91 88765 43210',
   'Senior Backend Engineer', 'Razorpay', 'Bangalore', 6,
   ARRAY['Python','FastAPI','PostgreSQL','Redis','Kafka','Docker','AWS'],
   'https://linkedin.com/in/rahulverma',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '50 days', NOW() - INTERVAL '14 days'),

  -- c12
  ('00000000-0000-dead-0012-000000000000',
   'Preethi Rao', 'preethi.rao@gmail.com', '+91 87654 32109',
   'Digital Marketing Manager', 'OYO Rooms', 'Bangalore', 7,
   ARRAY['SEO','Google Ads','Meta Ads','Google Analytics','HubSpot','Content Marketing'],
   'https://linkedin.com/in/preethirao',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '38 days', NOW() - INTERVAL '5 days'),

  -- c13
  ('00000000-0000-dead-0013-000000000000',
   'Amit Saxena', 'amit.saxena@gmail.com', '+91 86543 21098',
   'Senior DevOps Engineer', 'Accenture', 'Delhi', 8,
   ARRAY['AWS','GCP','Terraform','Ansible','CI/CD','Kubernetes','Python','Linux'],
   'https://linkedin.com/in/amitsaxena',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '35 days', NOW() - INTERVAL '9 days'),

  -- c14
  ('00000000-0000-dead-0014-000000000000',
   'Divya Pillai', 'divya.pillai@gmail.com', '+91 85432 10987',
   'Machine Learning Engineer', 'Amazon India', 'Chennai', 4,
   ARRAY['PyTorch','scikit-learn','MLflow','Python','NLP','Feature Engineering'],
   'https://linkedin.com/in/divyapillai',
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '56 days', NOW() - INTERVAL '11 days'),

  -- c15
  ('00000000-0000-dead-0015-000000000000',
   'Nikhil Agarwal', 'nikhil.agarwal@gmail.com', '+91 84321 09876',
   'Software Engineer', 'Persistent Systems', 'Pune', 2,
   ARRAY['JavaScript','React','Python','MySQL','Git','REST APIs'],
   NULL,
   '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '3 days');

-- ────────────────────────────────────────────────────────────
-- 6.  SUBMISSIONS  (15 entries linking candidates → jobs)
--
--  s01  Arjun Mehta     → j01 Senior Backend Eng @ TechCorp    interview
--  s02  Rahul Verma     → j01 Senior Backend Eng @ TechCorp    screening
--  s03  Kavitha Nair    → j01 Senior Backend Eng @ TechCorp    sourced
--  s04  Vikram Singh    → j02 Product Manager @ TechCorp       offer
--  s05  Preethi Rao     → j03 Digital Marketing @ Acme         placed
--  s06  Pooja Sharma    → j04 HR Business Partner @ Acme       interview
--  s07  Ananya Krishnan → j05 Full Stack Dev @ StartupXYZ      screening
--  s08  Nikhil Agarwal  → j05 Full Stack Dev @ StartupXYZ      sourced
--  s09  Rohit Bhatia    → j06 DevOps @ StartupXYZ              interview
--  s10  Amit Saxena     → j06 DevOps @ StartupXYZ              sourced
--  s11  Sneha Patel     → j07 Data Scientist @ DataViz         placed
--  s12  Divya Pillai    → j07 Data Scientist @ DataViz         interview
--  s13  Meghna Iyer     → j08 Business Analyst @ DataViz       screening
--  s14  Siddharth Joshi → j09 Risk Analyst @ FinTech           offer
--  s15  Kiran Reddy     → j10 iOS Developer @ FinTech          interview
-- ────────────────────────────────────────────────────────────

INSERT INTO submissions (
  id, job_id, candidate_id, stage, submitted_by, created_at, updated_at
) VALUES
  ('00000000-0000-feed-0001-000000000000',
   '00000000-0000-babe-0001-000000000000', '00000000-0000-dead-0001-000000000000',
   'interview', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days'),

  ('00000000-0000-feed-0002-000000000000',
   '00000000-0000-babe-0001-000000000000', '00000000-0000-dead-0011-000000000000',
   'screening', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '10 days'),

  ('00000000-0000-feed-0003-000000000000',
   '00000000-0000-babe-0001-000000000000', '00000000-0000-dead-0002-000000000000',
   'sourced', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

  ('00000000-0000-feed-0004-000000000000',
   '00000000-0000-babe-0002-000000000000', '00000000-0000-dead-0005-000000000000',
   'offer', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '7 days'),

  ('00000000-0000-feed-0005-000000000000',
   '00000000-0000-babe-0003-000000000000', '00000000-0000-dead-0012-000000000000',
   'placed', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days'),

  ('00000000-0000-feed-0006-000000000000',
   '00000000-0000-babe-0004-000000000000', '00000000-0000-dead-0008-000000000000',
   'interview', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '12 days'),

  ('00000000-0000-feed-0007-000000000000',
   '00000000-0000-babe-0005-000000000000', '00000000-0000-dead-0006-000000000000',
   'screening', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '5 days'),

  ('00000000-0000-feed-0008-000000000000',
   '00000000-0000-babe-0005-000000000000', '00000000-0000-dead-0015-000000000000',
   'sourced', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

  ('00000000-0000-feed-0009-000000000000',
   '00000000-0000-babe-0006-000000000000', '00000000-0000-dead-0003-000000000000',
   'interview', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '28 days', NOW() - INTERVAL '11 days'),

  ('00000000-0000-feed-0010-000000000000',
   '00000000-0000-babe-0006-000000000000', '00000000-0000-dead-0013-000000000000',
   'sourced', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),

  ('00000000-0000-feed-0011-000000000000',
   '00000000-0000-babe-0007-000000000000', '00000000-0000-dead-0004-000000000000',
   'placed', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '55 days', NOW() - INTERVAL '10 days'),

  ('00000000-0000-feed-0012-000000000000',
   '00000000-0000-babe-0007-000000000000', '00000000-0000-dead-0014-000000000000',
   'interview', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '52 days', NOW() - INTERVAL '18 days'),

  ('00000000-0000-feed-0013-000000000000',
   '00000000-0000-babe-0008-000000000000', '00000000-0000-dead-0010-000000000000',
   'screening', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '16 days', NOW() - INTERVAL '6 days'),

  ('00000000-0000-feed-0014-000000000000',
   '00000000-0000-babe-0009-000000000000', '00000000-0000-dead-0007-000000000000',
   'offer', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '8 days'),

  ('00000000-0000-feed-0015-000000000000',
   '00000000-0000-babe-0010-000000000000', '00000000-0000-dead-0009-000000000000',
   'interview', '00000000-0000-cafe-0001-000000000000',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '7 days');

-- ────────────────────────────────────────────────────────────
-- 7.  SUBMISSION NOTES  (rich activity trail on 4 submissions)
--
--  n01–n04  Arjun Mehta @ TechCorp Backend (s01)
--  n05–n09  Vikram Singh @ TechCorp PM (s04)
--  n10–n14  Preethi Rao @ Acme Marketing (s05)  — placed
--  n15–n20  Sneha Patel @ DataViz Data Sci (s11) — placed
-- ────────────────────────────────────────────────────────────

INSERT INTO submission_notes (
  id, submission_id, author_id, content, type, meta, created_at
) VALUES

  -- Arjun Mehta → Senior Backend Eng @ TechCorp (interview)
  ('00000000-0000-fade-0001-000000000000',
   '00000000-0000-feed-0001-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Sourced to Screening',
   'stage_change', '{"from":"sourced","to":"screening"}',
   NOW() - INTERVAL '20 days'),

  ('00000000-0000-fade-0002-000000000000',
   '00000000-0000-feed-0001-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Cleared initial screening call. Strong Java and system design fundamentals. Communicates very well. Shortlisted for technical rounds.',
   'note', '{}',
   NOW() - INTERVAL '18 days'),

  ('00000000-0000-fade-0003-000000000000',
   '00000000-0000-feed-0001-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Screening to Interview',
   'stage_change', '{"from":"screening","to":"interview"}',
   NOW() - INTERVAL '14 days'),

  ('00000000-0000-fade-0004-000000000000',
   '00000000-0000-feed-0001-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Round 1 technical interview completed. Solved 3/3 coding problems. System design (URL shortener) was excellent — TechCorp client is very impressed. Round 2 (HM) being scheduled.',
   'note', '{}',
   NOW() - INTERVAL '10 days'),

  -- Vikram Singh → Product Manager @ TechCorp (offer)
  ('00000000-0000-fade-0005-000000000000',
   '00000000-0000-feed-0004-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Sourced to Screening',
   'stage_change', '{"from":"sourced","to":"screening"}',
   NOW() - INTERVAL '25 days'),

  ('00000000-0000-fade-0006-000000000000',
   '00000000-0000-feed-0004-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Exceptional product sense. Led a ₹200Cr GMV feature at Flipkart. Very strong on metrics and roadmap prioritisation. Strong cultural fit for TechCorp.',
   'note', '{}',
   NOW() - INTERVAL '22 days'),

  ('00000000-0000-fade-0007-000000000000',
   '00000000-0000-feed-0004-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Screening to Interview',
   'stage_change', '{"from":"screening","to":"interview"}',
   NOW() - INTERVAL '18 days'),

  ('00000000-0000-fade-0008-000000000000',
   '00000000-0000-feed-0004-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Interview to Offer',
   'stage_change', '{"from":"interview","to":"offer"}',
   NOW() - INTERVAL '7 days'),

  ('00000000-0000-fade-0009-000000000000',
   '00000000-0000-feed-0004-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Offer extended: ₹42L fixed + ESOPs worth ~₹15L over 4 years. Client is very excited. Vikram has 10 days to respond. Follow up on 28th.',
   'note', '{}',
   NOW() - INTERVAL '7 days'),

  -- Preethi Rao → Digital Marketing Manager @ Acme (placed)
  ('00000000-0000-fade-0010-000000000000',
   '00000000-0000-feed-0005-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Sourced to Screening',
   'stage_change', '{"from":"sourced","to":"screening"}',
   NOW() - INTERVAL '35 days'),

  ('00000000-0000-fade-0011-000000000000',
   '00000000-0000-feed-0005-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Screening to Interview',
   'stage_change', '{"from":"screening","to":"interview"}',
   NOW() - INTERVAL '28 days'),

  ('00000000-0000-fade-0012-000000000000',
   '00000000-0000-feed-0005-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Interview to Offer',
   'stage_change', '{"from":"interview","to":"offer"}',
   NOW() - INTERVAL '15 days'),

  ('00000000-0000-fade-0013-000000000000',
   '00000000-0000-feed-0005-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Offer to Placed',
   'stage_change', '{"from":"offer","to":"placed"}',
   NOW() - INTERVAL '5 days'),

  ('00000000-0000-fade-0014-000000000000',
   '00000000-0000-feed-0005-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Placed successfully! Preethi accepted offer at ₹21L CTC. Joining Acme Ltd on 1st June 2026. DOJ confirmed in writing.',
   'note', '{}',
   NOW() - INTERVAL '5 days'),

  -- Sneha Patel → Data Scientist @ DataViz Corp (placed)
  ('00000000-0000-fade-0015-000000000000',
   '00000000-0000-feed-0011-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Sourced to Screening',
   'stage_change', '{"from":"sourced","to":"screening"}',
   NOW() - INTERVAL '55 days'),

  ('00000000-0000-fade-0016-000000000000',
   '00000000-0000-feed-0011-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Screening to Interview',
   'stage_change', '{"from":"screening","to":"interview"}',
   NOW() - INTERVAL '47 days'),

  ('00000000-0000-fade-0017-000000000000',
   '00000000-0000-feed-0011-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Two technical rounds completed. DataViz client loved her ML portfolio — credit risk model and churn prediction projects were very relevant. Panel gave strong positive feedback.',
   'note', '{}',
   NOW() - INTERVAL '43 days'),

  ('00000000-0000-fade-0018-000000000000',
   '00000000-0000-feed-0011-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Interview to Offer',
   'stage_change', '{"from":"interview","to":"offer"}',
   NOW() - INTERVAL '35 days'),

  ('00000000-0000-fade-0019-000000000000',
   '00000000-0000-feed-0011-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Stage changed from Offer to Placed',
   'stage_change', '{"from":"offer","to":"placed"}',
   NOW() - INTERVAL '10 days'),

  ('00000000-0000-fade-0020-000000000000',
   '00000000-0000-feed-0011-000000000000', '00000000-0000-cafe-0001-000000000000',
   'Placed! Sneha accepted ₹24L CTC offer. Joining DataViz Corp on 2nd June 2026. Invoice to be raised post 30-day retention clause.',
   'note', '{}',
   NOW() - INTERVAL '10 days');

-- ────────────────────────────────────────────────────────────
-- 8.  QUOTATIONS  (3 in different statuses)
-- Salaries and fees in INR
-- ────────────────────────────────────────────────────────────

INSERT INTO quotations (
  id, quote_number, job_id, client_id, candidate_name,
  created_by, status, fee_type, fee_value,
  annual_salary, fee_amount, currency,
  valid_until, notes, created_at, updated_at
) VALUES

  -- q01: Draft — Full Stack Dev @ StartupXYZ (Ananya Krishnan)
  ('00000000-0000-face-0001-000000000000',
   'Q-2026-001',
   '00000000-0000-babe-0005-000000000000',
   '00000000-0000-cafe-0005-000000000000',
   'Ananya Krishnan',
   '00000000-0000-cafe-0001-000000000000',
   'draft', 'percentage', 12.5,
   2200000, 275000, 'INR',
   (NOW() + INTERVAL '30 days')::date,
   '12.5% of confirmed first-year CTC as per standard BenchPro agreement. Subject to 90-day retention clause.',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

  -- q02: Sent — Senior Backend Eng @ TechCorp (Arjun Mehta)
  ('00000000-0000-face-0002-000000000000',
   'Q-2026-002',
   '00000000-0000-babe-0001-000000000000',
   '00000000-0000-cafe-0003-000000000000',
   'Arjun Mehta',
   '00000000-0000-cafe-0001-000000000000',
   'sent', 'percentage', 12,
   3000000, 360000, 'INR',
   (NOW() + INTERVAL '21 days')::date,
   '12% placement fee on confirmed annual CTC. Payment due within 30 days of candidate joining date.',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),

  -- q03: Approved — Data Scientist @ DataViz Corp (Sneha Patel — placed)
  ('00000000-0000-face-0003-000000000000',
   'Q-2026-003',
   '00000000-0000-babe-0007-000000000000',
   '00000000-0000-cafe-0006-000000000000',
   'Sneha Patel',
   '00000000-0000-cafe-0001-000000000000',
   'approved', 'fixed', 320000,
   NULL, 320000, 'INR',
   NULL,
   'Fixed placement fee as agreed in the MSA dated 15 Jan 2026. Invoice to be raised after 30-day retention period (2 July 2026).',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days');

-- ────────────────────────────────────────────────────────────
-- 9.  CLIENT FEEDBACK  (from client@benchpro.in on FinTech submissions)
-- ────────────────────────────────────────────────────────────

INSERT INTO client_feedback (
  id, submission_id, client_id, verdict, notes, created_at, updated_at
) VALUES

  -- fb01: Kiran Reddy → iOS Dev @ FinTech — HIRE
  ('00000000-0000-beef-0001-000000000000',
   '00000000-0000-feed-0015-000000000000',
   '00000000-0000-cafe-0002-000000000000',
   'hire',
   'Excellent Swift and SwiftUI skills — exactly what we need. Live coding session was impressive. Please move to final HR round immediately.',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

  -- fb02: Siddharth Joshi → Risk Analyst @ FinTech — INTERESTED
  ('00000000-0000-beef-0002-000000000000',
   '00000000-0000-feed-0014-000000000000',
   '00000000-0000-cafe-0002-000000000000',
   'interested',
   'Strong Basel III and IFRS 9 background. Good communication. Panel found his HDFC experience very relevant to our lending book. Awaiting offer approval from leadership.',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days');

-- ────────────────────────────────────────────────────────────
-- Done! Reload PostgREST schema cache (run if you get schema errors)
-- NOTIFY pgrst, 'reload schema';
-- ────────────────────────────────────────────────────────────

SELECT
  (SELECT COUNT(*) FROM auth.users    WHERE id LIKE '00000000-0000-cafe-%') AS users_created,
  (SELECT COUNT(*) FROM profiles      WHERE id LIKE '00000000-0000-cafe-%') AS profiles_created,
  (SELECT COUNT(*) FROM jobs          WHERE id LIKE '00000000-0000-babe-%') AS jobs_created,
  (SELECT COUNT(*) FROM candidates    WHERE id LIKE '00000000-0000-dead-%') AS candidates_created,
  (SELECT COUNT(*) FROM submissions   WHERE id LIKE '00000000-0000-feed-%') AS submissions_created,
  (SELECT COUNT(*) FROM submission_notes WHERE id LIKE '00000000-0000-fade-%') AS notes_created,
  (SELECT COUNT(*) FROM quotations    WHERE id LIKE '00000000-0000-face-%') AS quotations_created,
  (SELECT COUNT(*) FROM client_feedback WHERE id LIKE '00000000-0000-beef-%') AS feedback_created;
