-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can update roles" ON public.user_roles;

DROP POLICY IF EXISTS "Users can view their own pending stones" ON public.pending_gemstones;
DROP POLICY IF EXISTS "Admins and Curators can view all pending stones" ON public.pending_gemstones;
DROP POLICY IF EXISTS "Users can insert pending stones" ON public.pending_gemstones;
DROP POLICY IF EXISTS "Admins and Curators can update pending stones" ON public.pending_gemstones;
DROP POLICY IF EXISTS "Authenticated users can view pending stones" ON public.pending_gemstones;
DROP POLICY IF EXISTS "Service role can update pending stones" ON public.pending_gemstones;

-- Disable RLS temporarily
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_gemstones DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_gemstones ENABLE ROW LEVEL SECURITY;

-- Create new simple policies for user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read roles" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create new simple policies for pending_gemstones
CREATE POLICY "Users can view their own pending stones" ON public.pending_gemstones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view pending stones" ON public.pending_gemstones
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert pending stones" ON public.pending_gemstones
  FOR INSERT WITH CHECK (auth.uid() = user_id);
