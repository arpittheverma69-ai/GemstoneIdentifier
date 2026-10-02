-- Temporarily disable the auth trigger to test signup
-- This will help us identify if the trigger is causing the 500 error

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.auto_assign_user_role() CASCADE;

-- Comment: Run this script, then try signup again
-- If signup works, we know the trigger was the issue
-- If signup still fails, the issue is elsewhere
