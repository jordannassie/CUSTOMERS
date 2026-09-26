-- Migration 020: bring a fresh database to exactly the live schema (B-10, OPS-02).
-- Pulled from live on 2026-09-26. Every statement is a no-op on live; see supabase/migrations/README.md.

-- contact_submissions: live has 018's topic list (019 ran before 018 there) and two
-- length checks that were added by hand.
ALTER TABLE public.contact_submissions
  DROP CONSTRAINT IF EXISTS contact_submissions_topic_check;
ALTER TABLE public.contact_submissions
  ADD CONSTRAINT contact_submissions_topic_check
    CHECK (topic IN (
      'product', 'support', 'sales', 'enterprise',
      'ai_visibility', 'chatgpt_ads', 'agency', 'book_demo', 'other'
    ));

ALTER TABLE public.contact_submissions
  DROP CONSTRAINT IF EXISTS contact_submissions_page_path_check;
ALTER TABLE public.contact_submissions
  ADD CONSTRAINT contact_submissions_page_path_check CHECK (char_length(page_path) <= 500);

ALTER TABLE public.contact_submissions
  DROP CONSTRAINT IF EXISTS contact_submissions_phone_check;
ALTER TABLE public.contact_submissions
  ADD CONSTRAINT contact_submissions_phone_check CHECK (char_length(phone) <= 30);

-- 015 was never applied on live; these are the trigger functions live runs today.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.initialize_profile_trial()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.trial_starts_at IS NULL THEN
    NEW.trial_starts_at := NOW();
    NEW.trial_ends_at   := NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$function$;

-- Storage buckets created in the dashboard; business-logos is used by /api/geo/businesses/logo.
INSERT INTO storage.buckets (id, name, public)
VALUES ('STORAGE', 'STORAGE', true), ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;
