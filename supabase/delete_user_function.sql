-- Function to delete a user (admin only)
-- This function handles both auth.users deletion and related data cleanup
create or replace function public.delete_user(target_user_id uuid)
returns table (success boolean, message text)
language plpgsql
security definer
as $$
declare
  caller_role text;
  user_exists boolean;
  caller_id uuid;
begin
  -- Get caller info
  caller_id := auth.uid();
  
  -- Check if caller is authenticated
  if caller_id is null then
    return query select false, 'User not authenticated';
  end if;
  
  -- Check if caller is an admin
  select role into caller_role 
  from public.user_roles 
  where id = caller_id;
  
  if caller_role != 'Admin' then
    return query select false, 'Only admins can delete users. Current role: ' || COALESCE(caller_role, 'None');
  end if;
  
  -- Check if target user exists
  select exists(select 1 from auth.users where id = target_user_id) into user_exists;
  
  if not user_exists then
    return query select false, 'User does not exist';
  end if;
  
  -- Prevent self-deletion
  if target_user_id = caller_id then
    return query select false, 'Cannot delete your own account';
  end if;
  
  -- Delete user's data from all tables (cascading deletes will handle most)
  -- user_roles will cascade delete due to ON DELETE CASCADE
  -- profiles will be handled by auth.users deletion
  -- pending_gemstones and total_gemstones will cascade delete due to ON DELETE CASCADE
  
  -- Delete the user from auth.users
  delete from auth.users where id = target_user_id;
  
  return query select true, 'User deleted successfully';
  
exception
  when others then
    return query select false, 'Error: ' || SQLERRM;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.delete_user(uuid) to authenticated;
