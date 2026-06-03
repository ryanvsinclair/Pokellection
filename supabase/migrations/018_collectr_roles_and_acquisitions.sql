-- Named Collectr showcase URLs + bulk purchase (acquisition) tracking.

alter table public.site_settings
  add column if not exists collectr_main_url text not null default '',
  add column if not exists collectr_new_purchases_url text not null default '',
  add column if not exists collectr_french_url text not null default '',
  add column if not exists collectr_japanese_korean_url text not null default '';

create table public.inventory_acquisitions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  purchased_at timestamptz not null default now(),
  label text,
  purchase_price_cad numeric(10, 2) not null check (purchase_price_cad >= 0),
  collectr_showcase_url text,
  card_count integer not null default 0,
  note text
);

create index inventory_acquisitions_purchased_at_idx
  on public.inventory_acquisitions (purchased_at desc);

create table public.acquisition_cards (
  acquisition_id uuid not null references public.inventory_acquisitions (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  quantity_added integer not null check (quantity_added > 0),
  primary key (acquisition_id, card_id)
);

create index acquisition_cards_card_id_idx on public.acquisition_cards (card_id);

alter table public.inventory_acquisitions enable row level security;
alter table public.acquisition_cards enable row level security;

create policy "Managers manage inventory_acquisitions"
  on public.inventory_acquisitions
  for all
  using (is_manager());

create policy "Managers manage acquisition_cards"
  on public.acquisition_cards
  for all
  using (is_manager());
