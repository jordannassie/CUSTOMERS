-- Migration 097: name extraction batches for scheduled scans (F-39, D-74). Additive (D-43).
--
-- Scheduled scans can send name extraction through Anthropic's Message Batches API at half price instead of one live
-- call per answer (src/modules/scanning/name-batches/, behind the NAME_EXTRACTION_BATCH flag, off by default). The
-- answers are saved at once with text-only mentions; the batch is collected on a later worker run, and this table
-- remembers which batch holds which saved answers in between. Service role only.

create table if not exists public.name_extraction_batches (
  id uuid primary key default gen_random_uuid(),
  batch_id text unique,                 -- Anthropic message batch id; null when the backup ran at submit time
  run_id uuid not null references public.visibility_runs(id) on delete cascade,
  result_ids uuid[] not null,           -- visibility_results waiting for names; custom_id = result id
  status text not null default 'submitted' check (status in ('submitted', 'collected', 'failed')),
  attempts integer not null default 0,
  error text,
  submitted_at timestamptz not null default now(),
  collected_at timestamptz
);
create index if not exists name_extraction_batches_open_idx
  on public.name_extraction_batches (submitted_at) where status = 'submitted';
alter table public.name_extraction_batches enable row level security;
revoke all on table public.name_extraction_batches from anon, authenticated;
grant select, insert, update, delete on table public.name_extraction_batches to service_role;
