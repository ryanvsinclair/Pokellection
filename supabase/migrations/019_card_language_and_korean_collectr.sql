-- Card language (from Collectr sync showcase) + separate Japanese / Korean URLs.

create type card_language as enum ('english', 'french', 'japanese', 'korean');

alter table public.cards
  add column if not exists language card_language not null default 'english';

create index cards_language_idx on public.cards (language);

alter table public.site_settings
  add column if not exists collectr_japanese_url text not null default '',
  add column if not exists collectr_korean_url text not null default '';

-- Migrate legacy combined JP/KR URL into Japanese (manager can add Korean URL after).
update public.site_settings
set collectr_japanese_url = collectr_japanese_korean_url
where id = 1
  and collectr_japanese_url = ''
  and collectr_japanese_korean_url <> '';
