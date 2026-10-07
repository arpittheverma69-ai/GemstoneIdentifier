-- ==============================================================================
-- GemSpy: Instant Password Reset (Run in Supabase SQL Editor)
-- ==============================================================================
-- URL: https://supabase.com/dashboard/project/_/sql

-- 1. INSTANT DIRECT PASSWORD UPDATE FOR ANY EMAIL:
-- Replace 'YourNewPassword123' with the desired password and run this query:

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE auth.users
SET encrypted_password = crypt('YourNewPassword123', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'arpitwillgetit@gmail.com';


-- 2. (OPTIONAL) RPC FUNCTION TO ALLOW ADMINS TO RESET ANY USER'S PASSWORD FROM THE APP:
CREATE OR REPLACE FUNCTION public.admin_set_user_password(
  target_user_id uuid,
  new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  caller_role text;
  caller_id uuid;
BEGIN
  caller_id := auth.uid();
  
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  SELECT role INTO caller_role 
  FROM public.user_roles 
  WHERE id = caller_id;
  
  IF caller_role IS DISTINCT FROM 'Admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can reset user passwords');
  END IF;

  IF length(new_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in auth.users');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_password(uuid, text) TO authenticated;
