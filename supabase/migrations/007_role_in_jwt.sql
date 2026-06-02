create or replace function sync_role_to_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_profile_created_sync_role on profiles;
create trigger on_profile_created_sync_role
  after insert on profiles
  for each row execute function sync_role_to_app_metadata();

drop trigger if exists on_profile_role_updated_sync_role on profiles;
create trigger on_profile_role_updated_sync_role
  after update of role on profiles
  for each row execute function sync_role_to_app_metadata();

update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
from profiles p
where p.id = u.id;
