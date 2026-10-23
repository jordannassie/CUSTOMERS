-- Migration 025: move existing users onto agencies (B-14, MVP_SPEC 19 step 2, D-69).
-- Idempotent: every statement only touches rows not moved yet, so running it again changes nothing.
-- Old tables are read, never changed. Stripe data is not carried over (it points at the WorkNex sandbox),
-- and no trial or credits are granted: beta-user treatment waits on Jordan (B-81).

-- An agency for every user who owns a business or a billing account; name from the profile, else the email domain.
insert into public.agencies (owner_user_id, name)
select
  u.id,
  coalesce(nullif(trim(p.full_name), ''), nullif(split_part(coalesce(p.email, u.email), '@', 2), ''), 'My agency')
from auth.users u
left join public.profiles p on p.id = u.id
where u.id in (
  select owner_user_id from public.businesses
  union
  select user_id from public.billing_accounts
)
on conflict (owner_user_id) do nothing;

-- agency_id is null only on businesses not moved yet, so settings chosen later are never overwritten.
update public.businesses b
set
  agency_id = a.id,
  scan_frequency = 'weekly',
  models = array['openai', 'anthropic', 'perplexity'],
  has_website = coalesce(trim(b.domain), '') <> '',
  next_scan_at = case when b.status = 'paused' then null else now() end
from public.agencies a
where a.owner_user_id = b.owner_user_id
  and b.agency_id is null;

-- Old questions become custom questions marked legacy; visibility_results stay as their checks.
update public.tracked_prompts set source = 'legacy' where source is null;

alter table public.tracked_prompts alter column source set default 'custom';
alter table public.tracked_prompts alter column source set not null;

-- Our own test accounts never spend real AI credits (D-61).
update public.agencies a
set is_test = true
from auth.users u
where u.id = a.owner_user_id
  and u.email in ('ek181773+cdaudit0923@gmail.com', 'ek181773+cdlive0926@gmail.com')
  and not a.is_test;
