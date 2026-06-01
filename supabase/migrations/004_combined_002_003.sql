-- =============================================================================
-- Pokellection: combined migrations 002 + 003
-- =============================================================================
-- Run this ONCE in Supabase SQL Editor after 001_initial_schema.sql
--
-- What this does:
--   002  Fix auth signup (profile auto-create + RLS)
--   003  Buyer accounts (cart, order ownership, buyer RLS)
--
-- Safe to re-run: uses IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE OR REPLACE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 002: Fix profile creation when Auth users are created
-- -----------------------------------------------------------------------------

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

-- Recreate trigger only if missing (001 may have already created it)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profile RLS: allow insert on signup, buyers update own row
drop policy if exists "Allow profile creation on signup" on public.profiles;
create policy "Allow profile creation on signup"
  on public.profiles
  for insert
  with check (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on public.profiles to postgres, service_role;

-- -----------------------------------------------------------------------------
-- 003: Buyer accounts — cart + order ownership
-- -----------------------------------------------------------------------------

alter table public.orders
  add column if not exists buyer_id uuid references auth.users (id) on delete set null;

create index if not exists orders_buyer_id_idx on public.orders (buyer_id);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index if not exists cart_items_user_id_idx on public.cart_items (user_id);

alter table public.cart_items enable row level security;

-- Cart: users manage only their own rows
drop policy if exists "Users manage own cart" on public.cart_items;
create policy "Users manage own cart"
  on public.cart_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Orders: buyers read their own orders (managers still use "Managers can manage orders" from 001)
drop policy if exists "Buyers can view own orders" on public.orders;
create policy "Buyers can view own orders"
  on public.orders
  for select
  using (buyer_id = auth.uid());

-- Order items: buyers read items for their orders
drop policy if exists "Buyers can view own order items" on public.order_items;
create policy "Buyers can view own order items"
  on public.order_items
  for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.buyer_id = auth.uid()
    )
  );

-- Replace open order inserts with authenticated buyer-only inserts
drop policy if exists "Anyone can create orders" on public.orders;
drop policy if exists "Authenticated buyers can create orders" on public.orders;
create policy "Authenticated buyers can create orders"
  on public.orders
  for insert
  with check (buyer_id = auth.uid());

drop policy if exists "Anyone can create order items" on public.order_items;
drop policy if exists "Authenticated buyers can create order items" on public.order_items;
create policy "Authenticated buyers can create order items"
  on public.order_items
  for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.buyer_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Storage bucket for card photos (from 001 comments — run if not done yet)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('card-photos', 'card-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read card photos" on storage.objects;
create policy "Public read card photos"
  on storage.objects
  for select
  using (bucket_id = 'card-photos');

drop policy if exists "Managers upload card photos" on storage.objects;
create policy "Managers upload card photos"
  on storage.objects
  for insert
  with check (bucket_id = 'card-photos' and public.is_manager());

drop policy if exists "Managers update card photos" on storage.objects;
create policy "Managers update card photos"
  on storage.objects
  for update
  using (bucket_id = 'card-photos' and public.is_manager());

drop policy if exists "Managers delete card photos" on storage.objects;
create policy "Managers delete card photos"
  on storage.objects
  for delete
  using (bucket_id = 'card-photos' and public.is_manager());

-- =============================================================================
-- After running: promote your manager account (replace UUID)
-- =============================================================================
-- update public.profiles set role = 'manager' where id = 'YOUR-USER-UUID';
