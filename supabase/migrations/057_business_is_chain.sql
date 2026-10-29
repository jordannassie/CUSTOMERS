-- Migration 057: whether a business is one brand with several locations (2026-10-14). Additive only (D-43): one
-- column with a default, so every existing business reads as a single location until auto-fill runs for it again.
--
-- Auto-fill already saw a chain (its website matches several Google listings in different cities, and the details
-- step says "This website has several locations") but kept nothing of it. A chain gets 2 or 3 chain-style questions
-- ("Which coffee chains are in Islamabad?"), which a single shop would never be named in.

alter table public.businesses
  add column if not exists is_chain boolean not null default false;
