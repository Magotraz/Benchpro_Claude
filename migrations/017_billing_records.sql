-- 017_billing_records.sql
-- Phase 6 Billing module. Admin-only (super_recruiter). Revenue/billing side only.

create table if not exists public.billing_records (
  id                   uuid primary key default gen_random_uuid(),
  contractor_name      text        not null,
  client_name          text        not null,
  billing_month        date        not null,
  contract_type        text        not null
                         check (contract_type in ('hourly','fixed_monthly','monthly_prorated')),
  bill_currency        text        not null default 'INR'
                         check (bill_currency in ('USD','INR')),
  total_days           integer,
  non_billable_days    integer     not null default 0,
  working_days         integer,
  daily_hours          numeric(5,2),
  hourly_rate_usd      numeric(10,2),
  conversion_rate      numeric(10,4),
  monthly_fee_inr      numeric(14,2),
  gst_rate             numeric(5,2) not null default 18 check (gst_rate in (0,18)),
  tds_rate             numeric(5,2) not null default 10 check (tds_rate in (0,10)),
  billable_days        integer,
  total_hours          numeric(10,2),
  total_usd            numeric(12,2),
  inr_total            numeric(14,2),
  gst_amount           numeric(14,2),
  tds_amount           numeric(14,2),
  total_invoice_value  numeric(14,2),
  bank_transfer        numeric(14,2),
  invoice_no           text,
  invoice_date         date,
  gstr1_filed_date     date,
  gstr3b_status        text        not null default 'pending'
                         check (gstr3b_status in ('pending','filed')),
  payment_status       text        not null default 'pending'
                         check (payment_status in ('pending','received')),
  amount_received      numeric(14,2),
  received_date        date,
  notes                text,
  created_by           uuid        default auth.uid() references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_billing_month     on public.billing_records (billing_month);
create index if not exists idx_billing_client     on public.billing_records (client_name);
create index if not exists idx_billing_contractor on public.billing_records (contractor_name);
create index if not exists idx_billing_payment    on public.billing_records (payment_status);

alter table public.billing_records enable row level security;

drop policy if exists billing_admin_all on public.billing_records;
create policy billing_admin_all on public.billing_records
  for all
  to authenticated
  using      ( (select role from public.profiles where id = auth.uid()) = 'super_recruiter' )
  with check ( (select role from public.profiles where id = auth.uid()) = 'super_recruiter' );

-- updated_at trigger. ⚠ $$ block — run alone in its own tab if dollar-quote errors.
create or replace function public.set_billing_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_billing_updated_at on public.billing_records;
create trigger trg_billing_updated_at
  before update on public.billing_records
  for each row execute function public.set_billing_updated_at();
