-- Fix RLS policy for total_gemstones to prevent Looker role from inserting
-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own total gemstones" ON public.total_gemstones;

-- Create new role-based insert policy that excludes Looker role
CREATE POLICY "Non-Looker users can insert own total gemstones" ON public.total_gemstones
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.id = auth.uid()
        AND ur.role = 'Looker'
    )
  );
