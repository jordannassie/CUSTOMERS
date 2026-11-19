-- Migration 067: no duplicate businesses in one agency, and onboarding's create key (2026-10-16, MVP_SPEC 3.1).
-- Additive only (D-43): two nullable columns, one unique index on a new (empty) column, one trigger.
--
-- Going Back in setup, a double click or a second tab could leave an agency with two copies of one business. For the
-- live (not deleted) businesses of one agency, a new or changed row may not:
--   * use a website (lower(domain)) another business already uses, unless that one is a chain, whose branches share
--     one website and are told apart by their Google listing;
--   * use a Google listing (places_id) another business already uses;
--   * be a second setup draft: a business the wizard made (it always sets onboarding_step) still at status
--     'onboarding'. Rows inserted with no onboarding_step (test helpers, seeds) are not wizard drafts.
-- Rows already saved may break these rules (test accounts, old seeds), so this is a trigger, not unique indexes that
-- would fail to build: it checks only the row being written, and only the rules whose columns changed. Every check
-- runs under a per-agency advisory lock, so two inserts at once cannot both pass. A refusal is SQLSTATE 23505 with a
-- message starting "duplicate_business:", which the app shows as "This business is already in your account".
--
-- create_key is the website step's idempotency key: a uuid the browser makes for each attempt, so the same attempt
-- sent twice finds the draft it already made. questions_updated_at is set when setup rebuilt the suggested questions
-- (Back to the details step with a new industry, services or place), so the questions step says so once.

alter table public.businesses add column if not exists create_key uuid;
alter table public.businesses add column if not exists questions_updated_at timestamptz;

create unique index if not exists businesses_owner_create_key_idx
  on public.businesses (owner_user_id, create_key)
  where create_key is not null;

create or replace function public.businesses_refuse_duplicates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_live boolean := tg_op = 'UPDATE' and old.deleted_at is null and old.agency_id is not distinct from new.agency_id;
begin
  if new.deleted_at is not null or new.agency_id is null then
    return new;
  end if;
  -- Nothing the rules look at changed on a row that was already live in this agency.
  if v_was_live
    and lower(new.domain) is not distinct from lower(old.domain)
    and new.places_id is not distinct from old.places_id
    and new.status is not distinct from old.status
    and (new.onboarding_step is null) = (old.onboarding_step is null) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('businesses_refuse_duplicates:' || new.agency_id::text, 0));

  -- First, so a second draft for the same website (a double submit) reads as the draft it is.
  if new.status = 'onboarding' and new.onboarding_step is not null
    and not (v_was_live and old.status = 'onboarding' and old.onboarding_step is not null)
    and exists (
      select 1 from public.businesses b
      where b.agency_id = new.agency_id and b.id <> new.id and b.deleted_at is null
        and b.status = 'onboarding' and b.onboarding_step is not null
    ) then
    raise exception 'duplicate_business: draft' using errcode = '23505';
  end if;

  if new.domain is not null
    and not (v_was_live and lower(new.domain) is not distinct from lower(old.domain))
    and exists (
      select 1 from public.businesses b
      where b.agency_id = new.agency_id and b.id <> new.id and b.deleted_at is null
        and lower(b.domain) = lower(new.domain) and not b.is_chain
    ) then
    raise exception 'duplicate_business: website %', new.domain using errcode = '23505';
  end if;

  if new.places_id is not null
    and not (v_was_live and new.places_id is not distinct from old.places_id)
    and exists (
      select 1 from public.businesses b
      where b.agency_id = new.agency_id and b.id <> new.id and b.deleted_at is null and b.places_id = new.places_id
    ) then
    raise exception 'duplicate_business: Google listing %', new.places_id using errcode = '23505';
  end if;

  return new;
end;
$$;

revoke all on function public.businesses_refuse_duplicates() from public, anon, authenticated;

drop trigger if exists businesses_refuse_duplicates on public.businesses;
create trigger businesses_refuse_duplicates
  before insert or update of agency_id, domain, places_id, status, onboarding_step, deleted_at on public.businesses
  for each row execute function public.businesses_refuse_duplicates();
