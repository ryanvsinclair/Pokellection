# Pokellection — Agent Guide

Read this before making changes. It exists to keep an AI-built codebase clean:
**no duplicate utilities, no recreated functions, no invalid table/column references.**

## What this is

A Next.js storefront for selling Pokémon cards in Ottawa. Buyers reserve for
local pickup or pay by e-transfer with shipping. A manager lists cards (manual,
CSV, or Collectr sync). Backend is Supabase (Postgres + Auth + Storage + RLS).

**Stack:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind v4 ·
Supabase (`@supabase/ssr` + `@supabase/supabase-js`).

## Where things live

| Path | Purpose |
|------|---------|
| `src/app/` | Routes (App Router). Public, `account/` (buyer), `admin/` (manager), `api/`. |
| `src/lib/queries/` | **All database reads.** Typed functions — use/extend these, don't inline queries. |
| `src/lib/supabase/` | Client factories: `client.ts` (browser), `server.ts` (server), `middleware.ts` (session/route guards). |
| `src/lib/` | Shared logic: `collectr.ts`/`collectr-client.ts` (sync), `admin-auth.ts`, `tracking.ts`, `utils.ts`. |
| `src/components/` | Shared UI; `admin/` for manager-only UI. |
| `src/types/supabase.ts` | **Generated** DB types — source of truth. Never hand-edit. |
| `src/types/database.ts` | Named aliases (`Card`, `Order`, enums) derived from `supabase.ts`. |
| `supabase/migrations/` | SQL schema + RLS. The schema source of truth. |
| `ARCHITECTURE.md` | The **"why"** — non-obvious decisions & gotchas. Read before changing those systems; append when you learn something new. |
| `docs/COLLECTR_INVENTORY_SPEC.md` | **Collectr + inventory product spec** — main/French/JP-KR sync, temp acquisition import, ROI. Read before changing import/sync. |

## Before you add code — checklist

1. **Search first.** Before writing a function/component/util, semantic-search
   `src/lib`, `src/lib/queries`, and `src/components`. Extend what exists; don't duplicate.
2. **Database access** goes through `src/lib/queries/`. If a read/write isn't there, add it there — don't scatter `.from(...)` calls across pages.
3. **Never hand-write column or table names from memory.** Use the typed client
   and the types in `src/types/supabase.ts`. A wrong column should be a compile error.
4. **Schema change?** Add a migration in `supabase/migrations/`, then regenerate
   `src/types/supabase.ts` (Supabase type generation). Never edit generated types by hand.
5. **Learned something non-obvious?** Record it in `ARCHITECTURE.md` before
   finishing, so it survives context compaction (see `.cursor/rules/decisions.mdc`).

## Definition of done

- `npx tsc --noEmit` passes (no `never`/missing-column errors).
- `npm run build` passes.
- No new duplicate of an existing util/query/component.
- Types regenerated if the schema changed.

## Roles & RLS (know these before touching data)

- **public** — can read `cards` where `status = 'available'` and `site_settings`.
- **buyer** — owns their `cart_items` and `orders`; cannot mutate `cards`.
- **manager** — full access. Server code asserts this via `assertManager()` (`src/lib/admin-auth.ts`).

Detailed conventions live in `.cursor/rules/` and are auto-loaded by the agent.
