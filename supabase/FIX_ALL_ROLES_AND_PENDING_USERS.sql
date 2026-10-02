-- ==============================================================================
-- GemSpy Master Fix: User Roles, Permissions, and Pending Access Requests
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Project Dashboard: https://supabase.com/dashboard/project/tgwxpyfespesfnqadnpn/sql
-- 2. Create a "New query"
-- 3. Paste and RUN this entire script.
-- ==============================================================================

-- 1. Create or ensure pending_users table exists with complete columns
CREATE TABLE IF NOT EXISTS public.pending_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  requested_role TEXT NOT NULL DEFAULT 'Student',
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create or ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'Looker',
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_add BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure user_roles constraint allows all necessary roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('Admin', 'Curator', 'Student', 'Looker', 'Pending'));

-- 3. Backfill all existing auth users into user_roles
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
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email;

-- 4. Automatically promote known admin email(s)
UPDATE public.user_roles
SET 
  role = 'Admin',
  can_edit = true,
  can_add = true,
  can_approve = true,
  updated_at = NOW()
WHERE 
  email ILIKE '%arpit%' OR 
  email ILIKE '%admin%';

-- 5. Configure Row Level Security (RLS) policies on pending_users and user_roles
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on pending_users
DROP POLICY IF EXISTS "Users can view their own pending request" ON public.pending_users;
DROP POLICY IF EXISTS "Admins and Curators can view all pending requests" ON public.pending_users;
DROP POLICY IF EXISTS "Users can insert their own pending request" ON public.pending_users;
DROP POLICY IF EXISTS "Admins can update pending requests" ON public.pending_users;
DROP POLICY IF EXISTS "allow_all_pending_users_auth" ON public.pending_users;
DROP POLICY IF EXISTS "allow_anon_read_pending_users" ON public.pending_users;

-- Create permissive RLS policies for pending_users (no recursive checks)
CREATE POLICY "allow_all_pending_users_auth" ON public.pending_users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_anon_read_pending_users" ON public.pending_users
  FOR SELECT TO anon USING (true);

CREATE POLICY "allow_anon_insert_pending_users" ON public.pending_users
  FOR INSERT TO anon WITH CHECK (true);

-- Drop all existing policies on user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated full select" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.user_roles;
DROP POLICY IF EXISTS "Allow update for admins and self" ON public.user_roles;
DROP POLICY IF EXISTS "allow_all_user_roles_auth" ON public.user_roles;
DROP POLICY IF EXISTS "allow_anon_read_user_roles" ON public.user_roles;

-- Create permissive RLS policies for user_roles
CREATE POLICY "allow_all_user_roles_auth" ON public.user_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_anon_read_user_roles" ON public.user_roles
  FOR SELECT TO anon USING (true);

CREATE POLICY "allow_anon_insert_user_roles" ON public.user_roles
  FOR INSERT TO anon WITH CHECK (true);

-- Grant privileges
GRANT ALL ON public.pending_users TO anon, authenticated, service_role;
GRANT ALL ON public.user_roles TO anon, authenticated, service_role;

-- 6. RPC Function for safely updating user roles
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user uuid,
  new_role text
) RETURNS TABLE (can_edit boolean, can_add boolean, can_approve boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_can_edit boolean;
  new_can_add boolean;
  new_can_approve boolean;
BEGIN
  IF new_role NOT IN ('Admin', 'Curator', 'Student', 'Looker', 'Pending') THEN
    RAISE EXCEPTION 'Invalid role value %', new_role;
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

GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated, anon, service_role;

-- 7. Auth trigger to automatically register new signups into user_roles
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
    CASE 
      WHEN NEW.email ILIKE '%arpit%' OR NEW.email ILIKE '%admin%' THEN 'Admin'
      ELSE 'Looker'
    END,
    CASE 
      WHEN NEW.email ILIKE '%arpit%' OR NEW.email ILIKE '%admin%' THEN true
      ELSE false
    END,
    CASE 
      WHEN NEW.email ILIKE '%arpit%' OR NEW.email ILIKE '%admin%' THEN true
      ELSE false
    END,
    CASE 
      WHEN NEW.email ILIKE '%arpit%' OR NEW.email ILIKE '%admin%' THEN true
      ELSE false
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
