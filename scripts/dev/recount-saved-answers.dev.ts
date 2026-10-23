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
  const { data: named } = await createServiceClient().from("businesses").select("id, name").in("id", ids);
  const nameOf = new Map((named ?? []).map((b) => [b.id, b.name]));
  const results: { business: string; id: string; checked: number; changed: number }[] = [];
  for (const id of ids) results.push({ business: nameOf.get(id) ?? id, id, ...(await recountSavedAnswers(id)) });
  // Written straight to stdout: vitest hides console output from a passing test, so the table never showed.
  const changed = results.filter((r) => r.changed > 0);
  const total = (k: "checked" | "changed") => results.reduce((n, r) => n + r[k], 0);
  process.stdout.write(
    [
      `Recount on ${process.env.NEXT_PUBLIC_SUPABASE_URL}: ${results.length} businesses, ${total("checked")} saved answers checked, ${total("changed")} changed.`,
      ...changed.map((r) => `  ${r.business} (${r.id}): ${r.changed} of ${r.checked} changed`),
      "",
    ].join("\n"),
  );
  expect(results.length).toBeGreaterThanOrEqual(0);
});

it.skipIf(enabled)("skipped: set RECOUNT=1 to run", () => {});
