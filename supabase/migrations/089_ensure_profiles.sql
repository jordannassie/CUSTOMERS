-- 089: every auth user has a profile row.
--
-- profiles holds the user's active business (008). Its only creator is the on_auth_user_created trigger on auth.users
-- (006, function from 020). QA on 2026-11-01 found new signups on a hosted database with no profile row: the trigger
-- was missing there, so the business switcher saved nothing and the app always showed the newest business. The app
-- now upserts the row when it saves the active business (workspace saveActiveBusiness); this file puts the trigger
-- back where it is missing and backfills the users who signed up without it.
--
-- Additive only (D-43): no drops. Safe to run twice. profiles already has RLS (006).

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass and not tgisinternal
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- Fires the existing profile triggers (trial dates, billing account row) as a normal signup would.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict (id) do nothing;
