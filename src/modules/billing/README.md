# Billing

Stripe setup (B-40, MVP_SPEC 11, D-39, D-56).

| File | Holds |
|---|---|
| `stripe.ts` | The app's single Stripe client, `getStripe()`, API version pinned to `2026-08-26.dahlia`. Key only from `STRIPE_SECRET_KEY` via `src/lib/env.ts`. |
| `dal.ts` | Plan prices (`plans`) and top-up packs (`topup_packs`) with their Stripe price IDs. Prices are read from the database, never from code. |
| `catalog.ts` | Mirrors those rows into Stripe (one product and one current USD price each) and checks the match. |

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
