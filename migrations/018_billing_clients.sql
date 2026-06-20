-- 018_billing_clients.sql
create table if not exists public.billing_clients (
  id               uuid primary key default gen_random_uuid(),
  client_name      text not null unique,
  legal_name       text not null,
  billing_address  text not null,
  city             text,
  state            text not null,
  country          text not null default 'India',
  gstin            text,
  is_overseas      boolean not null default false,
  default_hsn_sac  text not null default '998513',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.billing_records
  add column if not exists client_id uuid references public.billing_clients(id) on delete set null,
  add column if not exists hsn_sac   text not null default '998513';

create index if not exists idx_billing_records_client_id on public.billing_records (client_id);

alter table public.billing_clients enable row level security;
drop policy if exists billing_clients_admin_all on public.billing_clients;
create policy billing_clients_admin_all on public.billing_clients
  for all to authenticated
  using      ( (select role from public.profiles where id = auth.uid()) = 'super_recruiter' )
  with check ( (select role from public.profiles where id = auth.uid()) = 'super_recruiter' );

drop trigger if exists trg_billing_clients_updated_at on public.billing_clients;
create trigger trg_billing_clients_updated_at
  before update on public.billing_clients
  for each row execute function public.set_billing_updated_at();

insert into public.billing_clients
  (client_name, legal_name, billing_address, city, state, country, gstin, is_overseas, default_hsn_sac)
values
  ('Synechron',
   'Synechron Platform Consulting India Private Limited',
   'PLOT-H Ginger Hotel Nandan Kanan Road, Nayapalli',
   'Bhubaneswar', 'Odisha', 'India', '21AAJCC3629B1Z8', false, '998513')
on conflict (client_name) do nothing;
