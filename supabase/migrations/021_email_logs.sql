-- Transactional email audit log + idempotency for duplicate checkout submits.

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  template text not null,
  recipient text not null,
  reference_type text not null check (reference_type in ('order', 'reservation')),
  reference_id uuid not null,
  status text not null check (status in ('sent', 'skipped', 'failed')),
  provider_id text,
  error_message text,
  created_at timestamptz not null default now()
);

comment on table public.email_logs is
  'Resend send attempts; unique (template, reference_type, reference_id) when status=sent prevents duplicate order confirmations.';

create unique index if not exists email_logs_idempotency_sent
  on public.email_logs (template, reference_type, reference_id)
  where status = 'sent';

create index if not exists email_logs_reference_id_idx
  on public.email_logs (reference_id, created_at desc);

alter table public.email_logs enable row level security;

create policy "Managers read email_logs"
  on public.email_logs
  for select
  using (is_manager());

-- Inserts use service role only (bypasses RLS).
