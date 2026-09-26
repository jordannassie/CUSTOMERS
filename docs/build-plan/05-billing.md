# Phase 5: Billing

Goal: trial with card, subscriptions per business, top-ups and plan changes, all feeding the credit system. Built against a Stripe sandbox; goes live only with Jordan's Stripe account. Ends with **Milestone 2: a new customer can sign up, pay and see results** (with B-48 and B-49 from phase 6). [Back to index](./README.md)

---

### B-40 Stripe setup
- [ ] Done

Phase 5 · S · Depends on: B-11 · Blocked by Jordan: live account and prices (D-21, D-40) · MVP_SPEC 11.1, 11.4, D-39, D-56

**Build**
1. Stripe sandbox for development (not the shared test mode). Restricted API key with only the permissions we use. Current API version (`2026-08-26.dahlia` at time of writing) and current `stripe` Node SDK, using a `StripeClient` instance (no global key).
2. Products and prices in USD: Starter and Pro per business per month; top-up packs 500 and 2,000 credits (one-time). Automatic currency conversion off.
3. Store price IDs in the `plans` table and a `topup_packs` config (not in code).
4. `src/modules/billing/stripe.ts` (server-only): the single Stripe client.
5. Repeat step 2 in Jordan's live account when available.

**What the user sees**
- Nothing visible yet. Prices shown later come from the database, so changing a price needs no code change.

**Engineering checks**
- Script lists the sandbox products and matches them to `plans`.

---

### B-41 Checkout page and trial start
- [ ] Done

Phase 5 · L · Depends on: B-40, B-36 · Blocked by Jordan: live keys only · MVP_SPEC 3.1 step 8, 11.2, 4.4, D-15, D-16, D-38

**Build**
1. Our own checkout step inside onboarding using **Checkout Sessions with the Payment Element** (follow Stripe's current guide for this; confirm the exact session mode parameter in the Stripe docs at build time). Do not pass `payment_method_types`. Tag sessions with `integration_identifier`.
2. Subscription with one item per business at the chosen plan, `trial_period_days: 7`, customer and address collected; USD only.
3. Clear copy on the page: "7 days free, then $X per business per month. Cancel anytime before [date] and you won't be charged."
4. Never grant credits or mark paid on the success page; wait for the webhook (B-42) and show "Setting up your account…" until it arrives.
5. Test agencies can skip this step (admin flag).

**What the user sees**
- A clean, on-brand card form inside the setup flow, with the exact trial end date and price.
- After entering a test card, the trial starts and the first scan begins.
- A declined card shows a clear message and lets them try another card.

**Engineering checks**
- Playwright end-to-end with Stripe test cards: success, decline, 3D Secure.

---

### B-42 Webhook handlers
- [ ] Done

Phase 5 · L · Depends on: B-40, B-13 · Blocked by Jordan: no · MVP_SPEC 11.3, 11.5, D-39, D-57

**Build**
1. Rewrite `src/app/api/stripe/webhook/route.ts` as a thin route (raw body, signature check, Node runtime, return 200 quickly) calling `src/modules/billing/webhooks.ts`.
2. Handlers: `checkout.session.completed`, `invoice.paid` (grant plan credits per business line; trial grant of 100 on trial start; prorated grants for mid-cycle upgrades and new businesses), `invoice.payment_failed` (status `past_due`, pause scheduled scans, email), `customer.subscription.trial_will_end` (email), `customer.subscription.updated` and `deleted` (plan and status per business, stop scans at period end).
3. Every grant uses the invoice line ID as `source_id`; the existing `stripe_webhook_events` table blocks replays.
4. Remove all writes to the old `billing_accounts`, `business_billing_items` and `subscriptions` tables.

**What the user sees**
- After the trial ends, the card is charged and plan credits appear in the usage widget.
- If a payment fails, a banner and an email explain what to do, and automatic scans pause until it is fixed.

**Engineering checks**
- Fixture tests replaying each event twice (credits granted once).
- Stripe CLI (`stripe listen`, `stripe trigger`) run against a preview deployment; output pasted in the PR.

---

### B-43 Top-ups
- [ ] Done

Phase 5 · M · Depends on: B-42 · Blocked by Jordan: prices (D-22) · MVP_SPEC 4.2, 11.5, D-22

**Build**
1. Server Action `buyTopUp(pack)`: one-time Checkout Session with the Payment Element.
2. Webhook grants a never-expiring `topup` grant (settling any negative balance first).
3. `canSpendTopUps`: top-ups are usable only with an active plan or trial.

**What the user sees**
- "Buy credits" offers two packs; after paying, the balance goes up at once (or pays off a negative balance first).

**Engineering checks**
- Test: top-up grant never expires; blocked when the plan is cancelled.

---

### B-44 Plan changes
- [ ] Done

Phase 5 · L · Depends on: B-42 · Blocked by Jordan: no · MVP_SPEC 11.5, D-57

**Build**
1. Server Actions in `src/modules/billing/actions.ts`:
   - `upgradeBusiness`: change the item's price now with `proration_behavior: "always_invoice"`; prorated credits granted when that invoice is paid.
   - `addBusiness` (after `canAddBusiness`): add an item, prorated charge and credits.
   - `downgradeBusiness`, `removeBusiness`, `cancelSubscription`: take effect at period end (subscription schedule or `cancel_at_period_end`).
2. Each action shows the price effect before confirming (Stripe invoice preview).

**What the user sees**
- Upgrading shows "You'll pay $X today and get Y extra credits now"; the credits appear after payment.
- Downgrading or removing a business says "Takes effect on [date]. No refund."
- Cancelling says when access ends and that plan credits work until then.

**Engineering checks**
- Tests for each change with Stripe test clocks (upgrade mid-month, downgrade at renewal, cancel).

---

### B-45 Trial rules
- [ ] Done

Phase 5 · M · Depends on: B-42, B-16 · Blocked by Jordan: trial credits confirmed (D-17) · MVP_SPEC 4.4, D-16, D-17

**Build**
1. Trial: 100 credits (one-time grant, expires at trial end), 2 businesses, charged on day 7.
2. Cancel during trial: no charge; account becomes read-only at trial end.
3. Trial banner in the app: days left, credits left, "Your card will be charged on [date]".

**What the user sees**
- During the trial, a small banner shows days and credits left.
- Cancelling before day 7 means no charge; results stay visible read-only.

**Engineering checks**
- Stripe test clock: trial converts on day 7; cancelled trial is not charged.

---

### B-46 Billing page
- [ ] Done

Phase 5 · M · Depends on: B-43, B-44, B-09 · Blocked by Jordan: no · MVP_SPEC 8.1 (Settings), 11

**Build**
1. `src/app/(app)/settings/billing/page.tsx`: plan per business with change or remove, add business, buy credits, next charge date and amount, status (trial, active, past due).
2. Invoices and card updates through the Stripe customer portal (link out), configured for our branding.
3. Replace the old `BillingPageClient.tsx` (736 lines) and remove its "Beta" fallback label.

**What the user sees**
- One clear page: what they pay, for which businesses, the next charge, and buttons to change it.
- "Manage card and invoices" opens Stripe's secure portal.

**Engineering checks**
- Playwright checks the page in trial, active and past-due states.

---

## Phase 5 demo checklist (Milestone 2, with B-48 and B-49)

1. Open the pricing page, choose Starter, sign up.
2. Go through setup; at the card step enter Stripe's test card `4242 4242 4242 4242`.
3. The page shows the trial end date and price; the first scan runs; the dashboard shows a score.
4. The trial banner shows 7 days and the credits left.
5. Try to add a third business: the trial limit message appears.
6. Buy a 500-credit top-up with the test card: the balance goes up.
7. Upgrade one business to Pro: the screen says what you pay today and the extra credits.
8. The developer fast-forwards the trial (Stripe test clock): the charge appears and plan credits arrive.
9. Use test card `4000 0000 0000 0341` for a failed renewal: a banner and email explain the problem and automatic scans pause.
