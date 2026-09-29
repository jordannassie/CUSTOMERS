-- Migration 040: save a business's first question set exactly once (E2E-0929).
-- Additive only (D-43). Two onboarding loads at once (a refresh, a second tab) each prepared 12 questions and
-- could both keep them. The business row lock makes the later call wait, find the first set and return it.

create or replace function public.save_first_questions(
  p_business_id uuid,
  p_owner_user_id uuid,
  p_questions jsonb
)
returns table (id uuid, prompt text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.businesses b
  where b.id = p_business_id and b.owner_user_id = p_owner_user_id
  for update;
  if not found then
    raise exception 'business_not_found' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.tracked_prompts t where t.business_id = p_business_id and t.active) then
    insert into public.tracked_prompts (business_id, prompt, buyer_intent, location, source, active, created_at)
    select p_business_id, q.prompt, q.buyer_intent, q.location, q.source, true, q.created_at
    from jsonb_to_recordset(p_questions) as q(prompt text, buyer_intent text, location text, source text, created_at timestamptz);
  end if;

  return query
  select t.id, t.prompt from public.tracked_prompts t
  where t.business_id = p_business_id and t.active
  order by t.created_at, t.id;
end;
$$;

-- The onboarding DAL calls it after loading the business as the signed-in owner.
revoke all on function public.save_first_questions(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_first_questions(uuid, uuid, jsonb) to service_role;
