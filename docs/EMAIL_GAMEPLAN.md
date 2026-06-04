# Resend email — implementation gameplan

Transactional email for Pokellection using [Resend](https://resend.com).  
Env vars (already in `.env.local`; mirror on Vercel):

- `RESEND_API_KEY`
- `RESEND_DEFAULT_FROM` (e.g. `Pokellection <noreply@pokellection.com>`)
- `MANAGER_NOTIFICATION_EMAIL` (optional; fallback: `site_settings.contact_email`)

**Rules:** send only from server code (`"use server"`, route handlers). Never expose the API key to the client. Log send failures; do not fail checkout if email fails (order already committed).

---

## Phase 0 — Foundation

- [x] Add `resend` npm dependency
- [x] Create `src/lib/email/resend-client.ts` — lazy Resend client, `isEmailConfigured()`
- [x] Create `src/lib/email/send.ts` — `sendEmail({ to, subject, html, text?, replyTo? })` with try/catch + console error
- [x] Create `src/lib/email/templates/` — small HTML builders (plain, on-brand; no React Email required for v1)
- [x] Document env vars in `.env.example` (no real keys)
- [x] Add `getManagerNotificationEmail(settings)` in `src/lib/email/manager-email.ts` (DB contact → env → fallback)
- [ ] Verify domain in Resend dashboard (SPF/DKIM for `pokellection.com`) — **you**
- [ ] Set same env vars on Vercel production — **you**
- [x] `npx tsc --noEmit` + `npm run build` pass

---

## Phase 1 — Order placed (highest value)

**Hook:** `placeOrder` in `src/app/cart/actions.ts` after order + items insert succeeds (before cart clear / redirect).

- [x] Add `src/lib/email/order-placed.ts` with shared payload type (order, items, settings snippet)
- [x] Template: **buyer order confirmation**
  - [x] Order number, date, line items, subtotal / shipping / total
  - [x] Fulfillment label (pickup / delivery / Canada ship)
  - [x] Payment block: e-transfer amount + email (`getEtransferEmail`), or pay-on-pickup copy
  - [x] If pricing review requested: “We’ll email you when your total is ready” (no e-transfer yet)
  - [x] Link: `{SITE_URL}/account/orders/{orderNumber}`
- [x] Template: **manager new order alert**
  - [x] Buyer name, email, phone, fulfillment, total
  - [x] Flag if `pricing_review_requested_at` set + buyer message excerpt
  - [x] Link: `{SITE_URL}/admin/orders/{id}`
- [x] `sendOrderPlacedEmails(orderId)` — load order + items + settings via server supabase client
- [x] Call from `placeOrder` (await in try/catch so DB success isn’t rolled back)
- [ ] Manual test: checkout on local → buyer inbox + manager inbox — **you**
- [ ] Manual test: Canada ship + price review → manager sees message flag — **you**

---

## Phase 2 — Pricing review (Canada ship)

**Hooks:** checkout already sets review fields; admin `updateOrder` in `src/app/admin/orders/actions.ts`.

- [x] **Buyer:** no extra email on request (covered in Phase 1 confirmation)
- [x] Template: **manager pricing review requested** (skipped — Phase 1 manager alert covers it)
- [x] Template: **buyer pricing review resolved — ready to pay**
  - [x] New subtotal / total, e-transfer amount, e-transfer email
  - [x] Link to order page
- [x] `sendPricingReviewResolvedEmail(orderId)` when `resolve_pricing_review=1` in `updateOrder`
- [ ] Manual test: resolve review in admin → buyer receives “ready to pay” — **you**

---

## Phase 3 — Payment & fulfillment updates

**Hook:** `updateOrder` — detect meaningful changes vs previous row (payment_status, tracking_number, fulfillment_status).

- [x] Load previous order state before update (full row `beforeOrder`)
- [x] Template: **payment received** (when `payment_status` → `received` or `deposit_received`)
  - [x] Amount context (full vs deposit vs balance)
- [x] Template: **order shipped** (when `shipped` + tracking; also tracking added while shipped)
  - [x] Tracking number + link via `getTrackingUrl`
- [x] Template: **ready for pickup** (when `fulfillment_status` → `ready_for_pickup`)
- [x] `sendOrderStatusEmails(before, after)` — only send when field actually changed
- [x] Avoid duplicate emails on unrelated admin saves
- [ ] Manual test each transition on a test order — **you**

---

## Phase 4 — Pickup reservations

**Hook:** `reserveCardForPickupAction` in `src/app/reserve/[id]/actions.ts` after successful insert.

- [x] Template: **buyer reservation confirmation** (card title, expires end of day, pickup notes)
- [x] Template: **manager new reservation** (card, buyer contact, link to `/admin/reservations`)
- [x] `sendReservationEmails(reservationId)` after insert in `reserveCardForPickupAction`
- [ ] Manual test: reserve card while logged in as buyer — **you**

---

## Phase 5 — Polish & ops

- [ ] Add `email_logs` table (optional) — `id, template, to, order_id, status, error, created_at` for debugging
- [ ] ARCHITECTURE.md entry: Resend, fail-open on send, domain requirement
- [ ] AGENTS.md one-liner under email / server actions
- [ ] Rate-limit / idempotency: don’t resend order confirmation on double-submit (idempotency key = `order_id` + template name)
- [ ] Consider Supabase Auth emails — only if branded reset/signup needed (separate decision)

---

## Phase 6 — Later (backlog)

- [ ] Reminder: e-transfer still awaiting (24h / 48h cron or Vercel cron)
- [ ] Reminder: reservation expires today
- [ ] Post-delivery “thanks” email
- [ ] Collectr sync digest to manager
- [ ] React Email components if templates get complex

---

## Suggested file layout

```text
src/lib/email/
  resend-client.ts
  send.ts
  manager-email.ts
  order-placed.ts
  order-status.ts
  pricing-review.ts
  reservation.ts
  templates/
    layout.ts          # header/footer, SITE_URL
    order-confirmation.ts
    manager-order-alert.ts
    ...
```

---

## Testing checklist (before calling Phase done)

- [ ] All emails render with correct CAD formatting (`formatCad`)
- [ ] Links use `NEXT_PUBLIC_SITE_URL` (not localhost in prod)
- [ ] Missing `RESEND_API_KEY` → no throw; log once; app works
- [ ] Invalid buyer email → skip buyer send; still alert manager if possible
- [ ] Production send from verified domain (not “testing” sandbox only)
- [ ] No secrets in git

---

## Implementation order (for agent sessions)

1. Phase 0 → Phase 1 (ship this first)
2. Phase 2 → Phase 3
3. Phase 4
4. Phase 5 as you go
5. Phase 6 only when asked

When working through this doc, check boxes in place and note the commit hash per phase in git messages.
