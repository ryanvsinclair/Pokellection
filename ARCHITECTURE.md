# Architecture & Decisions

The **"why"** behind non-obvious choices. Read this before changing the systems
below — these decisions were deliberate and often hard-won. When you discover a
new non-obvious constraint, **add it here** (see `.cursor/rules/decisions.mdc`).

Format: newest decisions on top. Keep entries short — context, decision, why.

---

## Site logo: transparent PNG + dark variant

**Context:** `pokellection-logo-mark.png` had an opaque white matte; in dark mode the
header showed a white rectangle behind the wordmark.

**Decision:** Light asset uses a transparent background (white keyed to alpha).
Dark mode swaps to `pokellection-logo-mark-dark.png` (black text/lines → light
foreground) via `SiteLogo` (`dark:hidden` / `hidden dark:block`). Regenerate both
from the source art if the mark changes — CSS blend modes alone cannot keep red
"Poke" and readable "llection" on one raster.

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
