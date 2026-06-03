-- Next-day delivery: $5 non-refundable deposit upfront; balance due on delivery.

alter type payment_status add value if not exists 'deposit_received' after 'awaiting_transfer';

alter table public.orders
  add column if not exists deposit_cad numeric(10, 2) not null default 0,
  add column if not exists balance_due_cad numeric(10, 2);
