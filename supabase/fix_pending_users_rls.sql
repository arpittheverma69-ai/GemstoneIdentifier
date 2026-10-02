-- Fix RLS policies for pending_users table to allow new users to insert their own requests

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own pending request" ON public.pending_users;
DROP POLICY IF EXISTS "Admins and Curators can view all pending requests" ON public.pending_users;
DROP POLICY IF EXISTS "Users can insert their own pending request" ON public.pending_users;
DROP POLICY IF EXISTS "Admins can update pending requests" ON public.pending_users;

-- Recreate policies with proper permissions
CREATE POLICY "Users can view their own pending request" ON public.pending_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins and Curators can view all pending requests" ON public.pending_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own pending request" ON public.pending_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update pending requests" ON public.pending_users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Also ensure the user_roles table allows new users to be inserted
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read roles" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can update roles" ON public.user_roles
  FOR UPDATE USING (auth.role() = 'service_role');

-- Allow users to insert their own role (for signup)
CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = id);
