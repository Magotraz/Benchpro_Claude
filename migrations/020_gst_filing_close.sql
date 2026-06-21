alter table public.billing_records
  add column if not exists gstr3b_filed_date date,
  add column if not exists gstr1_closed       boolean not null default false,
  add column if not exists gstr3b_closed      boolean not null default false;
