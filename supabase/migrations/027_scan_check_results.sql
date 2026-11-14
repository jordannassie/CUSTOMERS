-- Migration 027: per-check scan results (B-26, MVP_SPEC 5.2, D-53). Additive only (D-43).
-- RLS stays on both tables (006); the worker writes with the service role.

-- One run per scan job, so a retried job resumes its own run.
alter table public.visibility_runs
  add column if not exists scan_job_id uuid references public.scan_jobs(id) on delete set null,
  add column if not exists checks_total integer check (checks_total >= 0),
  add column if not exists checks_failed integer check (checks_failed >= 0);

create unique index if not exists visibility_runs_scan_job_id_idx on public.visibility_runs (scan_job_id)
  where scan_job_id is not null;

-- One row per successful check; its id is the check id passed to capture_credit.
alter table public.visibility_results
  add column if not exists model text,
  add column if not exists question text,
  add column if not exists answer_text text,
  add column if not exists cached boolean not null default false,
  add column if not exists cost_usd numeric(12, 6),
  add column if not exists latency_ms integer check (latency_ms >= 0),
  add column if not exists extracted_names jsonb;

comment on column public.visibility_results.cached is 'True when the answer came from ai_answer_cache (cost 0, still 1 credit).';
comment on column public.visibility_results.cost_usd is 'Our real API cost for this check; 0 on a cache hit (MVP_SPEC 5.4).';
comment on column public.visibility_results.extracted_names is
  'Every business the answer names, matched to this business and its competitors (D-74). Null when extraction failed.';
