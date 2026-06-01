-- Pokellection initial schema
-- Run in Supabase SQL Editor or via supabase db push

-- Enums
create type user_role as enum ('manager', 'buyer');
create type card_condition as enum ('NM', 'LP', 'MP', 'HP', 'DMG');
create type card_status as enum ('available', 'reserved', 'sold', 'draft');
create type reservation_status as enum ('pending', 'confirmed', 'picked_up', 'cancelled', 'expired');
create type fulfillment_type as enum ('pickup', 'ship');
create type shipping_method as enum ('untracked', 'tracked');
create type payment_method as enum ('etransfer', 'cash_on_pickup');
create type payment_status as enum ('awaiting_transfer', 'received', 'refunded');
create type fulfillment_status as enum ('pending', 'ready_for_pickup', 'shipped', 'completed', 'cancelled');

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'buyer',
  display_name text,
  phone text,
  created_at timestamptz not null default now()
);

-- Cards
create table cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  set_name text,
  card_number text,
  rarity text,
  condition card_condition not null default 'NM',
  price_cad numeric(10, 2) not null check (price_cad >= 0),
  quantity integer not null default 1 check (quantity >= 0),
  status card_status not null default 'draft',
  description text,
  tags text[] not null default '{}',
  photo_paths text[] not null default '{}',
  featured boolean not null default false,
  slug text not null unique
);

create index cards_status_idx on cards (status);
create index cards_slug_idx on cards (slug);

-- Site settings (single row)
create table site_settings (
  id integer primary key default 1 check (id = 1),
  pickup_location_label text not null default 'Ottawa, ON (address sent after confirmation)',
  pickup_hours text not null default 'Same-day pickup by appointment',
  contact_email text not null default '',
  untracked_shipping_fee_cad numeric(10, 2) not null default 3.00,
  tracked_shipping_fee_cad numeric(10, 2) not null default 15.00,
  etransfer_email text not null default '',
  etransfer_instructions text not null default 'Include your order number in the e-transfer memo.',
  reservation_hold_hours integer not null default 12
);

insert into site_settings (id) values (1);

-- Reservations
create table reservations (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards (id) on delete cascade,
  buyer_email text not null,
  buyer_name text not null,
  buyer_phone text not null,
  status reservation_status not null default 'pending',
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  notes text
);

create index reservations_status_idx on reservations (status);

-- Reserve card when reservation is created
create or replace function reserve_card_on_insert()
returns trigger as $$
begin
  update cards set status = 'reserved' where id = new.card_id and status = 'available';
  return new;
end;
$$ language plpgsql security definer;

create trigger on_reservation_created
  after insert on reservations
  for each row execute function reserve_card_on_insert();

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_email text not null,
  buyer_name text not null,
  buyer_phone text not null,
  fulfillment_type fulfillment_type not null,
  shipping_method shipping_method,
  shipping_fee_cad numeric(10, 2) not null default 0,
  subtotal_cad numeric(10, 2) not null,
  total_cad numeric(10, 2) not null,
  shipping_address jsonb,
  payment_method payment_method not null default 'etransfer',
  payment_status payment_status not null default 'awaiting_transfer',
  fulfillment_status fulfillment_status not null default 'pending',
  tracking_number text,
  etransfer_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  card_id uuid not null references cards (id),
  title_snapshot text not null,
  price_snapshot numeric(10, 2) not null,
  quantity integer not null default 1
);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cards_updated_at before update on cards
  for each row execute function set_updated_at();

create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, display_name)
  values (new.id, 'buyer', new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: is manager
create or replace function is_manager()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'manager'
  );
$$ language sql stable security definer;

-- RLS
alter table profiles enable row level security;
alter table cards enable row level security;
alter table site_settings enable row level security;
alter table reservations enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Profiles
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Managers can read all profiles"
  on profiles for select using (is_manager());

create policy "Managers can update profiles"
  on profiles for update using (is_manager());

-- Cards: public read available, manager full access
create policy "Public can view available cards"
  on cards for select using (status = 'available');

create policy "Managers can manage cards"
  on cards for all using (is_manager());

-- Site settings: public read, manager write
create policy "Public can read site settings"
  on site_settings for select using (true);

create policy "Managers can update site settings"
  on site_settings for update using (is_manager());

-- Reservations: anyone can create, manager manages
create policy "Anyone can create reservations"
  on reservations for insert with check (true);

create policy "Managers can manage reservations"
  on reservations for all using (is_manager());

-- Orders: anyone can create, manager manages
create policy "Anyone can create orders"
  on orders for insert with check (true);

create policy "Managers can manage orders"
  on orders for all using (is_manager());

create policy "Managers can manage order items"
  on order_items for all using (is_manager());

create policy "Anyone can create order items"
  on order_items for insert with check (true);

-- Storage bucket (run separately in Storage UI or):
-- insert into storage.buckets (id, name, public) values ('card-photos', 'card-photos', true);

-- Storage policies (after creating bucket):
-- create policy "Public read card photos" on storage.objects for select using (bucket_id = 'card-photos');
-- create policy "Managers upload card photos" on storage.objects for insert with check (bucket_id = 'card-photos' and is_manager());
-- create policy "Managers update card photos" on storage.objects for update using (bucket_id = 'card-photos' and is_manager());
-- create policy "Managers delete card photos" on storage.objects for delete using (bucket_id = 'card-photos' and is_manager());

-- After creating your manager user in Auth, run:
-- update profiles set role = 'manager' where id = 'YOUR-USER-UUID';
