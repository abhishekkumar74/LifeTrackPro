-- ========================================================
-- Migration: 30-Day Account Deletion & Recovery System
-- Complies with Apple App Store Review Guideline 5.1.1(v)
-- and Google Play User Data Policy on Account Deletion
-- ========================================================

-- 1. Add soft-delete tracking columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pending_deletion BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Function: Schedule account deletion (starts 30-day grace period)
CREATE OR REPLACE FUNCTION schedule_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: Cannot schedule deletion without a valid session.';
  END IF;

  UPDATE public.profiles
  SET is_pending_deletion = true,
      deletion_scheduled_at = NOW()
  WHERE id = current_user_id;
END;
$$;

-- 3. Function: Cancel deletion and restore account (during 30-day grace period)
CREATE OR REPLACE FUNCTION cancel_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: Cannot cancel deletion without a valid session.';
  END IF;

  UPDATE public.profiles
  SET is_pending_deletion = false,
      deletion_scheduled_at = NULL
  WHERE id = current_user_id;
END;
$$;

-- 4. Function: Purge accounts that have exceeded the 30-day grace period
CREATE OR REPLACE FUNCTION purge_expired_deleted_accounts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  purged_count INTEGER := 0;
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT id FROM public.profiles
    WHERE is_pending_deletion = true
    AND deletion_scheduled_at <= NOW() - INTERVAL '30 days'
  LOOP
    -- Deleting from auth.users triggers ON DELETE CASCADE across profiles and all user data
    DELETE FROM auth.users WHERE id = user_record.id;
    purged_count := purged_count + 1;
  END LOOP;

  RETURN purged_count;
END;
$$;

-- 5. Permissions
REVOKE EXECUTE ON FUNCTION schedule_account_deletion() FROM public, anon;
GRANT EXECUTE ON FUNCTION schedule_account_deletion() TO authenticated;

REVOKE EXECUTE ON FUNCTION cancel_account_deletion() FROM public, anon;
GRANT EXECUTE ON FUNCTION cancel_account_deletion() TO authenticated;

REVOKE EXECUTE ON FUNCTION purge_expired_deleted_accounts() FROM public, anon, authenticated;
-- purge_expired_deleted_accounts is only run by database cron or service role

COMMENT ON FUNCTION schedule_account_deletion() IS 'Schedules account for deletion with a 30-day recovery grace period.';
COMMENT ON FUNCTION cancel_account_deletion() IS 'Restores account and cancels pending 30-day deletion.';
COMMENT ON FUNCTION purge_expired_deleted_accounts() IS 'Permanently purges accounts whose 30-day deletion grace period has expired.';
