// Checks every business's saved answers again with today's matching rules and competitor lists (BUG-122, BUG-113).
// Run once after deploying a matching fix; the app also does it for one business whenever its competitors change.
//   RECOUNT=1 npm run scans:recount                     # every set-up business (answers from the last 90 days)
//   RECOUNT=1 BUSINESS_ID=<uuid> npm run scans:recount  # one business
// The database comes from .env.local (or the shell), like the Stripe catalog scripts.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { expect, it } from "vitest";

const enabled = process.env.RECOUNT === "1";

it.runIf(enabled)("recount saved answers", { timeout: 600_000 }, async () => {
  const file = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {};
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    process.env[name] ||= file[name];
  }
  const { createServiceClient } = await import("@/lib/supabase/service");
  const { recountSavedAnswers } = await import("@/modules/scanning/recount/dal");

  let ids = process.env.BUSINESS_ID ? [process.env.BUSINESS_ID] : [];
  if (ids.length === 0) {
    // Every set-up business; one with no answers in the last RECOUNT_DAYS days is a quick no-op.
    const { data, error } = await createServiceClient().from("businesses").select("id").is("deleted_at", null).neq("status", "onboarding");
    if (error) throw new Error(error.message);
    ids = data.map((r) => r.id);
  }
  const results = [];
  for (const id of ids) results.push({ business: id, ...(await recountSavedAnswers(id)) });
  console.table(results);
  expect(results.length).toBeGreaterThanOrEqual(0);
});

it.skipIf(enabled)("skipped: set RECOUNT=1 to run", () => {});
