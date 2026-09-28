# Billing

Stripe setup (B-40, MVP_SPEC 11, D-39, D-56).

| File | Holds |
|---|---|
| `stripe.ts` | The app's single Stripe client, `getStripe()`, API version pinned to `2026-08-26.dahlia`. Key only from `STRIPE_SECRET_KEY` via `src/lib/env.ts`. |
| `dal.ts` | Plan prices (`plans`) and top-up packs (`topup_packs`) with their Stripe price IDs. Prices are read from the database, never from code. |
| `catalog.ts` | Mirrors those rows into Stripe (one product and one current USD price each) and checks the match. |
| `topup/` | Buy credits (B-43): `params.ts` (pure session parameters and purchase rules), `client.ts` (injectable Checkout client, real or fixture), `service.ts`, `dal.ts`, `actions.ts` (`buyTopUp`, `getTopUpStatus`, `completeFixtureTopUp`). |
| `checkout.ts` | Pure: the signup trial's Checkout Session parameters and trial end date (B-41). |
| `checkout-client.ts` | The injectable `CheckoutClient` (real Stripe or the `STRIPE_CHECKOUT_FIXTURES` fake). |
| `trial.ts` | `getTrialOffer` (price and trial end for the card step) and `createTrialCheckout`. |
| `webhooks.ts` | `processStripeWebhook(rawBody, signature)`: signature check, replay guard (`stripe_webhook_events`), dispatch. Called by `src/app/api/stripe/webhook/route.ts`. |
| `webhooks/handlers.ts` | One handler per event. Stripe reads, the store and email sending come in as deps, so tests need no Stripe calls. |
| `webhooks/credits.ts` | Pure: which grants a paid invoice earns (trial, period, proration). |
| `webhooks/dal.ts` | Agency, `business_subscriptions`, plan and pack reads and writes. Credits only through `grant_credits`. |
| `webhooks/emails.tsx` | Payment failed and trial ending emails (plain notices until B-62). |
| `plan-change/` | Upgrade, add, downgrade and remove a business, cancel and keep the plan (B-44). See below. |

## Products and prices

- Plans: `cd_plan_starter`, `cd_plan_pro`, monthly, per business (licensed quantity), lookup key `cd_plan_<id>_monthly_usd`.
- Top-ups: `cd_topup_500`, `cd_topup_2000`, one-time, lookup key `cd_topup_<n>_usd`.
- USD only, no `currency_options`. To change a price, change the row, then rerun the sync: it makes a new price, moves the lookup key and stores the new ID. Old prices stay active for existing subscriptions.

## First-time setup (a person does this, not a session)

1. Create a fresh Stripe **sandbox** (not the shared test mode). The old WorkNex keys are treated as exposed (B-01).
2. In that sandbox, turn Adaptive Pricing off: Settings, Adaptive Pricing (dashboard.stripe.com/settings/adaptive-pricing). B-41 also sends `adaptive_pricing: { enabled: false }` on every Checkout Session.
3. Create two restricted keys:
   - **Catalog key** (used only by the scripts below, keep it out of `.env*` files): Products Write, Prices Write.
   - **App key** (`STRIPE_SECRET_KEY`): Checkout Sessions Write, Customers Write, Subscriptions Write, Subscription Schedules Write, Invoices Read, Prices Read, Products Read, Customer Portal Write. Confirm against the key's request logs while building B-41 to B-46 and remove anything unused.
4. Confirm the prices in `plans` and `topup_packs` with Jordan (D-21, D-22) and update the rows if needed.
5. Apply `034_topup_packs.sql` to the project, then run:

```
STRIPE_CATALOG=1 STRIPE_CATALOG_KEY=rk_test_... npm run stripe:catalog-sync            # dry run
STRIPE_CATALOG=1 STRIPE_CATALOG_KEY=rk_test_... APPLY=1 npm run stripe:catalog-sync    # write
STRIPE_CATALOG=1 STRIPE_CATALOG_KEY=rk_test_... npm run stripe:catalog-check           # must pass
```

The scripts read the database from `.env.local`, refuse a full secret key (`sk_`), and refuse a sandbox key with the live database or a live key with any other database.

**Live (B-40 step 5, Jordan's account, D-40):** repeat steps 2 to 5 in live mode with `rk_live_...` keys against the live database, adding `STRIPE_LIVE=1`.

## Top-ups (B-43, MVP_SPEC 4.2, D-22)

- Page: `/settings/credits` (the "Buy credits" buttons in the usage widget, the out of credits banner and the usage page). Packs and prices come from `topup_packs`.
- `buyTopUp` makes a `mode: "payment"` Checkout Session with `ui_mode: "elements"` and the Payment Element: `metadata.kind = "topup"`, `metadata.topup_pack_id`, `agency_id` (also on the payment intent), the agency's Stripe customer when it has one, `adaptive_pricing` off, no `payment_method_types`.
- Refused while `canSpendTopUps` says no (cancelled, past due or paused): top-ups are only spendable with an active plan or trial, so they are not sold without one.
- The page never grants credits. After paying it polls `getTopUpStatus` until the webhook's grant for that session ID exists, then shows the new balance. The grant settles any negative balance first (`grant_credits`, D-54).
- `STRIPE_CHECKOUT_FIXTURES=true` (refused in production): a fake session and card form (`4242...` pays, `4000 0000 0000 0002` declines). A fake payment runs the real `checkout.session.completed` handler, so credits still come only from `grant_credits`. Playwright runs with it; no Stripe call is made.
- Needs `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` next to `STRIPE_SECRET_KEY`; without both the page says buying credits is unavailable.

Test card run in the sandbox (after B-01 and the first-time setup above): `stripe listen --forward-to localhost:<port>/api/stripe/webhook`, open `/settings/credits` as an active or trialing test agency, buy 500 credits with `4242 4242 4242 4242`. The page shows "500 credits added" and the new balance; the grant has `source_id` = the session ID and no expiry.

## Card step (B-41, MVP_SPEC 3.1 step 8, 11.2)

- Onboarding step 8 (`/onboarding/card`) uses a Checkout Session with `ui_mode: "elements"` and the Payment Element (`CheckoutElementsProvider` from `@stripe/react-stripe-js/checkout`). Needs `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` next to `STRIPE_SECRET_KEY`; without both the step says card sign up is unavailable.
- One `subscription` session per visit: one item for the business at the plan in `app_metadata.selected_plan` (else Starter), `trial_period_days: 7`, card and billing address required, `adaptive_pricing` off, no `payment_method_types`, tagged `integration_identifier`.
- The form's success only shows "Setting up your account". The step finishes (business `active`, step 9) once the webhook has linked `stripe_subscription_id` to the agency. Nothing is granted or marked paid by the page.
- Skipped for `is_test` agencies, agencies already linked to a subscription, and a second business (that adds an item, B-44).
- `STRIPE_CHECKOUT_FIXTURES=true` (refused in production): a fake session and a fake card form that answers Stripe's test numbers (`4242...` accepted, `4000 0000 0000 0002` declined, `4000 0025 0000 3155` bank check). Playwright runs with it; no Stripe call is made.

Test card run in the sandbox (after B-01 and the first-time setup above):
1. Set `STRIPE_SECRET_KEY` (app key, also Checkout Sessions Write), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (sandbox `pk_test_`), `STRIPE_WEBHOOK_SECRET`, and leave `STRIPE_CHECKOUT_FIXTURES` unset.
2. `stripe listen --forward-to localhost:<port>/api/stripe/webhook`.
3. Sign up with a new (non test) account and go through onboarding to the card step. Check the price and the date.
4. `4000 0000 0000 0002`: a clear decline message, the form stays, nothing in Stripe's subscriptions.
5. `4000 0025 0000 3155`: fail the bank check once (message, try again), then complete it: "Setting up your account", then the dashboard.
6. New account, `4242 4242 4242 4242`: the dashboard opens after the webhook; in Stripe the subscription is `trialing` with `agency_id` metadata and the item has `business_id`; the agency row has the customer, subscription and `trial_ends_at`, and 100 trial credits arrive with `invoice.paid`.

## Webhook (B-42, MVP_SPEC 11.3)

Endpoint: `POST /api/stripe/webhook`, secret `STRIPE_WEBHOOK_SECRET`. Subscribe the endpoint to these events:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`,
`customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`.

| Event | What happens |
|---|---|
| `checkout.session.completed` | Links the Stripe customer and subscription to the agency. A paid top-up grants its pack's credits (never expire, `source_id` = session ID). |
| `checkout.session.async_payment_succeeded` | Same as above, for payment methods that finish later. |
| `invoice.paid` | Grants credits per invoice line (`source_id` = line ID): 100 trial credits on the $0 first invoice (expire at trial end), plan credits per business on each paid period, prorated extra credits for upgrades and added businesses. |
| `invoice.payment_failed` | Agency and its businesses `past_due` (scheduled scans stop, the banner shows), one email per invoice. |
| `customer.subscription.created` / `updated` | Reads the current subscription from Stripe (events can arrive out of order), then saves status, trial end, period end and one `business_subscriptions` row per item. A business whose item is gone is canceled and taken off the scan schedule. |
| `customer.subscription.deleted` | Agency and all its businesses `canceled`. |
| `customer.subscription.trial_will_end` | Trial ending email. |

Rules:
- A handler that throws returns 500 and is recorded with its error; Stripe's retry runs it again. A processed event returns 200 with `duplicate: true`.
- Credits change only through `grant_credits`, keyed by the Stripe line or session ID, so a replay (or two copies at once) grants once.
- `suspended` and `deleted` agencies (set by an admin) are never changed by Stripe events.
- An event for a customer no agency is linked to returns 500 until `checkout.session.completed` links it.

What checkout (B-41, B-43, B-44) must send:
- Checkout Session `metadata.agency_id` (or `client_reference_id`), and `subscription_data.metadata.agency_id`.
- Each subscription item `metadata.business_id`. Items without it only update the row already linked to that item.
- Top-ups: `mode: "payment"`, `metadata.kind = "topup"`, `metadata.topup_pack_id` (a `topup_packs.id`).
- Plans are matched by product (`cd_plan_<id>` or `plans.stripe_product_id`), so older prices of the same plan still grant.
- The app key also needs Subscriptions Read and Invoices Read (webhook reads the current subscription and, for invoices with more than one page of lines, the lines).

Stripe CLI check (after the sandbox exists, B-01 and B-40 first-time setup):

```
stripe listen --forward-to https://<preview>.netlify.app/api/stripe/webhook   # prints the whsec_ secret for the preview
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.trial_will_end
stripe trigger customer.subscription.deleted
stripe events resend <evt_id>   # a replay must answer {"received":true,"duplicate":true}
```

`stripe trigger` makes its own customer with no `agency_id`, so those events answer 500 (no agency) by design. To see them handled, add the metadata of an `is_test` agency, for example `stripe trigger invoice.paid --add subscription:metadata.agency_id=<agency uuid>`.

## Plan changes (B-44, MVP_SPEC 11.5, D-57)

Server Actions in `plan-change/actions.ts`, exported from `index.ts`: `upgradeBusiness`, `addBusiness`, `downgradeBusiness`, `removeBusiness`, `cancelSubscription`, `keepSubscription`. Each checks `requireAgency()` and its zod input. Called without `previewedAt`, an action returns the price effect (`headline`, `details`, `amountCents`, `extraCredits`, `previewedAt`) from a Stripe invoice preview. Called again with that `previewedAt` (at most 15 minutes old), it applies the change and returns `message`.

| Change | When | How |
|---|---|---|
| Upgrade, add a business | Now | `proration_behavior: "always_invoice"`, `proration_date` = the preview's, `payment_behavior: "error_if_incomplete"` (a declined card changes nothing). With a schedule attached, the schedule's current and next phase are edited instead. `addBusiness` checks `canAddBusiness` first. |
| Downgrade, remove a business | Period end | A subscription schedule: the current phase as it is, then a one-month phase with the new items, then release. A second change edits that next phase. |
| Cancel | Period end | Releases any schedule (pending changes are dropped), then `cancel_at_period_end: true`. `keepSubscription` undoes it. |

- Nothing here writes to the database or grants credits. The webhook saves the new plans and grants the prorated credits when the invoice is paid, keyed by the invoice line ID.
- Every item and phase item carries `metadata.business_id`, so the webhook can match items after a phase starts.
- Stripe calls carry an idempotency key per change and preview, so a double click changes Stripe once.
- The key also needs Subscription Schedules Write and Invoices Read (invoice previews).
- Tests use an in-memory Stripe (`plan-change/fake-stripe.test-helpers.ts`) with a clock for the upgrade mid-month, downgrade at renewal and cancel scenarios. The same three still need a run with real Stripe test clocks once the sandbox exists (B-01, B-40).
