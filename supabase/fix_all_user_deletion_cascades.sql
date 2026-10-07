-- ==============================================================================
-- GemSpy: Comprehensive Fix for User Deletion & Foreign Key Cascades
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
--
-- Why this is needed:
-- When a user is deleted from auth.users (either via Supabase Dashboard or the app),
-- Postgres checks all tables referencing auth.users(id). If any table lacks 
-- "ON DELETE CASCADE" (or "ON DELETE SET NULL"), Postgres throws a foreign key
-- violation, producing the error:
-- "Failed to delete selected users: Database error deleting user"
-- ==============================================================================

-- 1. PROFILES Table Cascade
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_id_fkey 
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. USER_ROLES Table Cascade
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_id_fkey;
    ALTER TABLE public.user_roles 
      ADD CONSTRAINT user_roles_id_fkey 
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. PENDING_USERS Table Cascade
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pending_users') THEN
    ALTER TABLE public.pending_users DROP CONSTRAINT IF EXISTS pending_users_user_id_fkey;
    ALTER TABLE public.pending_users 
      ADD CONSTRAINT pending_users_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. PENDING_GEMSTONES Table Cascade
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pending_gemstones') THEN
    ALTER TABLE public.pending_gemstones DROP CONSTRAINT IF EXISTS pending_gemstones_user_id_fkey;
    ALTER TABLE public.pending_gemstones 
      ADD CONSTRAINT pending_gemstones_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. TOTAL_GEMSTONES Table Cascade
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'total_gemstones') THEN
    ALTER TABLE public.total_gemstones DROP CONSTRAINT IF EXISTS total_gemstones_user_id_fkey;
    ALTER TABLE public.total_gemstones 
      ADD CONSTRAINT total_gemstones_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. GEMSTONES Table (Set NULL on delete so gemstones remain in database)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gemstones') THEN
    ALTER TABLE public.gemstones DROP CONSTRAINT IF EXISTS gemstones_created_by_fkey;
    ALTER TABLE public.gemstones 
      ADD CONSTRAINT gemstones_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7. IDENTIFICATION_HISTORY Table Cascade
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'identification_history') THEN
    ALTER TABLE public.identification_history DROP CONSTRAINT IF EXISTS identification_history_user_id_fkey;
    ALTER TABLE public.identification_history 
      ADD CONSTRAINT identification_history_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 8. INVENTORY Table Cascade
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') THEN
    ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_user_id_fkey;
    ALTER TABLE public.inventory 
      ADD CONSTRAINT inventory_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 9. GEM_MEASUREMENTS Table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gem_measurements') THEN
    -- Check if user_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gem_measurements' AND column_name = 'user_id') THEN
      ALTER TABLE public.gem_measurements DROP CONSTRAINT IF EXISTS gem_measurements_user_id_fkey;
      ALTER TABLE public.gem_measurements 
        ADD CONSTRAINT gem_measurements_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 10. Enable Delete RLS Policies for user_roles
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow admins to delete roles" ON public.user_roles;
  CREATE POLICY "Allow admins to delete roles" 
  ON public.user_roles 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'Admin'
    )
  );
END $$;

-- 11. RPC Function to Delete a Single User (Admin Only)
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text;
  caller_id uuid;
  target_email text;
BEGIN
  caller_id := auth.uid();
  
  -- Check authentication
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check Admin role
  SELECT role INTO caller_role 
  FROM public.user_roles 
  WHERE id = caller_id;
  
  IF caller_role IS DISTINCT FROM 'Admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can delete users');
  END IF;
  
  -- Prevent self-deletion
  IF target_user_id = caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot delete your own admin account');
  END IF;

  -- Clean up child tables explicitly just in case cascade is disabled
  DELETE FROM public.pending_users WHERE user_id = target_user_id;
  DELETE FROM public.pending_gemstones WHERE user_id = target_user_id;
  DELETE FROM public.identification_history WHERE user_id = target_user_id;
  DELETE FROM public.inventory WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'User deleted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated;

-- 12. RPC Function to Batch Delete Multiple Users (Admin Only)
CREATE OR REPLACE FUNCTION public.delete_users_batch(target_user_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text;
  caller_id uuid;
  deleted_count int := 0;
  target_id uuid;
BEGIN
  caller_id := auth.uid();
  
  -- Check authentication
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check Admin role
  SELECT role INTO caller_role 
  FROM public.user_roles 
  WHERE id = caller_id;
  
  IF caller_role IS DISTINCT FROM 'Admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only administrators can delete users');
  END IF;
  
  -- Process each user id
  FOREACH target_id IN ARRAY target_user_ids
  LOOP
    -- Skip self-deletion
    IF target_id <> caller_id THEN
      DELETE FROM public.pending_users WHERE user_id = target_id;
      DELETE FROM public.pending_gemstones WHERE user_id = target_id;
      DELETE FROM public.identification_history WHERE user_id = target_id;
      DELETE FROM public.inventory WHERE user_id = target_id;
      DELETE FROM public.user_roles WHERE id = target_id;
      DELETE FROM public.profiles WHERE id = target_id;
      DELETE FROM auth.users WHERE id = target_id;
      deleted_count := deleted_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Successfully deleted %s users', deleted_count),
    'count', deleted_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_users_batch(uuid[]) TO authenticated;
