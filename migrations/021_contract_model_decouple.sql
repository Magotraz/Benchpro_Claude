-- 021_contract_model_decouple.sql
-- Phase 6.4a — decouple calc basis from rate currency. Admin-only billing.
--
-- ⚠ NOTE: scaffolded from the Phase 6.4a spec because the authoritative SQL was
--   not supplied. Sachin: verify the back-fill mapping + checks before running.
--   Do NOT run via the app — run manually in the Supabase SQL editor.
--
-- Replaces the single contract_type with two independent levers:
--   calc_basis    ∈ hourly | fixed_hours | fixed_monthly | prorated
--   rate_currency ∈ USD | INR
-- contract_type is LEFT in the schema but no longer used by form/calc/table.

alter table public.billing_records
  add column if not exists calc_basis    text,
  add column if not exists rate_currency text,
  add column if not exists fixed_hours   numeric(10,2);

-- Back-fill the new levers from the legacy contract_type.
update public.billing_records
  set calc_basis = case contract_type
        when 'hourly'           then 'hourly'
        when 'fixed_monthly'    then 'fixed_monthly'
        when 'monthly_prorated' then 'prorated'
        else 'hourly'
      end
  where calc_basis is null;

update public.billing_records
  set rate_currency = case contract_type
        when 'hourly' then 'USD'
        else 'INR'
      end
  where rate_currency is null;

-- Defaults + NOT NULL now that existing rows are back-filled.
alter table public.billing_records
  alter column calc_basis    set default 'hourly',
  alter column rate_currency set default 'USD';

update public.billing_records set calc_basis    = 'hourly' where calc_basis    is null;
update public.billing_records set rate_currency = 'USD'    where rate_currency is null;

alter table public.billing_records
  alter column calc_basis    set not null,
  alter column rate_currency set not null;

alter table public.billing_records
  drop constraint if exists billing_records_calc_basis_check;
alter table public.billing_records
  add constraint billing_records_calc_basis_check
  check (calc_basis in ('hourly','fixed_hours','fixed_monthly','prorated'));

alter table public.billing_records
  drop constraint if exists billing_records_rate_currency_check;
alter table public.billing_records
  add constraint billing_records_rate_currency_check
  check (rate_currency in ('USD','INR'));
