-- Backfill shop pricing rules on existing cards:
-- under $0.50 → $0.50, under $1 → $1, otherwise floor to whole dollars.

update cards
set
  price_cad = case
    when price_cad <= 0 then 0
    when price_cad < 0.5 then 0.5
    when price_cad < 1 then 1
    else floor(price_cad)
  end,
  updated_at = now()
where price_cad is distinct from (
  case
    when price_cad <= 0 then 0
    when price_cad < 0.5 then 0.5
    when price_cad < 1 then 1
    else floor(price_cad)
  end
);
