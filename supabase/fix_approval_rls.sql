-- Fix RLS policy for Admin/Curator approval workflow
-- This allows Admins and Curators to insert stones on behalf of other users during approval

-- Drop the restrictive policy that's blocking approval
DROP POLICY IF EXISTS "Non-Looker users can insert own total gemstones" ON public.total_gemstones;

-- Create a more flexible policy that allows:
-- 1. Users to insert their own stones (for direct creation)
-- 2. Admins and Curators to insert stones on behalf of others (for approval workflow)
CREATE POLICY "Flexible insert for total gemstones" ON public.total_gemstones
  FOR INSERT WITH CHECK (
    -- Allow users to insert their own stones
    (auth.uid() = user_id) 
    OR 
    -- Allow Admins and Curators to insert stones on behalf of others
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.id = auth.uid()
        AND ur.role IN ('Admin', 'Curator')
    )
  );
