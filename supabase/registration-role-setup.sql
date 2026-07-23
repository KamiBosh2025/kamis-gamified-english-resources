-- Run once in the existing Supabase project's SQL Editor.
-- It only assigns the `normal` role to future registered users.
-- It does not create a new project and does not modify resources or media.

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'normal')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_role_created on auth.users;
create trigger on_auth_user_role_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_role();

-- Backfill only users that do not have a role yet. Existing admin roles remain unchanged.
insert into public.user_roles (user_id, role)
select id, 'normal'
from auth.users
on conflict (user_id) do nothing;
