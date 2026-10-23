import type Stripe from "stripe";

// Stripe products and prices built from the plans and topup_packs rows (B-40, MVP_SPEC 11.4, D-56).
// The database is the source of truth; these functions only mirror it into Stripe. No env or DB imports here.

export type CatalogKind = "plan" | "topup";

export type CatalogItem = {
  kind: CatalogKind;
  id: string;
  name: string;
  priceCents: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
};

export type CatalogStore = {
  load(): Promise<CatalogItem[]>;
  saveStripeIds(kind: CatalogKind, id: string, ids: { productId: string; priceId: string }): Promise<void>;
};

/** The Stripe calls these scripts need, so tests can pass a mock and a restricted key needs only these permissions. */
export type CatalogStripe = {
  products: {
    retrieve(id: string): Promise<Stripe.Product>;
    create(params: Stripe.ProductCreateParams): Promise<Stripe.Product>;
    update(id: string, params: Stripe.ProductUpdateParams): Promise<Stripe.Product>;
    list(params: Stripe.ProductListParams): AsyncIterable<Stripe.Product>;
  };
  prices: {
    retrieve(id: string, params: Stripe.PriceRetrieveParams): Promise<Stripe.Price>;
    create(params: Stripe.PriceCreateParams): Promise<Stripe.Price>;
    list(params: Stripe.PriceListParams): AsyncIterable<Stripe.Price>;
  };
};

export const CATALOG_CURRENCY = "usd";

/** Fixed product IDs make product creation idempotent: cd_plan_starter, cd_topup_500. */
export function productIdFor(item: Pick<CatalogItem, "kind" | "id">): string {
  return item.kind === "plan" ? `cd_plan_${item.id}` : `cd_${item.id}`;
}

/** The lookup key always points at the current price, so a price change moves the key to the new price. */
export function lookupKeyFor(item: Pick<CatalogItem, "kind" | "id">): string {
  return item.kind === "plan" ? `${productIdFor(item)}_monthly_usd` : `${productIdFor(item)}_usd`;
}

function isMissing(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "resource_missing";
}

function productIdOf(price: Stripe.Price): string {
  return typeof price.product === "string" ? price.product : price.product.id;
}

/** Why a price does not match its row, or an empty list when it does. */
export function priceProblems(item: CatalogItem, price: Stripe.Price, productId: string): string[] {
  const problems: string[] = [];
  if (!price.active) problems.push("price is archived");
  if (price.currency !== CATALOG_CURRENCY) problems.push(`currency is ${price.currency}, expected usd`);
  if (price.unit_amount !== item.priceCents) problems.push(`amount is ${price.unit_amount}, expected ${item.priceCents}`);
  if (productIdOf(price) !== productId) problems.push(`belongs to ${productIdOf(price)}, expected ${productId}`);
  if (item.kind === "plan") {
    if (price.type !== "recurring" || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) {
      problems.push("expected a monthly recurring price");
    }
    if (price.recurring?.usage_type !== "licensed") problems.push("expected per-seat (licensed) usage");
  } else if (price.type !== "one_time") {
    problems.push("expected a one-time price");
  }
  const extra = Object.keys(price.currency_options ?? {}).filter((c) => c !== CATALOG_CURRENCY);
  if (extra.length > 0) problems.push(`has extra currencies: ${extra.join(", ")}`);
  return problems;
}

export type SyncAction = {
  item: string;
  product: "exists" | "create" | "update";
  price: "exists" | "create";
  priceId: string | null;
  saveIds: boolean;
};

async function syncProduct(stripe: CatalogStripe, item: CatalogItem, apply: boolean): Promise<SyncAction["product"]> {
  const id = productIdFor(item);
  let product: Stripe.Product | null = null;
  try {
    product = await stripe.products.retrieve(id);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  if (!product) {
    if (apply) {
      await stripe.products.create({ id, name: item.name, metadata: { catalog_kind: item.kind, catalog_id: item.id } });
    }
    return "create";
  }
  if (product.name === item.name && product.active) return "exists";
  if (apply) await stripe.products.update(id, { name: item.name, active: true });
  return "update";
}

async function findCurrentPrice(stripe: CatalogStripe, item: CatalogItem): Promise<Stripe.Price | null> {
  for await (const price of stripe.prices.list({ lookup_keys: [lookupKeyFor(item)], active: true, limit: 1 })) {
    return price;
  }
  return null;
}

async function syncItem(stripe: CatalogStripe, store: CatalogStore, item: CatalogItem, apply: boolean) {
  const productId = productIdFor(item);
  const product = await syncProduct(stripe, item, apply);

  const current = product === "create" ? null : await findCurrentPrice(stripe, item);
  let price: SyncAction["price"] = "exists";
  let priceId = current && priceProblems(item, current, productId).length === 0 ? current.id : null;

  if (!priceId) {
    price = "create";
    if (apply) {
      // A crash after this call is safe: the next run finds the price by its lookup key.
      const created = await stripe.prices.create({
        product: productId,
        currency: CATALOG_CURRENCY,
        unit_amount: item.priceCents,
        ...(item.kind === "plan" ? { recurring: { interval: "month", usage_type: "licensed" } } : {}),
        lookup_key: lookupKeyFor(item),
        transfer_lookup_key: true,
        metadata: { catalog_kind: item.kind, catalog_id: item.id },
      });
      priceId = created.id;
      await stripe.products.update(productId, { default_price: created.id });
    }
  }

  const saveIds = price === "create" || item.stripePriceId !== priceId || item.stripeProductId !== productId;
  if (apply && saveIds && priceId) await store.saveStripeIds(item.kind, item.id, { productId, priceId });
  return { item: `${item.kind}:${item.id}`, product, price, priceId, saveIds };
}

/**
 * Makes Stripe match the database: one product per plan and pack, one current USD price each.
 * Safe to run again: existing products and matching prices are reused. Old prices are never archived,
 * because live subscriptions may still use them. With apply false it only reports what it would do.
 */
export async function syncCatalog(stripe: CatalogStripe, store: CatalogStore, { apply }: { apply: boolean }) {
  const actions: SyncAction[] = [];
  for (const item of await store.load()) actions.push(await syncItem(stripe, store, item, apply));
  return actions;
}

export type CheckRow = { item: string; productId: string | null; priceId: string | null; problems: string[] };

/** Read-only: matches every stored price ID to Stripe and lists catalog products the database does not know. */
export async function checkCatalog(stripe: CatalogStripe, store: CatalogStore) {
  const items = await store.load();
  const rows: CheckRow[] = [];

  for (const item of items) {
    const row: CheckRow = { item: `${item.kind}:${item.id}`, productId: item.stripeProductId, priceId: item.stripePriceId, problems: [] };
    rows.push(row);
    if (item.stripeProductId !== productIdFor(item)) row.problems.push(`product ID should be ${productIdFor(item)}`);
    if (!item.stripePriceId) {
      row.problems.push("no stripe_price_id stored");
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(item.stripePriceId, { expand: ["currency_options", "product"] });
      row.problems.push(...priceProblems(item, price, productIdFor(item)));
      if (typeof price.product !== "string" && "active" in price.product && !price.product.active) {
        row.problems.push("product is archived");
      }
    } catch (error) {
      if (!isMissing(error)) throw error;
      row.problems.push("price not found in this Stripe account");
    }
  }

  const known = new Set(items.map(productIdFor));
  const unknownProducts: string[] = [];
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (product.id.startsWith("cd_") && !known.has(product.id)) unknownProducts.push(product.id);
  }

  return { rows, unknownProducts, ok: rows.every((r) => r.problems.length === 0) };
}

const LIVE_PROJECT_REF = "wsxusvapciexemfvtadm";

/** Stops the scripts from using a full secret key or writing sandbox price IDs into live (or the reverse). */
export function assertCatalogTarget(key: string | undefined, dbUrl: string, liveConfirmed: boolean): "live" | "sandbox" {
  if (!key) throw new Error("Set STRIPE_CATALOG_KEY in the shell to a restricted key (rk_test_ or rk_live_).");
  if (!key.startsWith("rk_")) throw new Error("STRIPE_CATALOG_KEY must be a restricted key (rk_), not a secret key.");
  const live = key.startsWith("rk_live_");
  if (live !== dbUrl.includes(LIVE_PROJECT_REF)) {
    throw new Error(`Refusing to mix modes: ${live ? "live" : "sandbox"} Stripe key with database ${dbUrl}.`);
  }
  if (live && !liveConfirmed) throw new Error("Live Stripe key: also set STRIPE_LIVE=1 to confirm.");
  return live ? "live" : "sandbox";
}
