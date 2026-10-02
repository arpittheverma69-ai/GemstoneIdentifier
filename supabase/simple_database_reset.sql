-- Complete database reset to basic signup/login functionality
-- Removes all complex user management features

-- Drop all triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.auto_assign_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.approve_pending_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_pending_users_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_user_roles_timestamp() CASCADE;
DROP TRIGGER IF EXISTS pending_users_updated_at ON public.pending_users;
DROP TRIGGER IF EXISTS update_user_roles_timestamp_trigger ON public.user_roles;

-- Drop all complex user management tables 
DROP TABLE IF EXISTS public.pending_users CASCADE;

-- Reset user_roles to basic state - keep only essential roles
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('Admin', 'Curator', 'Student', 'Looker'));

-- Remove all RLS policies from user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Create simple RLS policies for basic functionality
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read roles" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can update roles" ON public.user_roles
  FOR UPDATE USING (auth.role() = 'service_role');

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Note: This removes all automatic user management
-- New users will need to be manually assigned roles by admins
-- Or the app can handle role assignment in code
-- Basic signup/login should work without any database triggers
