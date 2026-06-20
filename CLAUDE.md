# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BenchPro is a full-stack recruiting SaaS platform (public job board → candidate self-registration → apply → recruiter pipeline → client feedback → quotations → admin billing).

**Stack**: Vite + React 18 + Tailwind CSS 3 + React Router v6 + lucide-react + Supabase (Postgres, Auth, Storage, RLS) + Vercel (hosting). All styling is Tailwind — no CSS-in-JS. All icons are lucide-react.

- **GitHub**: https://github.com/Magotraz/Benchpro_Claude.git (branch: `main`)
- **Vercel**: https://benchpro-claude.vercel.app
- **Supabase project ID**: cjytgxjwiazgdqnhqsfm

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # Production build (also the only reliable "does it compile?" check)
npm run preview   # Preview the production build
```

There is **no test runner and no lint script** configured. After meaningful changes, run `npm run build` to confirm everything compiles.

Env vars (see `.env.example`, real values in `.env.local`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The Supabase client (`src/lib/supabase.js`) `.trim()`s both because CRLF/whitespace in the substituted string otherwise breaks the auth fetch headers.

## Deployment workflow

**Pushing to `main` auto-deploys to Vercel.** There is no staging branch. Only commit/push when the user explicitly asks. Commits in this repo are co-authored (`Co-Authored-By: Claude ...`). On Windows the working tree is CRLF, so `git` prints `LF will be replaced by CRLF` warnings on add/commit — these are harmless.

## Environment specifics (Windows / PowerShell)

The primary shell is **PowerShell 5.1** (a Bash tool is also available for POSIX scripts). Watch for:
- Windows can silently save dropped-in assets with a **double extension** (e.g. `hiref-logo.png.png`) — verify exact filenames when an import "can't resolve".
- A bare native-command stderr (e.g. Vite's chunk-size warning) gets wrapped as a PowerShell `NativeCommandError`; it does not mean the command failed — check for the success line (`✓ built in …`).

## Database & migrations workflow

**Migrations are written but NOT run by Claude.** Write the `.sql` file into `migrations/` (match the existing `NNN_name.sql` numbering); **Sachin runs it manually in the Supabase Dashboard → SQL Editor.** Never push/apply a migration from code. UI built against a new migration assumes the user has already run it.

- `$$`-quoted function bodies (e.g. `create function … as $$ … $$`) can choke if dollar-quote handling errors — note in the file that such blocks may need to run alone in their own SQL tab.
- The base schema lives in `supabase/schema.sql` (companies, allowed_domains, profiles, invites, demo_requests, jobs, submissions + the `handle_new_user()` trigger + base RLS + the `my_role()` helper). Numbered migrations layer on top:

| Migration | Adds |
|-----------|------|
| `supabase/schema.sql` | Base tables, `handle_new_user()` trigger, `my_role()`, base RLS |
| `005_notifications` | `notifications` table |
| `006_analytics_rpc` | Analytics RPC functions |
| `007_interview_rounds` | `interview_rounds` + RLS |
| `008_candidate_portal` | `candidate_profiles`, `applications`, anon jobs policy, `candidate-resumes` Storage bucket |
| `009_fix_trigger_conflict` | Folds candidate seeding into `handle_new_user()`, drops the duplicate trigger |
| `010_job_board` | jobs: `show_salary`, `skills_required text[]`, `experience_min`, `slug`, `is_public`; normalizes `employment_type` to display strings; anon RLS |
| `011_applications_review` | Application recruiter review + client verdict |
| `012_polish` | Phase 5.7 polish |
| `013_storage_rls_fix` | Storage RLS for recruiter CV uploads |
| `014_candidates_availability` | `availability` column |
| `015_job_assignments` | `job_assignments` table + assignment-based recruiter access |
| `016_submissions_rls` | Scopes `submissions`/`submission_notes` RLS to assignments (via `my_role()` + `job_assignments`) |
| `017_billing_records` | Billing module table, admin-only RLS, `updated_at` trigger |
| `018_billing_clients` | Billing client master + `client_id`/`hsn_sac` columns on `billing_records` |

**Trigger gotcha**: there must be exactly ONE `AFTER INSERT` trigger on `auth.users` (`on_auth_user_created` → `handle_new_user()`). A second trigger that sorts alphabetically before it fires first and fails (no profiles row yet). Keep all new-user setup inside `handle_new_user()`; never add a second trigger.

## Roles & access control

Four roles (`profiles.role`): `super_recruiter`, `recruiter`, `client`, `candidate`. Two enforcement layers, kept in sync:

1. **Route guard** — `src/components/ProtectedRoute.jsx` (`allowedRoles` prop) backed by `AuthContext`. Also redirects suspended users (`is_active = false`).
2. **Postgres RLS** — the source of truth. The `my_role()` SQL helper returns the caller's role.

**Assignment-based access (the important nuance)**: recruiters are NOT global. Migration 015 introduced `job_assignments (job_id, recruiter_id)`; migration 016 scoped `submissions`/`submission_notes` so a recruiter only sees a job's submissions when assigned to that job (or is the creator). `super_recruiter` sees everything. Clients see only `client_id = auth.uid()` rows. When adding recruiter-facing data, gate it through `job_assignments`, not a blanket `role = 'recruiter'`.

## Routing architecture

`src/App.jsx` uses a **pathless** layout route (`<Route element={<ProtectedRoute><Layout/></ProtectedRoute>}>`) so the public `<Route path="/">` (HomePage) doesn't conflict. Child routes use **absolute** paths (`/dashboard`, `/manage/jobs`, …).

Shared paths fan out by role via helper components in `App.jsx`: `DashboardByRole`, `SubmissionsByRole`, `QuotationsByRole` (candidate → candidate portal, client → client page, else recruiter page). The candidate portal uses a separate `CandidateLayout`; everyone else uses `Sidebar` + `Layout`.

- Public (no auth): `/`, `/jobs`, `/jobs/:slug`, `/login`, `/register`, `/accept-invite`, `/request-demo`, `/verify-email`, `/forgot-password`, `/reset-password`
- Recruiter+admin (`/manage/jobs`, `/candidates`, `/pipeline`, `/interviews`): `['super_recruiter','recruiter']`
- Admin (`/admin/*`): `['super_recruiter']` only — sub-tabs defined in `src/pages/admin/AdminPanel.jsx`

## Billing module (admin-only)

A digital replacement for an Excel billing tracker, **visible only to `super_recruiter`** — billing data must never leak into any other role's UI. It mirrors the **Quotations page** (`src/pages/Quotations.jsx`) for all conventions: data fetching, `Modal`, toasts, table styling, loading/empty states. Lives under `/admin/billing` (`src/pages/admin/Billing.jsx` + `BillingClients.jsx`), guarded by the `/admin` `super_recruiter` route.

- **`src/lib/billingCalc.js`** is the single source of truth for billing math — used for both the live form preview and on save. Money rounds to **whole numbers** (`Math.round`), each component rounded before it feeds the next so totals tie out. Tracks revenue/billing only (not contractor pay/profit).
- Three contract types: `hourly` (USD → INR via conversion), `fixed_monthly` (flat INR, **days-insensitive** — same fee regardless of days), `monthly_prorated` (`fee × (billable_days ÷ working_days)`; guard divide-by-zero).
- **Per-row business rules** (each saved on the row, both editable): GST is `0%` (overseas) or `18%` (domestic); TDS is `0%` (overseas) or `10%` (domestic); the USD→INR **conversion rate is entered manually per row**.
- INR vs USD are **never summed**; INR rows render `—` in USD-only columns. Format INR `en-IN` (₹) and USD `en-US` ($).
- **Invoice PDF** (`src/lib/invoicePdf.jsx` via `@react-pdf/renderer`, static seller data in `src/config/invoiceConfig.js`): pulls STORED computed values from the row — **never recomputes**. Domestic = INR + IGST line; overseas/0% = export under LUT (no IGST, LUT note), amounts in `overseasInvoiceCurrency`. Enabled only when a client is linked (domestic also needs the client's GSTIN).
- **Phase 6.2 — not yet built** (don't assume these exist): client/month/contractor and FY (Apr–Mar) summaries, outstanding-payments tracker, GST filing dashboard, revenue charts, CSV export.

## Conventions & gotchas

- **"Confidential Client" rule (critical)**: public pages (JobBoard, JobDetail, JobCard, ApplyModal) must NEVER show the real client/company name — always render `"Confidential Client"`, and never expose/join `client_id` on public queries. Salary shows only when `show_salary === true`.
- **`employment_type`** is stored as display strings (`Full-time`, `Part-time`, `Contract`, `Freelance`) since migration 010 — not snake_case. Form selects, filters, and `TYPE_COLORS` all use these.
- **Storage**: uploads go to `candidate-resumes/${user.id}/${file.name}` with `{ upsert: true }`; RLS checks `(string_to_array(name,'/'))[1] = auth.uid()::text` (each user owns only their UUID folder).
- **`candidate_profiles`** writes use `.upsert(data, { onConflict: 'user_id' })` — never a bare INSERT.
- **Modals inside drawers** (e.g. `SubmissionDrawer`) must `createPortal(content, document.body)` + `z-[60]` to escape the drawer's stacking context.
- **Job slug**: `(title + '-' + (location||'remote'))` lowercased, non-alphanumerics → `-`, trimmed; dedup by appending the first 4 chars of the id. `/jobs/:slug` tries slug then falls back to id.
- **Brand color** is `brand-*` (indigo-based, in `tailwind.config.js`). Wordmark: `BenchPro` (`font-bold text-gray-900`) + colon in `text-indigo-600`.

## Test accounts

Test accounts: `admin@benchpro.in` (super_recruiter), `recruiter@benchpro.in` (recruiter), `client@benchpro.in` (client). Passwords not committed — stored separately. Plus India-based seed candidates (see `seed.sql`).

`benchpro.in` emails are treated as internal/team accounts — candidate self-signup rejects them (`src/lib/auth.js`).
