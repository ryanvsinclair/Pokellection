-- Timestamp when a card left the shop (for "Just sold" listings).

alter table public.cards
  add column if not exists sold_at timestamptz;

create index if not exists cards_sold_at_idx on public.cards (sold_at desc)
  where status = 'sold' and sold_at is not null;

drop policy if exists "Public read available cards" on public.cards;

create policy "Public read shop cards"
  on public.cards
  for select
  using (
    status = 'available'
    or (
      status = 'sold'
      and sold_at is not null
      and sold_at >= (now() - interval '72 hours')
    )
  );
