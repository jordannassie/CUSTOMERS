-- 085: the question limit is checked under a lock on the business (BUG-279). Additive only.
--
-- Adding or resuming a question counted the active questions, compared them with the plan and then wrote, as separate
-- requests, so two quick clicks could both see room for one more and end one over the limit. These functions take
-- the business row lock first (as save_first_questions does, 040), so the second call waits and counts the first.
-- The app still works out the limit (the plan, or the plan chosen during setup) and passes it in; null means no limit.
-- Errors: P0002 'business_not_found', P0001 'question_limit', 23505 'duplicate_question'.

create or replace function public.add_tracked_question(
  p_business_id uuid,
  p_agency_id uuid,
  p_prompt text,
  p_max integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform 1 from public.businesses b
  where b.id = p_business_id and b.agency_id = p_agency_id
  for update;
  if not found then
    raise exception 'business_not_found' using errcode = 'P0002';
  end if;

  -- The same text twice (a double click): the second call finds the first.
  if exists (
    select 1 from public.tracked_prompts t
    where t.business_id = p_business_id and t.removed_at is null and t.prompt = p_prompt
  ) then
    raise exception 'duplicate_question' using errcode = '23505';
  end if;

  if p_max is not null and (
    select count(*) from public.tracked_prompts t
    where t.business_id = p_business_id and t.active
  ) >= p_max then
    raise exception 'question_limit' using errcode = 'P0001';
  end if;

  insert into public.tracked_prompts (business_id, prompt, source, active)
  values (p_business_id, p_prompt, 'custom', true)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.resume_tracked_question(
  p_business_id uuid,
  p_agency_id uuid,
  p_question_id uuid,
  p_max integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.businesses b
  where b.id = p_business_id and b.agency_id = p_agency_id
  for update;
  if not found then
    raise exception 'business_not_found' using errcode = 'P0002';
  end if;

  -- Already active (a second click): nothing to count.
  if exists (
    select 1 from public.tracked_prompts t
    where t.id = p_question_id and t.business_id = p_business_id and t.active
  ) then
    return;
  end if;

  if p_max is not null and (
    select count(*) from public.tracked_prompts t
    where t.business_id = p_business_id and t.active
  ) >= p_max then
    raise exception 'question_limit' using errcode = 'P0001';
  end if;

  update public.tracked_prompts t set active = true
  where t.id = p_question_id and t.business_id = p_business_id and t.removed_at is null;
  if not found then
    raise exception 'business_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- The questions DAL calls them after the action's auth guard, with the service role.
revoke all on function public.add_tracked_question(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.resume_tracked_question(uuid, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.add_tracked_question(uuid, uuid, text, integer) to service_role;
grant execute on function public.resume_tracked_question(uuid, uuid, uuid, integer) to service_role;
