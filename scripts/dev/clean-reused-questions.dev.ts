// One-off cleanup (A8): pauses suggested questions that new sets no longer get, then recounts those businesses.
//   CLEAN=1 npm run questions:clean                         # lists what would be paused, changes nothing
//   CLEAN=1 APPLY=1 npm run questions:clean                 # pauses them and recounts
//   CLEAN=1 APPLY=1 ALSO='breakfast tacos|priced coffee' BUSINESS_ID=<uuid> npm run questions:clean
// Matches advice, the "Who can do {service} ... today?" filler, time and opening-hours questions and "near me" (the rules new sets use). ALSO is an
// extra regex for one business's own details that a reused set copied. Questions the owner wrote are never touched.
// Paused, not deleted: deleting a question would delete its past answers and rewrite the scores.
// The database comes from .env.local (or the shell), like the other scripts here.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { expect, it } from "vitest";

const enabled = process.env.CLEAN === "1";

it.runIf(enabled)("pause questions new sets no longer get", { timeout: 600_000 }, async () => {
  const file = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {};
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    process.env[name] ||= file[name];
  }
  const { createServiceClient } = await import("@/lib/supabase/service");
  const { isFairQuestion } = await import("@/modules/onboarding/question-rules");
  const { recountSavedAnswers } = await import("@/modules/scanning/recount/dal");
  const db = createServiceClient();
  const also = process.env.ALSO ? new RegExp(process.env.ALSO, "i") : null;

  let query = db.from("tracked_prompts").select("id, business_id, prompt").eq("active", true).neq("source", "custom");
  if (process.env.BUSINESS_ID) query = query.eq("business_id", process.env.BUSINESS_ID);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const bad = data.filter((q) => !isFairQuestion(q.prompt) || also?.test(q.prompt));
  console.table(bad.map((q) => ({ business: q.business_id, question: q.prompt })));

  if (process.env.APPLY === "1" && bad.length > 0) {
    const { error: updateError } = await db.from("tracked_prompts").update({ active: false }).in("id", bad.map((q) => q.id));
    if (updateError) throw new Error(updateError.message);
    const businesses = [...new Set(bad.map((q) => q.business_id))];
    const results = [];
    for (const id of businesses) results.push({ business: id, ...(await recountSavedAnswers(id)) });
    console.table(results);
  }
  expect(bad.length).toBeGreaterThanOrEqual(0);
});

it.skipIf(enabled)("skipped: set CLEAN=1 to run", () => {});
