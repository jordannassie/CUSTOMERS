-- Migration 031: changing a business's scan frequency moves its next scan (B-28, for the B-55 settings page).
-- next_scan_at was set as last scan + old frequency, so it becomes last scan + new frequency. A time already
-- past means the scan is due and the next daily enqueue picks it up. Day counts match nextScanAt in
-- src/modules/scanning/service.ts. An update that sets next_scan_at itself wins.

create or replace function public.businesses_frequency_next_scan()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_days constant jsonb := '{"daily": 1, "weekly": 7, "monthly": 30}';
begin
  if new.next_scan_at is not distinct from old.next_scan_at and old.next_scan_at is not null then
    new.next_scan_at := old.next_scan_at
      + make_interval(days => (v_days ->> new.scan_frequency)::integer - (v_days ->> old.scan_frequency)::integer);
  end if;
  return new;
end;
$$;

create trigger businesses_frequency_next_scan
  before update of scan_frequency on public.businesses
  for each row
  when (new.scan_frequency is distinct from old.scan_frequency)
  execute function public.businesses_frequency_next_scan();
