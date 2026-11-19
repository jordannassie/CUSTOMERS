// LOCAL ONLY (2026-10-15): brings one agency in line with Stripe when a webhook was missed (no `stripe listen`), the
// same way "Start my plan now" and the plan checkout now do: the subscription's state, then its latest paid invoice,
// through the webhook's own handlers. Safe to rerun: grants are keyed by invoice line, so nothing is granted twice.
//   SYNC=1 AGENCY="Rooter Compare Agency" npm run dev:sync-agency
//   SYNC=1 AGENCY=<agency uuid> npm run dev:sync-agency
// Settings come from .env.local, else .env. Anything but a local Supabase and a Stripe test key is refused.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { expect, it } from "vitest";

const enabled = process.env.SYNC === "1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

it.runIf(enabled)("sync one agency from Stripe", { timeout: 120_000 }, async () => {
  const file = existsSync(".env.local") ? ".env.local" : ".env";
  const values = parseEnv(readFileSync(file, "utf8"));
  for (const [name, value] of Object.entries(values)) process.env[name] ||= value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const host = URL.canParse(url) ? new URL(url).hostname : "";
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error(`Refusing: ${file} points at ${url || "(no URL)"}, not a local Supabase.`);
  if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")) throw new Error(`Refusing: ${file} has no Stripe test key.`);
  const wanted = process.env.AGENCY?.trim();
  if (!wanted) throw new Error('Set AGENCY to the agency name or id, for example AGENCY="Rooter Compare Agency".');

  const { createServiceClient } = await import("@/lib/supabase/service");
  const { getBalance } = await import("@/modules/credits");
  const { syncSubscriptionFromStripe } = await import("@/modules/billing/webhooks");
  const db = createServiceClient();
  const query = db.from("agencies").select("id, name, status, stripe_subscription_id");
  const { data: found, error } = await (UUID.test(wanted) ? query.eq("id", wanted) : query.eq("name", wanted));
  if (error) throw new Error(error.message);
  if (found.length !== 1) throw new Error(`Expected one agency for "${wanted}", found ${found.length}. Use its id instead.`);
  const agency = found[0];
  if (!agency.stripe_subscription_id) throw new Error(`${agency.name} has no Stripe subscription to sync.`);

  const before = { status: agency.status, balance: (await getBalance(agency.id)).balance };
  const result = await syncSubscriptionFromStripe(agency.stripe_subscription_id);
  const { data: now } = await db.from("agencies").select("status").eq("id", agency.id).single().throwOnError();
  const after = { status: now.status, balance: (await getBalance(agency.id)).balance };
  // Written straight to stdout: vitest hides console output from a passing test.
  process.stdout.write(
    [
      `${agency.name} (${agency.id}), ${agency.stripe_subscription_id} on ${url}`,
      `  Stripe: ${result.status}, latest invoice ${result.paid ? "paid" : "not paid"}`,
      `  Before: ${before.status}, ${before.balance} credits`,
      `  After:  ${after.status}, ${after.balance} credits`,
      "",
    ].join("\n"),
  );
  expect(after.status).toBeTruthy();
});

it.skipIf(enabled)('skipped: set SYNC=1 and AGENCY="<name or id>" to run', () => {});
