// Creates the Stripe products and prices from the plans and topup_packs rows and stores their IDs (B-40 steps 2 and 5).
// Safe to rerun. Dry run by default; add APPLY=1 to write:
//   STRIPE_CATALOG=1 STRIPE_CATALOG_KEY=rk_test_... npm run stripe:catalog-sync
//   STRIPE_CATALOG=1 STRIPE_CATALOG_KEY=rk_test_... APPLY=1 npm run stripe:catalog-sync
// Live (Jordan's account, against the live database): use rk_live_... and also STRIPE_LIVE=1.
import { expect, it } from "vitest";
import { syncCatalog } from "@/modules/billing/catalog";
import { catalogRunEnabled, catalogSetup } from "./stripe-catalog.shared";

it.runIf(catalogRunEnabled)("sync Stripe catalog", { timeout: 120_000 }, async () => {
  const { stripe, store, label } = await catalogSetup();
  const apply = process.env.APPLY === "1";

  console.log(`\n${apply ? "APPLYING" : "DRY RUN"}: ${label}\n`);
  const actions = await syncCatalog(stripe, store, { apply });
  console.table(actions);
  if (!apply) console.log("Nothing was changed. Rerun with APPLY=1 to write.");

  expect(actions.length).toBeGreaterThan(0);
});

it.skipIf(catalogRunEnabled)("skipped: set STRIPE_CATALOG=1 and STRIPE_CATALOG_KEY to run", () => {});
