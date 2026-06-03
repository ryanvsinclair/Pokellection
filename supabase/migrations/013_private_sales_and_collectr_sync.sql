-- Off-platform sales history; Collectr sync uses draft (delist) not sold for absence.

create table public.private_sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sold_at timestamptz not null default now(),
  card_id uuid references public.cards (id) on delete set null,
  title_snapshot text not null,
  price_cad numeric(10, 2),
  quantity integer not null default 1 check (quantity > 0),
  buyer_name text,
  note text,
  collectr_identity text
);

create index private_sales_sold_at_idx on public.private_sales (sold_at desc);
create index private_sales_card_id_idx on public.private_sales (card_id);

alter table public.private_sales enable row level security;

create policy "Managers manage private_sales"
  on public.private_sales
  for all
  using (is_manager());
