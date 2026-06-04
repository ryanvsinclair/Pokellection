# Architecture & Decisions

The **"why"** behind non-obvious choices. Read this before changing the systems
below — these decisions were deliberate and often hard-won. When you discover a
new non-obvious constraint, **add it here** (see `.cursor/rules/decisions.mdc`).

Format: newest decisions on top. Keep entries short — context, decision, why.

---

## SEO, sitemap, and Google Merchant feed

**Context:** Public discovery (Google Search + Shopping) for shop singles and collections.

**Decision:** `src/lib/seo.ts` — metadata helpers, Product JSON-LD, breadcrumbs. Each available card
at `/shop/[slug]` gets rich `generateMetadata` (canonical, Open Graph image from first photo) plus
`Product` schema. `src/app/sitemap.ts` and `robots.ts` list indexable routes; admin/account/checkout
disallowed. `GET /product-feed.xml` — Google Merchant RSS (available cards with photos only); link
feed in Merchant Center after `NEXT_PUBLIC_SITE_URL` is production. Catalog queries cached via
`unstable_cache` (`src/lib/queries/seo.ts`, 120s); `revalidatePublicCatalogSeo()` on inventory
changes. Public shop/collection pages set `revalidate = 60` (ISR hint; root layout still reads
auth cookies so pages may render dynamically until cart/session is split from layout).

---

## Canada ship price review before e-transfer

**Context:** Shop prices reflect TCGPlayer at publish time; shipped orders are paid by e-transfer after checkout.

**Decision:** On `canada_ship` checkout, buyer can opt in to a price review with an optional message
(`pricing_review_*` columns on `orders`). While `pricing_review_requested_at` is set and
`pricing_review_resolved_at` is null, buyer order page hides e-transfer instructions; manager
adjusts `subtotal_cad` (total = subtotal + shipping) in admin and checks “Ready for buyer to pay”.

---

## Resend transactional email

**Context:** Order confirmations and manager alerts after checkout; more templates in
`docs/EMAIL_GAMEPLAN.md`.

**Decision:** `src/lib/email/` — Resend SDK, fail-open (`sendOrderPlacedEmails` never throws).
Requires `RESEND_API_KEY` + `RESEND_DEFAULT_FROM` (verified domain). Manager inbox:
`MANAGER_NOTIFICATION_EMAIL` → `site_settings.contact_email` → `BUSINESS_EMAIL`. Hooks:
`placeOrder` → `sendOrderPlacedEmails`; admin `updateOrder` with “ready to pay” on price review
→ `sendPricingReviewResolvedEmail`; same action compares before/after order →
`sendOrderStatusEmails` (payment received, ready for pickup, shipped + tracking);
`reserveCardForPickupAction` → `sendReservationEmails`.

**Idempotency:** `email_logs` (migration `021`) + unique index on successful
`order_placed_*` sends per order id prevents duplicate checkout confirmation emails.
Logging uses `SUPABASE_SERVICE_ROLE_KEY` via `createServiceClient()` — not exposed to browsers.
Managers can `select` logs in Supabase; Auth emails remain on Supabase, not Resend.

---

## French Collectr list pricing

**Context:** French cards use a separate Collectr showcase; Collectr metadata is still
English-market USD. Physical stock is French; list prices should be below English equivalents.

**Decision:** `collectrListPriceCad` (`src/lib/collectr-pricing.ts`) applies on French sync
apply/insert only. Tiers on Collectr reference CAD (`marketPriceCad`): &lt;$10 → 70%,
&lt;$25 → 65%, &lt;$50 → 60%, &lt;$100 → 55%, $100+ → 50%, then existing `roundPriceCad`
shop rules ($0.50 / $1 floors, whole dollars ≥$1).

---

## Collectr language isolation (English / French / JP / KR)

**Context:** The same Collectr catalog identity (product + condition + printing + grade) can appear
in multiple language showcases; merging by identity alone caused wrong qty updates and slug clashes.

**Decision:** Match and delist using `language:collectrIdentity` sync keys. Each scraped row carries
`language` + `showcaseScopeId` (collection UUID or profile handle). Slugs append language when not
English. Acquisition qty bumps match **English** inventory only. Delist still scoped by
`collectr-showcase:<scopeId>` tag per showcase.

---

## Collectr sub-collection sync (French / JP / KR)

**Context:** `api-v2` may return **500** for `?collection=<uuid>` when the request includes
`unstackedView=true` (main showcase uses it; Collectr app's `getShowcaseProfile` query does not).

**Decision:** `buildShowcaseUrl` omits `unstackedView` when `id` (collection UUID) is set; retries
alternate query shapes on 500 (`filters=[]`, omit `offset` on page 1). If the browser API still fails,
`/api/admin/collectr/scrape-html` server-fetches the public showcase page (avoids CORS on
`app.getcollectr.com`). Server `fetchShowcasePage` uses the same URL variants as the browser client.
- **Gotcha:** HTML embed is often **one page (~30 cards)** while `total_cards` can be higher (e.g. 33).
  The extra cards exist only on API page 2+. When the API 500s from both browser and Vercel, sync gets
  30/33 with a warning — not a parser bug. After HTML, we still attempt API supplement for remaining
  offsets.
- **Gotcha:** Browsers ignore `Referer`/`Origin` in `fetch()` headers. Production admin was sending the
  Pokellection URL as referer; Collectr sub-collections then 500 while localhost often still worked.
  Use `collectrBrowserFetchInit` (`referrer` + `referrerPolicy: "unsafe-url"`). Fallback:
  `POST /api/admin/collectr/showcase-page` (server sets Referer) before HTML scrape.

---

## Card language from Collectr sync showcase

**Context:** Main = English; French / Japanese / Korean are separate Collectr collection URLs.

**Decision:** `cards.language` enum (`english`, `french`, `japanese`, `korean`). Showcase sync sets
language from the portfolio config being synced (`syncPortfolioConfigs`). Each scraped
identity gets one `collectr-showcase:<scopeId>` tag for that showcase (not all scopes at once).
Site settings: `collectr_japanese_url` + `collectr_korean_url` (legacy `collectr_japanese_korean_url`
migrated into Japanese on `019`). Shop shows a language badge when not English.

---

## Collectr roles, acquisition import, language showcases

**Context:** Multiple Collectr URLs serve different jobs (main sync, temp purchases,
French, JP/KR). Temp holding is merged into main in the Collectr app after website import.

**Decision:** Full product spec in `docs/COLLECTR_INVENTORY_SPEC.md`. Implemented: migration
`018` + four `site_settings` URL columns; `/admin/import` (links → acquisition → sync → CSV);
`POST /api/admin/collectr/acquisition/preview|apply`; `/admin/acquisitions` P&L;
`collectr-settings.ts` / `collectr-card-import.ts`. **Gotcha:** `showcaseProfileIds` for
sync/delist must come from `syncPortfolioConfigs` only — never include new-purchases profile.
Acquisition apply **adds** quantity; showcase sync **sets** quantity from Collectr.

---

## Buyer account required to purchase

**Context:** Cart, checkout, reservations, and fulfillment require a known buyer.

**Decision:** Guests may browse shop/collections; `canPurchaseAsBuyer` gates add-to-cart UI.
Middleware enforces signed-in **buyer** on `/checkout` and `/reserve/*` (redirect to
`/account/signup`). Reservations RLS requires `auth.uid()` (`017`). Cart/order inserts
already require `buyer_id = auth.uid()`.

---

## Next-day delivery deposit

**Context:** Delivery bookings need a non-refundable $5 hold; balance is collected on delivery.
Cancel/no-show keeps the deposit.

**Decision:** `orders.deposit_cad` / `balance_due_cad` (migration `016`); status
`deposit_received` after $5 e-transfer. Buyer UI shows deposit vs balance; admin marks
deposit then full payment. Ship orders still prepay full total.

---

## Pickup orders: pay on arrival

**Context:** Store pickup (next-day / same-day) should not require e-transfer before the
buyer arrives; ship and home delivery still prepay.

**Decision:** `placeOrder` sets `payment_method: cash_on_pickup` for
`next_day_pickup` and `same_day_pickup`; `etransfer` for ship/delivery. Same
`awaiting_transfer` status, but buyer UI shows “Pay when you pick up”; admin
“Awaiting e-transfer” counts only `payment_method = etransfer`.

---

## Admin card status vs checkout Ottawa areas

**Context:** Published bundles set member cards to `reserved`, same DB status as
same-day pickup holds — admin “Reserved cards” was misleading.

**Decision:** Admin uses `CardAdminStatusCell`: “In collection” (published bundle),
“Pickup hold” (pending `reservations`), or base statuses. Dashboard splits counts.
`PICKUP_AREAS` (Findlay Creek, Orleans, South Keys, Blair) applies only to
next-day pickup (`pickup_area` on order). `DELIVERY_AREAS` unchanged for next-day delivery.

---

## Collection preview images + RLS

**Context:** Published bundles set member cards to `reserved`. Public `cards` RLS
only allowed `available` / recent `sold`, so `collection_cards` → `cards(*)` joins
returned null and listing previews were empty.

**Decision:** `015_collection_member_cards_public_read.sql` adds a select policy:
read `cards` rows linked to an `available` collection. Previews still built in
`buildCollectionPreviewImages`; listing UI uses a compact 4-across thumb strip.

---

## Checkout fulfillment options (Ottawa ET)

**Context:** Checkout needs Canada ship, Ottawa pickup windows, and zoned next-day
delivery — not just untracked/tracked mail.

**Decision:** `orders.fulfillment_option` (`008_fulfillment_options.sql`) stores
`canada_ship` | `next_day_pickup` | `same_day_pickup` | `next_day_delivery`.
Fees and cutoffs live in `src/lib/checkout-options.ts` (America/Toronto): ship $20
min fee; same-day pickup +$5 after 5 PM; next-day pickup by 10:30 PM; next-day
delivery by 11 PM with area fees in `shipping_address.delivery_area`. UI:
`CheckoutForm`; server validates in `placeOrder`.

---

## Card collections (bundles + singles)

**Context:** Managers publish a fixed-price bundle; buyers browse each card’s photo
and details on the collection page. Singles in a published bundle must not appear
in shop/search; buyers may buy one card from the bundle at list price + $5.

**Decision:** Publish sets member cards `reserved` (hidden from `getAvailableCards`
via status + `getCardIdsInPublishedCollections`). Cart uses `from_collection_id` on
card lines for singles (`011_collection_single_purchase.sql`). `/shop/[slug]` redirects
reserved cards to `/collections/[slug]`. Selling a single detaches the card from
`collection_cards` and auto-unpublishes the bundle when empty. Bundle vs singles
for the same collection cannot coexist in cart/checkout.

---

## Cart quantity capped by `cards.quantity`

**Context:** Buyers could add more cart units than the listing’s `cards.quantity` (shop
inventory).

**Decision:** `addToCartAction` loads `cards.quantity` + status and rejects when
`inCart + 1` would exceed stock (`max_quantity`). Checkout `updateCartQuantity` caps
to `min(requested, card.quantity)`. UI passes `stockQuantity` / `cartQuantity` into
`AddToCartButton` so the + control disables at the limit.

---

## `/admin` requires manager (middleware + layout)

**Context:** Guests could see the admin shell when middleware treated `getUser()`
errors as “continue” or when the `catch` block called `next()`.

**Decision:** Admin routes redirect to `/login?redirect=…` if unauthenticated; non-managers
to `/account`. `requireManagerPage()` in `admin/layout.tsx` repeats the check from the
DB role (defense in depth). Do not return `next()` on auth errors for `/admin`.

---

## Add to cart + `useActionState`: no layout revalidate in the action

**Context:** Clicking add to cart threw “An unexpected response was received from the
server” (Turbopack / Next 15).

**Decision:** `addToCartAction` returns `{ ok, count }` only — no `revalidatePath` and
no `redirect()` inside that action. Client updates badge via returned `count`,
then `router.refresh()`; guests get `{ error: "auth" }` and client navigates to
login. Checkout/remove/update actions may still `revalidatePath` (plain forms, not
`useActionState`). Avoid `revalidatePath("/", "layout")` inside any `useActionState`
handler — it races the action RSC payload.

---

## Site logo: fanned cards SVG + archived Pokéball PNGs

**Context:** Header mark should avoid the Pokéball silhouette; old PNG logos kept
for optional reuse.

**Decision:** Active logo is inline SVG in `PokellectionLogoMark` (two generic empty
TCG-style cards + wordmark). Previous raster marks live in
`public/brand/archive/`. Export copies in `public/brand/pokellection-logo-cards*.svg`.
To revert, point `SiteLogo` at `/brand/archive/pokellection-logo-mark.png` again.

---

## Middleware must live in `src/middleware.ts` only (Edge bundle)

**Context:** Vercel deploy failed: Edge middleware referenced unsupported module
`src/lib/supabase/middleware.ts` (pulled in `@/types/database` / generated Supabase types).
Middleware also 500'd when querying `profiles` from Edge (RLS/network).

**Decision:** All middleware logic lives in **`src/middleware.ts`** — only `@supabase/ssr`
and `next/server`. Role for route guards comes from **`user.app_metadata.role`** (JWT),
not a DB read. Migration `007_role_in_jwt.sql` syncs `profiles.role` → `auth.users`
`raw_app_meta_data` via triggers; backfill on apply. Server actions still use
`getUserProfileRole()` from DB. After role changes, users may need to sign out/in
to refresh the JWT.

**Vercel `MIDDLEWARE_INVOCATION_FAILED`:** Do **not** call `request.cookies.set` in
`setAll` — middleware may only set cookies on the **response**. Recreate
`NextResponse.next({ request })` in `setAll`, forward cookies on redirects.
If auth refresh fails (`getUser` error), return the pass-through response instead of throwing.

**Shop shows zero cards but admin has inventory:** Public pages only load
`status = 'available'` (RLS matches). If the Supabase client env is wrong or the query
errors, `getAvailableCards` returns `[]` — check server logs for `[getAvailableCards]`.
Restart `next dev` after editing `.env.local`. On Vercel, set `NEXT_PUBLIC_SUPABASE_*`
for Production/Preview; a broken deploy (middleware 500) prevents any page from loading.

**Dev ENOENT `build-manifest.json` / `_buildManifest.js.tmp`:** Corrupt or deleted
`.next` while `next dev` is still running (common after clearing cache mid-session).
Stop the dev server, `rm -rf .next`, then `npm run dev` (or `npm run dev:clean`).

**Dev `TypeError: fetch failed` (empty `code`):** Network/DNS — not RLS. Usually
(1) `.env.local` not saved or dev server not restarted, (2) placeholder URL still on disk,
(3) macOS IPv6 DNS — `npm run dev` sets `NODE_OPTIONS=--dns-result-order=ipv4first`.
`getSupabaseEnv()` in `src/lib/supabase/env.ts` throws early on bad URLs; logs include
`error.cause` (e.g. `ENOTFOUND your-project-ref.supabase.co`).

**Vercel log `ReferenceError: __dirname is not defined`:** Usually Edge middleware +
`next/server` (ua-parser) when Vercel **Framework Preset** is not **Next.js**, or
Edge lacks the polyfill. Fix: Project Settings → Framework = **Next.js**; in
`src/middleware.ts` set `export const config = { runtime: "nodejs", matcher: [...] }`
(stable in Next 15.5+). Do **not** use top-level `export const runtime` — Vercel logs
`Cannot use import statement outside a module` for serverless-middleware. Exclude
`sw.js` from the matcher if a stale service worker requests it.

---

## Shop price rounding (`roundPriceCad`)

**Context:** Raw Collectr/market prices often land on odd cents (e.g. $0.04, $1.43).
The shop wants clean, buyer-friendly price points.

**Decision:** Every write to `cards.price_cad` goes through `roundPriceCad()` in
`src/lib/currency.ts`: under **$0.50 → $0.50**, under **$1 → $1**, **$1+ → floor**
to whole dollars. Collectr imports use `importPriceCad()` (USD→CAD then round).
Applied in admin edit, manual add, CSV import, and Collectr sync apply. Migration
`006_round_card_prices.sql` backfilled existing rows.

---

## Theming: class-based dark mode via CSS variables

**Context:** Needed a light/dark toggle. The palette was already CSS variables in
`globals.css` (`--background`, `--card`, `--border`, `--muted`, `--primary`,
`--accent`) surfaced through `@theme inline` as `bg-card`, `text-muted`, etc.

**Decision:** Dark mode is **class-based**, not `prefers-color-scheme`. `globals.css`
declares `@custom-variant dark (&:where(.dark, .dark *))` and a `.dark { … }` block
that overrides the same variables. Added `--surface` / `--surface-strong` tokens to
replace ad-hoc `bg-slate-50/100`. Brand red is the `--primary` token (`bg-primary`,
`text-primary`), not raw `red-600`. `ThemeToggle` flips `.dark` on `<html>` and
persists to `localStorage.theme`; an inline script in the root layout `<head>` sets
the class **before paint** (so `<html>` has `suppressHydrationWarning`). Shop card
tiles in `CardGrid` use the same tokens (`bg-card`, `text-foreground`, `text-muted`,
`text-primary`); accent colors (amber/teal) use `dark:` variants for contrast.

---

## Printing/sub-type is a stored field; title stays clean; slug includes printing

**Context:** A catalog product is owned in multiple printings (Holofoil, Reverse
Holofoil, Normal, 1st Edition, Unlimited…). Previously the printing was baked into
the card `title` (e.g. "Gastly (Reverse Holofoil)") via `buildCollectrTitle`.

**Decision:** `cards.printing` (nullable `text`, migration `005`) stores the
printing/sub-type. `buildCollectrTitle` no longer appends the sub-type, so titles
stay clean ("Gastly"). The import (`mapRawProduct` + apply route) writes
`item.productSubType` into `printing` on insert **and** update. The shop card shows
`condition • printing` (just the condition when `printing` is null/empty).

**Why / gotcha:** Once the printing left the title, `product + condition` alone
collided across printings (Gastly NM Reverse Holofoil vs NM Normal → same slug and
a unique-constraint violation). `collectrSlug` now appends the slugified printing
(and grade) so each listing's slug stays unique. Existing 698 rows were backfilled
from the 3rd `|`-segment of the `collectr:` tag, with the trailing ` (<printing>)`
stripped from their titles.

---

## Collectr prices are USD — converted to CAD on import

**Context:** Collectr's `market_price` is in **USD**; we sell in CAD.

**Decision:** Convert on import via `usdToCad()` (`src/lib/currency.ts`, rate
`USD_TO_CAD`). `CollectrPortfolioItem.marketPriceCad` is therefore true CAD.
Existing rows were converted once with `price_cad = price_cad * 1.38`.

**Why:** Prices were originally imported raw (USD) into the `price_cad` column.
Re-running the sync re-derives CAD from raw USD × rate (no double-conversion of
DB values). Update `USD_TO_CAD` when the rate drifts; managers can also edit any
price after import.

## "Just sold" shop badges (`cards.sold_at`)

**Context:** Buyers should see when a listing recently sold without keeping it
purchaseable.

**Decision:** Set `sold_at` on every transition to `sold`; clear when relisted.
Public RLS allows reading `sold` rows for 72h. Shop/home grids show a "Just sold"
overlay via `isJustSoldCard()`; no add-to-cart.

---

## Collectr as listing source of truth; sales history separate

**Context:** Inventory is curated in Collectr; site/private sales are historical facts.
Re-acquiring the same variant should list again after sync.

**Decision:** Collectr sync: in showcase → `available` (or keep `reserved` in a bundle);
missing from showcase → `draft` (delist), not `sold`. `sold` only via checkout or
`private_sales` admin form. Sync relists `sold`/`draft` rows when the card returns in
Collectr. Sold ledger: `order_items` (site) + `private_sales` table (`/admin/sales`).

---

## Multiple Collectr portfolios (admin/import)

**Context:** Managers keep separate Collectr showcases (e.g. personal vs trade stock).

**Decision:** `site_settings.collectr_portfolios` stores `{ id, label, url }[]`.
Admin/import saves links, then syncs one portfolio or all. Cards get a
`collectr-showcase:<profileId>` tag; “mark sold” on sync only affects cards tagged
for the showcase(s) being synced (not other portfolios).

---

## Collectr sync runs in the browser, not the server

**Context:** Syncing the manager's Collectr showcase (`api-v2.getcollectr.com`).

**Decision:** Pagination/scraping happens **client-side** in the admin's browser
(`src/lib/collectr-client.ts`). The server (`api/admin/collectr/preview` + `apply`)
only diffs against the DB and imports — it never fetches Collectr itself.

**Why:**
- Server-side requests get **HTTP 500 from CloudFront even with a full browser
  header set** — it's **TLS fingerprinting**, not headers. Can't be fixed from a
  serverless environment.
- A real browser request returns 200, and the API sends
  `Access-Control-Allow-Origin: *`, so the admin's browser can read it cross-origin.
- **Gotcha:** the API **404s if empty query params are included** (e.g.
  `searchString=&id=`). `buildShowcaseUrl` must omit empty params.
- **Non-main Collectr collections** use the same profile URL plus
  `?collection=<uuid>`; the API filters via query param `id=<uuid>` (not `groupId`).
  Main showcase omits `id`. Delist scope uses the collection UUID when present
  (`showcaseScopeIdFromPortfolioUrl`), not the profile handle alone.
- Pagination is `offset`/`limit=30` until a page returns no products.

## Collectr listing identity = product + condition + sub_type + grade

**Context:** The same card can exist as multiple distinct sellable listings.

**Decision:** A listing's identity (and its `collectr:` tag) is
`productId | condition | productSubType | gradeId | gradeCompany`
(`collectrIdentity()` in `src/lib/collectr.ts`). Identical copies stack via `quantity`.

**Why:** Keying on `product_id` alone (or even product+condition) **merges genuinely
different cards** — e.g. the same card NM in *Reverse Holofoil* ($4.94) vs *Normal*
($0.40). Verified live: product+condition+sub_type yields the correct 698 distinct
listings (vs 759 total when counting quantities).

## Supabase types are generated; ssr is pinned to match supabase-js

**Context:** Every `.from().select()` was resolving to `never` (~100 type errors).

**Decision:**
- `src/types/supabase.ts` is **generated** from the live DB (never hand-edited);
  `src/types/database.ts` derives named aliases from it.
- `@supabase/ssr` is kept on **0.10.x** to match `@supabase/supabase-js` 2.106.x.

**Why:** ssr **0.6.1** built a client whose generics didn't match newer
supabase-js (`SupabaseClient` signature changed), collapsing query rows to `never`.
Upgrading ssr fixed it. **If rows go `never` again, suspect a stale generated type
or an ssr↔supabase-js version drift.**

## Data access goes through `src/lib/queries/`

**Decision:** Reads live in typed functions in `src/lib/queries/`, not inline in pages.

**Why:** Centralizes table/column references in one type-checked place so agents
can't typo columns or duplicate query logic across files.

## RLS role model

- **public:** read `cards` where `status='available'`, read `site_settings`.
- **buyer:** owns their `cart_items` + `orders`; **cannot** mutate `cards`.
- **manager:** full access; server code guards with `assertManager()` /
  the `is_manager()` SQL helper.
