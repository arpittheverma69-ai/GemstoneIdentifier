-- Fixed auth trigger following Supabase best practices
-- Uses security definer and proper search path

-- First, drop the existing broken trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.auto_assign_user_role() CASCADE;

-- Create the function with proper security definer and search path
CREATE OR REPLACE FUNCTION public.auto_assign_user_role()
RETURNS trigger
SET search_path = ''
security definer
as $$
begin
  -- Insert new user into user_roles table with 'Looker' role
  insert into public.user_roles (
    id, 
    email, 
    role, 
    can_edit, 
    can_add, 
    can_approve,
    created_at,
    updated_at
  ) values (
    new.id,
    new.email,
    'Looker',
    false,
    true,
    false,
    now(),
    now()
  ) on conflict (id) do nothing;
  
  -- Also add to pending_users table for admin approval
  insert into public.pending_users (
    user_id,
    email,
    requested_role,
    status,
    created_at,
    updated_at
  ) values (
    new.id,
    new.email,
    'Looker',
    'Pending',
    now(),
    now()
  ) on conflict (user_id) do nothing;
  
  return new;
end;
$$ language plpgsql;

-- Create trigger that fires after a new user is created in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.auto_assign_user_role();
