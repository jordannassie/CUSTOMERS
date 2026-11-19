// Lists the Stripe catalog products and matches them to the plans and topup_packs rows (B-40 engineering check).
// Read-only. Fails when any row has no price, a wrong amount or currency, or a price from another account:
//   STRIPE_CATALOG=1 STRIPE_CATALOG_KEY=rk_test_... npm run stripe:catalog-check
import { expect, it } from "vitest";
import { checkCatalog } from "@/modules/billing/catalog";
import { catalogRunEnabled, catalogSetup } from "./stripe-catalog.shared";

it.runIf(catalogRunEnabled)("check Stripe catalog", { timeout: 120_000 }, async () => {
  const { stripe, store, label } = await catalogSetup();

  console.log(`\nCHECK: ${label}\n`);
  const result = await checkCatalog(stripe, store);
  console.table(result.rows.map((r) => ({ ...r, problems: r.problems.join("; ") || "ok" })));
  if (result.unknownProducts.length > 0) {
    console.log(`Active cd_ products with no database row: ${result.unknownProducts.join(", ")}`);
  }

  expect(result.ok).toBe(true);
});

it.skipIf(catalogRunEnabled)("skipped: set STRIPE_CATALOG=1 and STRIPE_CATALOG_KEY to run", () => {});
