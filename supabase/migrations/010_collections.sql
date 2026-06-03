-- Published card collections (bundle listings at a set price).

create type collection_status as enum ('draft', 'available', 'sold');

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  slug text not null unique,
  description text,
  price_cad numeric(10, 2) not null check (price_cad >= 0),
  status collection_status not null default 'draft'
);

create index collections_status_idx on public.collections (status);
create index collections_slug_idx on public.collections (slug);

create table public.collection_cards (
  collection_id uuid not null references public.collections (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete restrict,
  sort_order integer not null default 0,
  primary key (collection_id, card_id)
);

create index collection_cards_card_id_idx on public.collection_cards (card_id);

create trigger collections_updated_at
  before update on public.collections
  for each row execute function set_updated_at();

alter table public.collections enable row level security;
alter table public.collection_cards enable row level security;

create policy "Public read available collections"
  on public.collections
  for select
  using (status = 'available');

create policy "Managers manage collections"
  on public.collections
  for all
  using (is_manager());

create policy "Public read cards in available collections"
  on public.collection_cards
  for select
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_cards.collection_id
        and c.status = 'available'
    )
  );

create policy "Managers manage collection_cards"
  on public.collection_cards
  for all
  using (is_manager());

-- Cart: line is either a single card or a whole collection.
alter table public.cart_items
  alter column card_id drop not null;

alter table public.cart_items
  add column if not exists collection_id uuid references public.collections (id) on delete cascade;

alter table public.cart_items
  drop constraint if exists cart_items_user_id_card_id_key;

alter table public.cart_items
  add constraint cart_items_product_check check (
    (card_id is not null and collection_id is null)
    or (card_id is null and collection_id is not null)
  );

create unique index if not exists cart_items_user_card_unique
  on public.cart_items (user_id, card_id)
  where card_id is not null;

create unique index if not exists cart_items_user_collection_unique
  on public.cart_items (user_id, collection_id)
  where collection_id is not null;

-- Order lines may snapshot a collection bundle.
alter table public.order_items
  alter column card_id drop not null;

alter table public.order_items
  add column if not exists collection_id uuid references public.collections (id) on delete set null;

alter table public.order_items
  add constraint order_items_product_check check (
    (card_id is not null and collection_id is null)
    or (card_id is null and collection_id is not null)
  );
