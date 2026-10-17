-- ========================================================
-- Migration: Delete User Account RPC Function
-- Complies with Apple App Store Review Guideline 5.1.1(v)
-- and Google Play User Data Policy on Account Deletion
-- ========================================================

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Obtain the authenticated user ID executing this RPC
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: Cannot delete user account without a valid session.';
  END IF;

  -- 1. Explicitly delete from public.profiles to trigger cascade deletions
  DELETE FROM public.profiles WHERE id = current_user_id;

  -- 2. Delete the user from auth.users (removes authentication credentials completely)
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

-- Grant execution permissions only to authenticated users
REVOKE EXECUTE ON FUNCTION delete_user_account() FROM public;
REVOKE EXECUTE ON FUNCTION delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

COMMENT ON FUNCTION delete_user_account() IS 'Secure RPC for authenticated users to permanently purge their account and all associated cascaded records.';
