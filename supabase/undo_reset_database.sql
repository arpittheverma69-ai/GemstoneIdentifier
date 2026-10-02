-- Undo the reset script - restore everything that was removed
-- This recreates all the user management system components

-- Recreate pending_users table
CREATE TABLE IF NOT EXISTS public.pending_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  requested_role TEXT DEFAULT 'Looker',
  status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on pending_users
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pending_users
CREATE POLICY "Users can view their own pending request" ON public.pending_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins and Curators can view all pending requests" ON public.pending_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own pending request" ON public.pending_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update pending requests" ON public.pending_users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create timestamp update function for pending_users
CREATE OR REPLACE FUNCTION update_pending_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for pending_users timestamp
CREATE TRIGGER pending_users_updated_at
  BEFORE UPDATE ON public.pending_users
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_users_timestamp();

-- Update user_roles table to include 'Pending' role
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('Admin', 'Curator', 'Student', 'Looker', 'Pending'));

-- Add RLS policy for users to insert their own role
CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Recreate the auto user role trigger
CREATE OR REPLACE FUNCTION public.auto_assign_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert new user into user_roles table with 'Looker' role
  INSERT INTO public.user_roles (
    id, 
    email, 
    role, 
    can_edit, 
    can_add, 
    can_approve,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    'Looker',
    false,
    true,
    false,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Also add to pending_users table for admin approval
  INSERT INTO public.pending_users (
    user_id,
    email,
    requested_role,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    'Looker',
    'Pending',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_user_role();

-- Recreate approve pending user function
CREATE OR REPLACE FUNCTION public.approve_pending_user(user_id uuid, new_role text DEFAULT 'Looker')
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
    RETURN QUERY SELECT false, 'Only admins can approve pending users';
  END IF;
  
  -- Update user role from Pending to the specified role
  UPDATE public.user_roles 
  SET 
    role = new_role,
    can_edit = CASE 
      WHEN new_role IN ('Admin', 'Curator') THEN true
      ELSE false
    END,
    can_add = CASE 
      WHEN new_role IN ('Admin', 'Curator', 'Student') THEN true
      ELSE false
    END,
    can_approve = CASE 
      WHEN new_role IN ('Admin', 'Curator') THEN true
      ELSE false
    END,
    updated_at = NOW()
  WHERE id = user_id AND role = 'Pending';
  
  -- Remove from pending_users table
  DELETE FROM public.pending_users WHERE user_id = user_id;
  
  RETURN QUERY SELECT true, 'User approved and role assigned';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_pending_user(uuid, text) TO authenticated;
