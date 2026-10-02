-- Fix manual user deletion in Supabase dashboard
-- Add proper CASCADE behavior to handle foreign key constraints

-- Drop existing foreign key constraints and recreate with CASCADE
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_id_fkey;
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.pending_users DROP CONSTRAINT IF EXISTS pending_users_user_id_fkey;
ALTER TABLE public.pending_users 
ADD CONSTRAINT pending_users_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Handle gemstones table that references users (not total_gemstones)
ALTER TABLE public.gemstones DROP CONSTRAINT IF EXISTS gemstones_created_by_fkey;
ALTER TABLE public.gemstones 
ADD CONSTRAINT gemstones_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Handle pending_gemstones table that references users
ALTER TABLE public.pending_gemstones DROP CONSTRAINT IF EXISTS pending_gemstones_user_id_fkey;
ALTER TABLE public.pending_gemstones 
ADD CONSTRAINT pending_gemstones_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a helper function for safe user deletion (for manual use)
CREATE OR REPLACE FUNCTION public.safe_delete_user(target_user_id uuid)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Check if caller is an admin
  SELECT role INTO caller_role 
  FROM public.user_roles 
  WHERE id = auth.uid();
  
  IF caller_role != 'Admin' THEN
    RETURN QUERY SELECT false, 'Only admins can delete users';
  END IF;
  
  -- Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RETURN QUERY SELECT false, 'Cannot delete your own account';
  END IF;
  
  -- The CASCADE deletes should handle all related data automatically
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN QUERY SELECT true, 'User deleted successfully';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error: ' || SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.safe_delete_user(uuid) TO authenticated;
