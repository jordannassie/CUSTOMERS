-- Migration 015: Make the new-user profile trigger resilient to quota errors.
--
-- The original handle_new_user() raises an unhandled exception if the
-- public.profiles INSERT fails (e.g., database at quota). This causes the
-- auth.users INSERT to roll back, making exchangeCodeForSession return an
-- error even though the Supabase-side OAuth handshake succeeded.
--
-- Fix: wrap the INSERT in an exception handler so trigger failures are
-- silently swallowed. The profile will be created lazily when the user
-- first hits the dashboard (upsert in getPrimaryBusiness flow).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but never let a profile-creation failure block auth.
    RAISE WARNING 'handle_new_user: could not create profile for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Also make the trial trigger fail-safe
CREATE OR REPLACE FUNCTION public.initialize_profile_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.trial_starts_at IS NULL THEN
      NEW.trial_starts_at := NOW();
      NEW.trial_ends_at   := NOW() + INTERVAL '14 days';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'initialize_profile_trial: error for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;
