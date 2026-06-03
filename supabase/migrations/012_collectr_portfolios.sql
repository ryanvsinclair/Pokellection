-- Manager-configured Collectr showcase URLs (used on admin/import).

alter table public.site_settings
  add column if not exists collectr_portfolios jsonb not null default '[]'::jsonb;
