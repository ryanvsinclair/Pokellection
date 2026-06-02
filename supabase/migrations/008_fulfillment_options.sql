-- Checkout fulfillment options (Canada ship, Ottawa pickup/delivery).

alter table public.orders
  add column if not exists fulfillment_option text;

alter table public.orders
  drop constraint if exists orders_fulfillment_option_check;

alter table public.orders
  add constraint orders_fulfillment_option_check check (
    fulfillment_option is null
    or fulfillment_option in (
      'canada_ship',
      'next_day_pickup',
      'same_day_pickup',
      'next_day_delivery'
    )
  );

comment on column public.orders.fulfillment_option is
  'Buyer-selected checkout option; legacy rows may be null (old untracked/tracked shipping_method).';
