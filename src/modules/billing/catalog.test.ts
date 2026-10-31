import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  assertCatalogTarget,
  checkCatalog,
  lookupKeyFor,
  productIdFor,
  syncCatalog,
  type CatalogItem,
  type CatalogKind,
  type CatalogStore,
  type CatalogStripe,
} from "./catalog";

// B-40: the catalog scripts run only against this in-memory Stripe; nothing here reaches the network.

function missing(): Error {
  return Object.assign(new Error("No such resource"), { code: "resource_missing" });
}

async function* iterate<T>(items: T[]): AsyncIterable<T> {
  yield* items;
}

function fakeStripe() {
  const products = new Map<string, Stripe.Product>();
  const prices = new Map<string, Stripe.Price>();
  const calls: string[] = [];
  let seq = 0;

  const stripe: CatalogStripe = {
    products: {
      async retrieve(id) {
        const p = products.get(id);
        if (!p) throw missing();
        return p;
      },
      async create(params) {
        calls.push(`products.create ${params.id}`);
        const p = { id: params.id!, name: params.name, active: true, default_price: null } as Stripe.Product;
        products.set(p.id, p);
        return p;
      },
      async update(id, params) {
        calls.push(`products.update ${id}`);
        const p = { ...products.get(id)!, ...params } as Stripe.Product;
        products.set(id, p);
        return p;
      },
      list: (params) => iterate([...products.values()].filter((p) => params.active === undefined || p.active === params.active)),
    },
    prices: {
      async retrieve(id) {
        const p = prices.get(id);
        if (!p) throw missing();
        return { ...p, product: products.get(p.product as string) ?? p.product } as Stripe.Price;
      },
      async create(params) {
        calls.push(`prices.create ${params.lookup_key} ${params.unit_amount}`);
        if (params.transfer_lookup_key) {
          for (const p of prices.values()) if (p.lookup_key === params.lookup_key) p.lookup_key = null;
        }
        const price = {
          id: `price_${++seq}`,
          active: true,
          currency: params.currency,
          unit_amount: params.unit_amount ?? null,
          product: params.product as string,
          lookup_key: params.lookup_key ?? null,
          type: params.recurring ? "recurring" : "one_time",
          recurring: params.recurring
            ? { interval: params.recurring.interval, interval_count: 1, usage_type: params.recurring.usage_type ?? "licensed" }
            : null,
        } as Stripe.Price;
        prices.set(price.id, price);
        return price;
      },
      list: (params) =>
        iterate([...prices.values()].filter((p) => p.active && params.lookup_keys?.includes(p.lookup_key ?? ""))),
    },
  };
  return { stripe, products, prices, calls };
}

function memoryStore(items: CatalogItem[]): CatalogStore & { items: CatalogItem[] } {
  return {
    items,
    async load() {
      return items.map((i) => ({ ...i }));
    },
    async saveStripeIds(kind: CatalogKind, id: string, ids: { productId: string; priceId: string }) {
      const item = items.find((i) => i.kind === kind && i.id === id)!;
      item.stripeProductId = ids.productId;
      item.stripePriceId = ids.priceId;
    },
  };
}

const seed = (): CatalogItem[] => [
  { kind: "plan", id: "starter", name: "Starter", priceCents: 14900, stripeProductId: null, stripePriceId: null },
  { kind: "plan", id: "pro", name: "Pro", priceCents: 24900, stripeProductId: null, stripePriceId: null },
  { kind: "topup", id: "topup_500", name: "500 credits", priceCents: 5000, stripeProductId: null, stripePriceId: null },
  { kind: "topup", id: "topup_2000", name: "2,000 credits", priceCents: 18000, stripeProductId: null, stripePriceId: null },
];

describe("catalog IDs", () => {
  it("uses fixed product IDs and lookup keys", () => {
    expect(productIdFor({ kind: "plan", id: "starter" })).toBe("cd_plan_starter");
    expect(productIdFor({ kind: "topup", id: "topup_500" })).toBe("cd_topup_500");
    expect(lookupKeyFor({ kind: "plan", id: "pro" })).toBe("cd_plan_pro_monthly_usd");
    expect(lookupKeyFor({ kind: "topup", id: "topup_2000" })).toBe("cd_topup_2000_usd");
  });
});

describe("syncCatalog", () => {
  it("dry run reports the plan and changes nothing", async () => {
    const fake = fakeStripe();
    const store = memoryStore(seed());
    const actions = await syncCatalog(fake.stripe, store, { apply: false });
    expect(actions.map((a) => [a.item, a.product, a.price])).toEqual([
      ["plan:starter", "create", "create"],
      ["plan:pro", "create", "create"],
      ["topup:topup_500", "create", "create"],
      ["topup:topup_2000", "create", "create"],
    ]);
    expect(fake.calls).toEqual([]);
    expect(store.items.every((i) => i.stripePriceId === null)).toBe(true);
  });

  it("creates USD products and prices and stores their IDs", async () => {
    const fake = fakeStripe();
    const store = memoryStore(seed());
    await syncCatalog(fake.stripe, store, { apply: true });

    const starter = store.items[0];
    expect(starter.stripeProductId).toBe("cd_plan_starter");
    const price = fake.prices.get(starter.stripePriceId!)!;
    expect(price).toMatchObject({ currency: "usd", unit_amount: 14900, type: "recurring", lookup_key: "cd_plan_starter_monthly_usd" });
    expect(price.recurring).toMatchObject({ interval: "month", usage_type: "licensed" });
    expect(fake.products.get("cd_plan_starter")!.default_price).toBe(price.id);

    const pack = fake.prices.get(store.items[2].stripePriceId!)!;
    expect(pack).toMatchObject({ currency: "usd", unit_amount: 5000, type: "one_time", recurring: null });
  });

  it("is idempotent: a second run creates nothing", async () => {
    const fake = fakeStripe();
    const store = memoryStore(seed());
    await syncCatalog(fake.stripe, store, { apply: true });
    fake.calls.length = 0;

    const actions = await syncCatalog(fake.stripe, store, { apply: true });
    expect(fake.calls).toEqual([]);
    expect(actions.every((a) => a.product === "exists" && a.price === "exists" && !a.saveIds)).toBe(true);
  });

  it("recovers IDs after a crash between Stripe and the database", async () => {
    const fake = fakeStripe();
    await syncCatalog(fake.stripe, memoryStore(seed()), { apply: true });
    fake.calls.length = 0;

    const store = memoryStore(seed());
    await syncCatalog(fake.stripe, store, { apply: true });
    expect(fake.calls).toEqual([]);
    expect(store.items.every((i) => i.stripePriceId?.startsWith("price_"))).toBe(true);
  });

  it("a price change in the database makes a new price, moves the lookup key and keeps the old price", async () => {
    const fake = fakeStripe();
    const store = memoryStore(seed());
    await syncCatalog(fake.stripe, store, { apply: true });
    const oldId = store.items[0].stripePriceId!;

    store.items[0].priceCents = 19900;
    await syncCatalog(fake.stripe, store, { apply: true });
    const newId = store.items[0].stripePriceId!;

    expect(newId).not.toBe(oldId);
    expect(fake.prices.get(newId)).toMatchObject({ unit_amount: 19900, lookup_key: "cd_plan_starter_monthly_usd" });
    expect(fake.prices.get(oldId)).toMatchObject({ active: true, lookup_key: null });
  });

  it("renames and reactivates a product whose name changed", async () => {
    const fake = fakeStripe();
    const store = memoryStore(seed());
    await syncCatalog(fake.stripe, store, { apply: true });
    fake.products.set("cd_plan_pro", { ...fake.products.get("cd_plan_pro")!, active: false });

    store.items[1].name = "Pro plan";
    const actions = await syncCatalog(fake.stripe, store, { apply: true });
    expect(actions[1].product).toBe("update");
    expect(fake.products.get("cd_plan_pro")).toMatchObject({ name: "Pro plan", active: true });
  });
});

describe("checkCatalog", () => {
  it("matches every row after a sync", async () => {
    const fake = fakeStripe();
    const store = memoryStore(seed());
    await syncCatalog(fake.stripe, store, { apply: true });

    const result = await checkCatalog(fake.stripe, store);
    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(4);
    expect(result.unknownProducts).toEqual([]);
  });

  it("reports missing IDs, wrong amounts, other currencies and unknown products", async () => {
    const fake = fakeStripe();
    const store = memoryStore(seed());
    await syncCatalog(fake.stripe, store, { apply: true });

    store.items[0].priceCents = 14000;
    store.items[1].stripePriceId = null;
    const pack = fake.prices.get(store.items[2].stripePriceId!)!;
    fake.prices.set(pack.id, { ...pack, currency_options: { usd: {}, pkr: {} } } as unknown as Stripe.Price);
    store.items[3].stripePriceId = "price_gone";
    await fake.stripe.products.create({ id: "cd_plan_growth", name: "Growth" });

    const result = await checkCatalog(fake.stripe, store);
    expect(result.ok).toBe(false);
    const problems = Object.fromEntries(result.rows.map((r) => [r.item, r.problems]));
    expect(problems["plan:starter"]).toEqual(["amount is 14900, expected 14000"]);
    expect(problems["plan:pro"]).toEqual(["no stripe_price_id stored"]);
    expect(problems["topup:topup_500"]).toEqual(["has extra currencies: pkr"]);
    expect(problems["topup:topup_2000"]).toEqual(["price not found in this Stripe account"]);
    expect(result.unknownProducts).toEqual(["cd_plan_growth"]);
  });
});

describe("assertCatalogTarget", () => {
  const dev = "https://whjdcjoojylajtyjywhx.supabase.co";
  const live = "https://wsxusvapciexemfvtadm.supabase.co";

  it("accepts a sandbox restricted key with the dev database", () => {
    expect(assertCatalogTarget("rk_test_abc", dev, false)).toBe("sandbox");
  });

  it("accepts a live restricted key with the live database only when confirmed", () => {
    expect(() => assertCatalogTarget("rk_live_abc", live, false)).toThrow(/STRIPE_LIVE=1/);
    expect(assertCatalogTarget("rk_live_abc", live, true)).toBe("live");
  });

  it("refuses secret keys, missing keys and mixed modes", () => {
    expect(() => assertCatalogTarget(undefined, dev, false)).toThrow(/STRIPE_CATALOG_KEY/);
    expect(() => assertCatalogTarget("sk_test_abc", dev, false)).toThrow(/restricted key/);
    expect(() => assertCatalogTarget("rk_test_abc", live, true)).toThrow(/mix modes/);
    expect(() => assertCatalogTarget("rk_live_abc", dev, true)).toThrow(/mix modes/);
  });
});
