-- Buyer accounts: cart + order ownership

alter table orders
  add column if not exists buyer_id uuid references auth.users (id) on delete set null;

create index if not exists orders_buyer_id_idx on orders (buyer_id);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references cards (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index if not exists cart_items_user_id_idx on cart_items (user_id);

alter table cart_items enable row level security;

-- Cart: users manage only their own rows
drop policy if exists "Users manage own cart" on cart_items;
create policy "Users manage own cart"
  on cart_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Orders: buyers can read their own orders
drop policy if exists "Buyers can view own orders" on orders;
create policy "Buyers can view own orders"
  on orders
  for select
  using (buyer_id = auth.uid());

-- Order items: buyers can read items for their orders
drop policy if exists "Buyers can view own order items" on order_items;
create policy "Buyers can view own order items"
  on order_items
  for select
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.buyer_id = auth.uid()
    )
  );

-- Tighten order insert: logged-in buyers attach their user id
drop policy if exists "Anyone can create orders" on orders;
create policy "Authenticated buyers can create orders"
  on orders
  for insert
  with check (buyer_id = auth.uid());

drop policy if exists "Anyone can create order items" on order_items;
create policy "Authenticated buyers can create order items"
  on order_items
  for insert
  with check (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.buyer_id = auth.uid()
    )
  );
