# Collectr & inventory — product specification

**Owner:** Ryan (Pokellection manager)  
**Status:** Implemented (migration `018`, admin import + acquisitions)  
**Last updated:** 2026-06-03  

This document is the source of truth for how Collectr integrates with Pokellection.
Read this before changing `/admin/import`, Collectr sync APIs, or inventory economics.

---

## 1. Business context

Ryan buys Pokémon cards in bulk (collections, binders) from people, resells singles on
Pokellection (Ottawa pickup, delivery, Canada ship). Collectr is used to **organize physical
inventory** and **market-reference pricing**, not as the public storefront.

Two different lifecycles exist:

| Lifecycle | Meaning |
|-----------|---------|
| **Shop inventory** | Cards buyers can purchase on the website (status `available`, etc.). |
| **Collectr holdings** | What Ryan currently owns / is staging in the Collectr app. |

The website must support **multiple Collectr showcases with different roles**, plus a
**one-time acquisition import** that does not interfere with ongoing showcase sync.

---

## 2. Collectr link fields (admin configuration)

Replace the single “list of equivalent portfolios” model with **named roles**.
Each role has one Collectr showcase URL (profile link). Non-main Collectr
collections use the same profile URL with `?collection=<uuid>` from Share.

### 2.1 Main — source of truth for English / primary available inventory

- **Purpose:** Defines what is **currently available** for the core shop sync.
- **Sync behavior:** Participates in the **existing showcase sync** (preview → apply).
  - Cards **in** main → listed/updated on site (`available`, Collectr market price, metadata).
  - Cards **in** main that were `available` on site but **leave** main → **delist** (`draft`), per current Collectr rules (not `sold`).
  - Cards **missing from** main but were only tied to main → delist when absent from sync set.
- **This is the primary “what I have for sale” mirror** for the main English inventory track.

### 2.2 New purchases — temporary holding (staging only)

- **Purpose:** Ryan drops **newly bought** lots here before processing. **Not** a long-term
  source of truth.
- **Workflow in Collectr (manual, outside app):**
  1. Buy binder/collection → add cards to **new purchases** showcase.
  2. Import that showcase into Pokellection (acquisition import — see §3).
  3. Ryan **merges** those cards into **main** (and/or language showcases) inside Collectr.
  4. Temp showcase may be empty or unused afterward — **that is expected**.
- **Must NOT** be included in the same delist pool as main/language showcases.
- **No ongoing sync** that delists site cards when temp goes empty.

### 2.3 French — source of truth for French cards

- **Purpose:** French-language (or French-inventory) track: what Ryan holds for French stock.
- **Sync behavior:** Same **showcase sync** mechanics as main, but **scoped** to cards
  tagged/linked to this showcase profile (delist only when missing from **French** sync,
  not when missing from main).
- Shop may filter or segment French listings (implementation detail later).

### 2.4 Japanese / Korean — source of truth for JP/KR cards

- **Purpose:** Japanese and Korean inventory track (one showcase URL for this bucket unless
  split later).
- **Sync behavior:** Same as French — scoped sync and delist per this showcase identity.

### 2.5 Relationship to today’s “multiple Collectr links”

- **Keep** the current multi-portfolio scrape/merge/preview/apply pattern for **sync roles**
  (main + French + JP/KR).
- **Add** separate admin fields so Ryan does not confuse **temp holding** with **sync sources**.
- Optional: retain ability to add extra sync portfolios later, but the four roles above are
  the required first-class fields.

---

## 3. Acquisition import (new purchases showcase)

**Separate admin action** from “Sync showcases.”

### 3.1 Trigger

- Manager opens **Import acquisition** (or section on `/admin/import`).
- Uses URL from **new purchases** field (or pastes one-time URL).
- System scrapes Collectr → **preview** card list (same scraper as today).

### 3.2 Purchase price prompt

After preview, before apply:

- Prompt: **“How much did you pay for this lot?”** (CAD, required).
- Stored as an **acquisition** record (lot-level cost basis), e.g.:
  - `inventory_acquisitions`: `id`, `purchased_at`, `purchase_price_cad`, `note`,
    `collectr_showcase_url` (snapshot), `card_count`, optional `label`.

### 3.3 Apply — add to shop inventory

For each scraped card:

| Case | Behavior |
|------|----------|
| **New** (no matching Collectr product identity in DB) | **Insert** new `cards` row: `status: available`, `price_cad` from Collectr market (USD→CAD), photos from Collectr, tags include `collectr`, `collectr:<productId>`, link to acquisition id. |
| **Existing** (same Collectr identity already in DB) | **Increment** `cards.quantity` by scraped quantity (do **not** replace total qty with showcase qty). Update metadata/price from Collectr as needed. Tag/link card to this acquisition for ROI. |

**Listing state on import:** `available` with Collectr market prices (not draft).

**Duplicates:** Same card in current inventory = **higher quantity**, not a second listing row
(same Collectr product identity; condition/grade differences may need separate identities
per existing Collectr rules).

### 3.4 After import (Collectr app — manual)

- Ryan merges cards from **new purchases** into **main** (and French/JP/KR as appropriate).
- Temp showcase may be cleared — **no** website action required.
- When **main** (or language) sync runs later, cards already exist in DB → **update** via
  existing identity match, not duplicate inserts.

### 3.5 ROI tracking (goal)

Per acquisition lot:

- **Spent:** `purchase_price_cad` (entered at import).
- **Recovered:** Sum of revenue attributed to cards from that lot:
  - Site `order_items` / sales where card linked to acquisition.
  - `private_sales` where card linked to acquisition.
- **Admin view:** Simple P&L per lot (spent vs recovered vs outstanding inventory value).

Implementation: junction `acquisition_cards` (`acquisition_id`, `card_id`, `quantity_added`)
or tag `acquisition:<uuid>` on cards at import time.

---

## 4. Showcase sync (existing behavior — preserve)

**Applies to:** Main, French, Japanese/Korean showcases (not new purchases temp).

### 4.1 Current behavior to keep

- Multiple showcase URLs scraped and merged.
- Preview: add / relist / delist counts.
- Apply:
  - New in showcase → insert `available` (or relist draft/sold per Collectr source-of-truth rules in `ARCHITECTURE.md`).
  - In showcase → update metadata, price, quantity from Collectr (note: acquisition import
    uses **increment**; sync may still set qty from showcase for sync-tied cards — clarify
    in implementation: sync sets absolute qty from Collectr for cards under that showcase tag).
  - Left showcase (scoped to synced profile ids) → `draft` delist.
- `collectr-showcase:<profileId>` tags scope which delist applies.

### 4.2 Explicit non-goals for temp showcase

- Temp URL is **never** in `showcaseProfileIds` for delist.
- Empty temp showcase after merge **must not** delist or change site inventory.

---

## 5. Shop “collections” (bundles) — unrelated term

**Pokellection Collections** (`collections` + `collection_cards`) = **customer-facing bundles**
at a set price. Do not confuse with:

- Collectr “collection” / showcase, or
- Ryan’s “bought a collection off someone.”

Acquisition import feeds **individual `cards`**, not published shop bundles unless Ryan
manually builds a bundle later.

---

## 6. Admin UI sketch

### `/admin/import` (or settings + import)

| Section | Action |
|---------|--------|
| **Collectr links** | Four URL fields: Main, New purchases (temp), French, JP/KR. Save to `site_settings` or structured JSON. |
| **Sync showcases** | Preview + Apply using **main + French + JP/KR** only. |
| **Import acquisition** | Preview + Apply using **new purchases** URL only + purchase price form. |

### Suggested `site_settings` shape

```json
{
  "collectr_main_url": "https://...",
  "collectr_new_purchases_url": "https://...",
  "collectr_french_url": "https://...",
  "collectr_japanese_korean_url": "https://...",
  "collectr_portfolios": []
}
```

Migration path: map existing `collectr_portfolios[]` entries into **main** (or keep array
as “extra sync portfolios” in addition to the four fixed slots — product choice at build time).

---

## 7. Data model summary (to implement)

| Entity | Purpose |
|--------|---------|
| `site_settings` fields | Four Collectr URLs by role. |
| `inventory_acquisitions` | Lot purchase price, date, note, source URL. |
| `acquisition_cards` (or tags) | Which cards/qty came from which lot. |
| `cards` | Unchanged; `quantity`, `collectr:` tags, `collectr-showcase:` per sync scope. |

---

## 8. Open decisions (minor — can default)

| Topic | Default unless Ryan says otherwise |
|-------|----------------------------------|
| Same card, different condition | Separate Collectr identities → separate rows or qty bump only when identity matches. |
| French/JP/KR on shop | Filter by showcase tag or separate shop views — TBD. |
| Extra portfolios beyond four | Defer; four fixed fields first. |
| Sync quantity vs acquisition increment | Acquisition: **add** qty. Sync: **set** qty from Collectr for cards in that showcase (current behavior). |

---

## 9. Implementation checklist (for agents)

- [x] Schema: acquisition tables + settings fields for four URLs (`018_collectr_roles_and_acquisitions.sql`).
- [x] Refactor `CollectrSyncPanel` → sync only main + French + JP/KR (`CollectrLinksForm` saves URLs).
- [x] New `AcquisitionImportPanel` → new purchases URL + purchase price + apply with qty increment.
- [x] API: `POST /api/admin/collectr/acquisition/preview` and `.../apply`.
- [x] Admin P&L page: `/admin/acquisitions`.
- [x] Document in `ARCHITECTURE.md` (short pointer + gotchas).
- [x] Do not run delist for new-purchases profile id (`syncPortfolioConfigs` excludes temp URL).

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| **Showcase / portfolio** | Collectr profile URL listing owned cards. |
| **Collectr identity** | `collectr:<productId>` (and grade variant) in `cards.tags`. |
| **Showcase tag** | `collectr-showcase:<profileId>` — which sync source owns delist scope. |
| **Acquisition** | One bulk purchase lot imported from temp showcase with recorded purchase price. |
| **Delist** | Set card `status` to `draft` (hidden from shop), not `sold`. |
