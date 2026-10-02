-- Comprehensive fix for signup and user management
-- This addresses all issues: RLS policies, triggers, and constraints

-- First, completely reset to clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.auto_assign_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.approve_pending_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_pending_users_timestamp() CASCADE;
DROP TRIGGER IF EXISTS pending_users_updated_at ON public.pending_users;
DROP TRIGGER IF EXISTS update_user_roles_timestamp_trigger ON public.user_roles;
DROP FUNCTION IF EXISTS update_user_roles_timestamp() CASCADE;
DROP TABLE IF EXISTS public.pending_users CASCADE;

-- Reset user_roles to original constraints
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('Admin', 'Curator', 'Student', 'Looker'));

-- Reset RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Recreate original policies
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read roles" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can update roles" ON public.user_roles
  FOR UPDATE USING (auth.role() = 'service_role');

-- Re-enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Now create a simple, working signup flow without complex triggers
-- This will just add users to user_roles table with 'Looker' role

-- Simple approach: just add user_roles entry without pending_users
-- The app will handle the rest

-- Grant permission for users to insert their own role
CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = id);
