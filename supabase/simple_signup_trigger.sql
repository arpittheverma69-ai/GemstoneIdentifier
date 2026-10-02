-- Simple signup trigger - only adds to user_roles table
-- This avoids potential issues with pending_users table

-- First, update user_roles table to include 'Pending' role
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('Admin', 'Curator', 'Student', 'Looker', 'Pending'));

-- Create simple trigger function
CREATE OR REPLACE FUNCTION public.auto_assign_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert new user into user_roles table with 'Looker' role (not Pending)
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
    'Looker',  -- Start with Looker role instead of Pending
    false,     -- Lookers can't edit
    true,      -- Lookers can add
    false,     -- Lookers can't approve
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_user_role();
