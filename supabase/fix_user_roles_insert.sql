-- Fix user_roles RLS policy to allow users to insert their own role
-- Add the missing INSERT policy

-- Allow users to insert their own role (for signup)
CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = id);
