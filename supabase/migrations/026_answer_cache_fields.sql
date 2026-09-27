-- Migration 026: fields the answer cache needs (B-23, MVP_SPEC 5.4, D-24). Additive only (D-43).

-- Names the answer recommends; written later by the name extraction (B-25), so a hit reuses it for free.
alter table public.ai_answer_cache
  add column if not exists extracted_names jsonb,
  add column if not exists cost_usd numeric(12, 6) not null default 0;

-- A cache hit records cost 0 with cached = true (MVP_SPEC 5.4).
alter table public.usage_events
  add column if not exists cached boolean not null default false;
