-- Complete database reset to basic signup/login only
-- Removes ALL user management complexity

-- Drop all triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.auto_assign_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.approve_pending_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_pending_users_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_user_roles_timestamp() CASCADE;
DROP TRIGGER IF EXISTS pending_users_updated_at ON public.pending_users;
DROP TRIGGER IF EXISTS update_user_roles_timestamp_trigger ON public.user_roles;

-- Drop all user management tables
DROP TABLE IF EXISTS public.pending_users CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Keep only basic auth functionality
-- Users will be managed only through Supabase auth
-- No custom roles, no approval system, no complex management

-- Note: This removes all role-based access control
-- The app will need to handle permissions differently or use Supabase auth only
