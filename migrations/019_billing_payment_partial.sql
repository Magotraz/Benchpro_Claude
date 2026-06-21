alter table public.billing_records
  drop constraint if exists billing_records_payment_status_check;
alter table public.billing_records
  add constraint billing_records_payment_status_check
  check (payment_status in ('pending','partial','received'));
