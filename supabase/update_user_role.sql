-- Function to safely update a user's role and derived permissions
create or replace function public.update_user_role(
  target_user uuid,
  new_role text
) returns table (can_edit boolean, can_add boolean, can_approve boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  new_can_edit boolean;
  new_can_add boolean;
  new_can_approve boolean;
begin
  -- Ensure role value is valid
  if new_role not in ('Admin', 'Curator', 'Student', 'Looker') then
    raise exception 'Invalid role value %', new_role;
  end if;

  -- Verify caller exists and is an admin
  select role into caller_role
    from public.user_roles
    where id = auth.uid();

  if caller_role is null then
    raise exception 'Caller does not have a role assigned';
  end if;

  if caller_role <> 'Admin' then
    raise exception 'Only admins can update user roles';
  end if;

  -- Derive permissions based on new role
  new_can_edit := (new_role in ('Admin', 'Curator'));
  new_can_add := (new_role <> 'Looker');
  new_can_approve := (new_role in ('Admin', 'Curator'));

  update public.user_roles
    set role = new_role,
        can_edit = new_can_edit,
        can_add = new_can_add,
        can_approve = new_can_approve,
        updated_at = now()
  where id = target_user;

  if not found then
    raise exception 'Target user % not found', target_user;
  end if;

  return query
  select new_can_edit, new_can_add, new_can_approve;
end;
$$;

grant execute on function public.update_user_role(uuid, text) to authenticated;
