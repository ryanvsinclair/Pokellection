# SEO & Google Shopping setup

## Already in the app

| URL | Purpose |
|-----|---------|
| `/sitemap.xml` | Auto-generated from available cards + collections |
| `/robots.txt` | Allows shop/collections; blocks admin, account, checkout |
| `/product-feed.xml` | Google Merchant product feed (RSS + `g:` fields) |
| `/shop/[slug]` | Per-card title, description, canonical, Open Graph, Product JSON-LD |

Requires **`NEXT_PUBLIC_SITE_URL`** set to your production domain on Vercel (e.g. `https://pokellection.com`).

## Google Search Console

1. Add property for your domain.
2. Submit sitemap: `https://your-domain.com/sitemap.xml`
3. Request indexing on home and `/shop` after launch.

## Google Merchant Center (Shopping)

1. Create a Merchant Center account (country: **Canada**).
2. **Products → Feeds → Add feed** → **Scheduled fetch**.
3. Feed URL: `https://your-domain.com/product-feed.xml`
4. Fetch frequency: daily (or more often).
5. Only cards with **at least one photo** appear in the feed.
6. Category is set to **Collectible Trading Cards** (Google taxonomy `6997`).
7. Condition is **used** (singles). `identifier_exists` is false (no GTIN).

After approval, link Merchant Center to Google Ads if you run Shopping campaigns.

## Tips

- Write unique **descriptions** on high-value cards in admin (used in meta + feed).
- Keep slugs stable when editing titles (slug drives URLs).
- New listings refresh sitemap/feed within ~2 minutes via cache revalidation on save.
