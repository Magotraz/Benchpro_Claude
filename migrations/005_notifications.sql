-- ============================================================
-- Migration 005: Notifications
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Table
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text not null default '',
  read       boolean not null default false,
  link       text,
  created_at timestamptz not null default now()
);

-- Index for fast per-user queries ordered by recency
create index if not exists notifications_user_id_created_idx
  on notifications(user_id, created_at desc);

-- RLS
alter table notifications enable row level security;

create policy "Users read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

-- Any authenticated user can create a notification for any user_id.
-- This is intentional: a recruiter action notifies a client, and vice versa.
create policy "Authenticated users create notifications"
  on notifications for insert
  to authenticated
  with check (true);

create policy "Users update own notifications"
  on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Realtime
-- NOTE: After running this script, also enable Realtime in the Supabase Dashboard:
--   Table Editor → notifications → Enable Realtime  (or via the Replication tab)
alter publication supabase_realtime add table notifications;
