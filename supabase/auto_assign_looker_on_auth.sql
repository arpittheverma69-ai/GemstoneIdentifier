-- ==============================================================================
-- GemSpy: Auto-assign 'Looker' Role Trigger & User Role Management
-- ==============================================================================
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Ensure user_roles table exists with complete schema
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'Looker',
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_add BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure valid role constraint
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('Admin', 'Curator', 'Student', 'Looker', 'Pending'));

-- 2. Trigger function to automatically insert new user into user_roles with 'Looker' role
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    false,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = NOW()
  WHERE public.user_roles.email IS DISTINCT FROM EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to auth.users table (fires on every new user signup/creation)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Backfill all existing auth.users into user_roles with 'Looker' if they don't have a record yet
INSERT INTO public.user_roles (
  id,
  email,
  role,
  can_edit,
  can_add,
  can_approve,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  'Looker',
  false,
  false,
  false,
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
LEFT JOIN public.user_roles r ON u.id = r.id
WHERE r.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Configure Row Level Security (RLS) policies for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated full select" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.user_roles;
DROP POLICY IF EXISTS "Allow update for admins and self" ON public.user_roles;

-- Allow authenticated users to view user roles (needed for user management and profile display)
CREATE POLICY "Allow authenticated full select" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert/upsert their own record
CREATE POLICY "Allow authenticated insert" 
ON public.user_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Allow admins to update any role, and users to update their own updated_at/email
CREATE POLICY "Allow update for admins and self" 
ON public.user_roles 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'Admin'
  )
)
WITH CHECK (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'Admin'
  )
);

-- 6. RPC Function for admins to safely update roles & permissions
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user uuid,
  new_role text
) RETURNS TABLE (can_edit boolean, can_add boolean, can_approve boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  new_can_edit boolean;
  new_can_add boolean;
  new_can_approve boolean;
BEGIN
  IF new_role NOT IN ('Admin', 'Curator', 'Student', 'Looker') THEN
    RAISE EXCEPTION 'Invalid role value %', new_role;
  END IF;

  SELECT role INTO caller_role
  FROM public.user_roles
  WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role <> 'Admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;

  new_can_edit := (new_role IN ('Admin', 'Curator'));
  new_can_add := (new_role IN ('Admin', 'Curator', 'Student'));
  new_can_approve := (new_role IN ('Admin', 'Curator'));

  UPDATE public.user_roles
  SET role = new_role,
      can_edit = new_can_edit,
      can_add = new_can_add,
      can_approve = new_can_approve,
      updated_at = NOW()
  WHERE id = target_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user % not found', target_user;
  END IF;

  RETURN QUERY
  SELECT new_can_edit, new_can_add, new_can_approve;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated;
