-- Buyer-requested market price review before e-transfer (Canada ship orders).

alter table public.orders
  add column if not exists pricing_review_message text,
  add column if not exists pricing_review_requested_at timestamptz,
  add column if not exists pricing_review_resolved_at timestamptz;

comment on column public.orders.pricing_review_message is
  'Optional buyer note when requesting a price review before e-transfer.';
comment on column public.orders.pricing_review_requested_at is
  'Set at checkout when buyer asks for price review; blocks e-transfer until resolved.';
comment on column public.orders.pricing_review_resolved_at is
  'Set by manager when adjusted total is ready for buyer payment.';
