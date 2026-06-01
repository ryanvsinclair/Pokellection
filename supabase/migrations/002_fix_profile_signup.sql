-- Fix "database error" when creating Auth users
-- Cause: handle_new_user() inserts into profiles, but RLS had no INSERT policy.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'buyer'::user_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    raise exception 'handle_new_user failed: %', sqlerrm;
end;
$$;

-- Allow profile row creation during auth signup / dashboard user creation
drop policy if exists "Allow profile creation on signup" on profiles;
create policy "Allow profile creation on signup"
  on profiles
  for insert
  with check (true);

-- Users still only read/update their own row unless manager policies apply
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles
  for update
  using (auth.uid() = id);

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on public.profiles to postgres, service_role;
