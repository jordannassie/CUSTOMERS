// Setup shared by the Stripe catalog scripts (B-40). The key comes only from the shell, never from .env.local,
// and must be a restricted key (rk_) whose mode matches the database: sandbox with dev, live with live.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { assertCatalogTarget, type CatalogStore, type CatalogStripe } from "@/modules/billing/catalog";

export const catalogRunEnabled = process.env.STRIPE_CATALOG === "1";

export async function catalogSetup(): Promise<{ stripe: CatalogStripe; store: CatalogStore; label: string }> {
  // env.ts validates on import, so the database settings must be in process.env first.
  const file = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {};
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    process.env[name] ||= file[name];
  }
  const key = process.env.STRIPE_CATALOG_KEY;
  const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const mode = assertCatalogTarget(key, dbUrl, process.env.STRIPE_LIVE === "1");

  const { createStripeClient } = await import("@/modules/billing/stripe");
  const { createCatalogStore } = await import("@/modules/billing/dal");
  const stripe: CatalogStripe = createStripeClient(key!);
  return { stripe, store: createCatalogStore(), label: `${mode === "live" ? "LIVE" : "sandbox"} Stripe, database ${dbUrl}` };
}
