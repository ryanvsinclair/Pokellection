-- Bundle member cards are `reserved` while the collection is published; the shop
-- policy only exposes `available` (and recent `sold`). Without this, nested
-- `cards(*)` on collection_cards returns null and collection previews are empty.

create policy "Public read cards in available collections"
  on public.cards
  for select
  using (
    exists (
      select 1
      from public.collection_cards cc
      join public.collections c on c.id = cc.collection_id
      where cc.card_id = cards.id
        and c.status = 'available'
    )
  );
