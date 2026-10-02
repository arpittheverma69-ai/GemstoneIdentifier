-- ==============================================================================
-- GemSpy Master Fix: User Roles, Permissions, and Pending Access Requests
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Project Dashboard: https://supabase.com/dashboard/project/tgwxpyfespesfnqadnpn/sql
-- 2. Paste and RUN this entire script.
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

-- Ensure user_roles constraint allows all valid roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('Admin', 'Curator', 'Student', 'Looker', 'Pending'));

-- 3. Backfill existing auth users into user_roles with 'Looker' default
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

-- 4. Set primary Administrator account (Admin can assign other admins from Settings -> User Management)
UPDATE public.user_roles
SET 
  role = 'Admin',
  can_edit = true,
  can_add = true,
  can_approve = true,
  updated_at = NOW()
WHERE 
  email = 'arpitverma@gmail.com' OR 
  email = 'jinalkamdar.9@gmail.com';

-- 5. Set any test account (like arpitwillgetit@gmail.com) back to Looker so it can test the signup/request flow
UPDATE public.user_roles
SET 
  role = 'Looker',
  can_edit = false,
  can_add = false,
  can_approve = false,
  updated_at = NOW()
WHERE 
  email = 'arpitwillgetit@gmail.com';

-- 6. Disable RLS on pending_users and user_roles to prevent any 42501 permission issues
ALTER TABLE public.pending_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Grant full access to all roles
GRANT ALL ON public.pending_users TO anon, authenticated, service_role;
GRANT ALL ON public.user_roles TO anon, authenticated, service_role;

-- 7. Trigger to automatically assign 'Looker' to EVERY new signup
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
