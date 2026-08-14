begin;

alter table public.customers_direct_leads
  add column if not exists call_bar_business_phone text,
  add column if not exists call_bar_text text,
  add column if not exists call_bar_bg_color text,
  add column if not exists call_bar_text_color text,
  add column if not exists referrer_url text;

create index if not exists customers_direct_leads_source_idx
  on public.customers_direct_leads (source);

commit;
