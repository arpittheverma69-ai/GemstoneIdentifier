-- Disable the signup trigger to avoid conflicts with app-side pending user creation
-- The app will handle creating the user_roles and pending_users entries

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.auto_assign_user_role();

-- This allows the app to handle user role assignment without conflicts
