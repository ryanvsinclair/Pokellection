-- Buy one card from a published collection at list price + surcharge (see collection-pricing.ts).

alter table public.cart_items
  add column if not exists from_collection_id uuid references public.collections (id) on delete cascade;

alter table public.order_items
  add column if not exists from_collection_id uuid references public.collections (id) on delete set null;

alter table public.cart_items
  drop constraint if exists cart_items_product_check;

alter table public.cart_items
  add constraint cart_items_product_check check (
    (card_id is not null and collection_id is null)
    or (card_id is null and collection_id is not null and from_collection_id is null)
  );

alter table public.order_items
  drop constraint if exists order_items_product_check;

alter table public.order_items
  add constraint order_items_product_check check (
    (card_id is not null and collection_id is null)
    or (card_id is null and collection_id is not null and from_collection_id is null)
  );
