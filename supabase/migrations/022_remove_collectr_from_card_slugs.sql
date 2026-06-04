-- Strip legacy "-collectr-" infix from public card slugs (full rebuild via scripts/migrate-card-slugs.mjs).

update public.cards
set slug = trim(both '-' from regexp_replace(slug, '-collectr-', '-', 'g'))
where slug like '%-collectr-%';
