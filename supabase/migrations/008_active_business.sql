-- Adds per-user "active business" tracking so a single login can own and
-- switch between multiple businesses (SellBop-style workspace switcher).
--
-- Design note: businesses.owner_user_id already lets one auth user own many
-- businesses rows, and every GEO table's RLS already scopes through that
-- ownership (see migration 006/007) -- so today's schema already gives
-- correct per-business tenant isolation for a single owner. What was
-- missing was just a place to remember *which* of a user's businesses the
-- dashboard should currently show. profiles is the natural home: it's
-- already 1:1 with auth.users and already has owner-scoped RLS
-- (profiles_select_own / profiles_update_own), so no new RLS policies are
-- needed for this column.
--
-- The future agency/workspace layer (User -> Workspace -> Businesses, for
-- multi-seat agency accounts) is intentionally NOT introduced here -- it's
-- a separate, bigger piece of work (team membership, invites, centralized
-- billing) that deserves its own migration once agency accounts are
-- actually being built, rather than adding an unused table now.

alter table public.profiles
  add column if not exists active_business_id uuid references public.businesses(id) on delete set null;
