import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";
import { createCatalogStore, listPlanPrices, listTopupPacks } from "./dal";

// B-40: prices come from the plans and topup_packs rows, against the local database `npm test` rebuilds.
const service = createServiceClient();

afterAll(async () => {
  await service.from("plans").update({ stripe_product_id: null, stripe_price_id: null }).in("id", ["starter", "pro"]);
  await service.from("topup_packs").update({ stripe_product_id: null, stripe_price_id: null }).neq("id", "");
});

describe("billing dal", () => {
  it("lists the self-serve plans and top-up packs from the database", async () => {
    const plans = await listPlanPrices();
    expect(plans.map((p) => [p.id, p.priceCents, p.monthlyCredits])).toEqual([
      ["starter", 14900, 1200],
      ["pro", 24900, 2500],
    ]);
    const packs = await listTopupPacks();
    expect(packs.map((p) => [p.id, p.credits, p.priceCents])).toEqual([
      ["topup_500", 500, 5000],
      ["topup_2000", 2000, 18000],
    ]);
  });

  it("catalog store loads both tables and saves Stripe IDs back", async () => {
    const store = createCatalogStore();
    expect((await store.load()).map((i) => `${i.kind}:${i.id}`)).toEqual([
      "plan:starter",
      "plan:pro",
      "topup:topup_500",
      "topup:topup_2000",
    ]);

    await store.saveStripeIds("plan", "pro", { productId: "cd_plan_pro", priceId: "price_test_pro" });
    await store.saveStripeIds("topup", "topup_500", { productId: "cd_topup_500", priceId: "price_test_500" });

    expect((await listPlanPrices()).find((p) => p.id === "pro")?.stripePriceId).toBe("price_test_pro");
    const loaded = await store.load();
    expect(loaded.find((i) => i.id === "topup_500")).toMatchObject({
      stripeProductId: "cd_topup_500",
      stripePriceId: "price_test_500",
    });
  });

  it("anyone can read top-up prices but not change them", async () => {
    const anon = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data, error } = await anon.from("topup_packs").select("id, price_cents");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);

    await anon.from("topup_packs").update({ price_cents: 1 }).eq("id", "topup_500");
    const { error: insertError } = await anon
      .from("topup_packs")
      .insert({ id: "free", name: "Free", credits: 999, price_cents: 1 });
    expect(insertError).not.toBeNull();
    expect((await listTopupPacks()).find((p) => p.id === "topup_500")?.priceCents).toBe(5000);
  });
});
