-- Trigger function to automatically add users to user_roles table on signup
-- Sets role to 'Pending' initially, defaults to 'Looker' if no role is assigned

-- First, update user_roles table to include 'Pending' role
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('Admin', 'Curator', 'Student', 'Looker', 'Pending'));

-- Create trigger function
CREATE OR REPLACE FUNCTION public.auto_assign_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert new user into user_roles table with 'Pending' role
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
    'Pending',
    false,  -- Pending users can't edit
    false,  -- Pending users can't add
    false,  -- Pending users can't approve
    NOW(),
    NOW()
  );
  
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
    'Looker',  -- Default requested role
    'Pending',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_user_role();

-- Function to promote pending users to Looker role (for admins to use)
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
