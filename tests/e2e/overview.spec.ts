import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// B-49 against the local Supabase stack only, with the dev server on .env.test.local values and
// WORKER_IN_PROCESS=true. Each test seeds its own is_test agency, so scans use recorded answers (D-61).
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MODELS = ["openai", "anthropic", "perplexity"] as const;
// Worded like the recorded answers in tests/fixtures/ai-answers, so Run scan finds a close match.
const QUESTIONS = [
  "What is the best coffee shop in Orange, CA?",
  "Where can I find a quiet cafe to work from in Orange, CA?",
  "Which coffee shop in Orange, CA has the best cold brew?",
];
const REMOVED_CARDS = ["Share of Voice", "Market Rank", "Direct Score"];
const userIds: string[] = [];

type Business = { id: string; prompts: string[] };

async function seedBusiness(page: Page): Promise<Business> {
  const email = `e2e-overview-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);

  const { data: agency } = await db
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Overview test agency", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await db
    .from("businesses")
    .insert({
      owner_user_id: user.user.id,
      agency_id: agency.id,
      name: "Bean There Coffee",
      status: "active",
      industry: "coffee shop",
      domain: "beantherecoffee.example",
      primary_city: "Orange",
      primary_region: "CA",
      primary_country: "United States",
      models: [...MODELS],
    })
    .select("id")
    .single()
    .throwOnError();
  const { data: prompts } = await db
    .from("tracked_prompts")
    .insert(QUESTIONS.map((prompt) => ({ business_id: business.id, prompt })))
    .select("id")
    .throwOnError();
  const { error: grantError } = await db.rpc("grant_credits", {
    p_agency_id: agency.id,
    p_source: "admin",
    p_source_id: `e2e-${randomUUID()}`,
    p_amount: 200,
    p_expires_at: null,
  });
  if (grantError) throw grantError;

  await page.goto("/login?next=/dashboard");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/dashboard");
  // The dev server compiles the page on its first visit, which can take far longer than an assertion's 5s.
  await expect(page.getByRole("heading", { level: 1, name: "Bean There Coffee" })).toBeVisible({ timeout: 60_000 });
  return { id: business.id, prompts: prompts.map((p) => p.id) };
}

/** Saved checks as a finished scan leaves them; `mentioned(model, question, day)` decides each result. */
async function seedChecks(
  business: Business,
  days: number,
  mentioned: (model: number, question: number, day: number) => boolean,
) {
  const { data: run } = await db
    .from("visibility_runs")
    .insert({ business_id: business.id, provider: "scan", status: "completed" })
    .select("id")
    .single()
    .throwOnError();
  const rows = Array.from({ length: days }, (_, day) =>
    MODELS.flatMap((provider, m) =>
      Array.from({ length: 12 }, (_, q) => ({
        run_id: run.id,
        business_id: business.id,
        tracked_prompt_id: business.prompts[q % business.prompts.length],
        provider,
        created_at: new Date(Date.now() - day * DAY - HOUR).toISOString(),
        business_mentioned: mentioned(m, q, day),
        competitors_mentioned: [],
        cached: false,
        answer_text: `${provider} answer ${q} on day ${day}`,
      })),
    ),
  ).flat();
  for (let i = 0; i < rows.length; i += 500) {
    await db.from("visibility_results").insert(rows.slice(i, i + 500)).throwOnError();
  }
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("no scans yet: an invitation to run the first scan", async ({ page }) => {
  await seedBusiness(page);
  await expect(page.getByTestId("no-score")).toContainText("No score yet");
  await expect(page.getByTestId("last-scan")).toHaveText("No scans yet");
  await expect(page.getByTestId("model-scores")).toContainText("ChatGPT");
  await expect(page.getByTestId("model-scores").getByText("No checks yet")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Run scan" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  // Hidden until B-60 wires it (DESIGN.md: no placeholder buttons).
  await expect(page.getByRole("button", { name: "Export PDF" })).toHaveCount(0);
  for (const card of REMOVED_CARDS) await expect(page.getByText(card)).toHaveCount(0);
});

test("first scan: score, early label, first results note, no arrow", async ({ page }) => {
  const business = await seedBusiness(page);
  // ChatGPT 9 of 12, Claude 6 of 12, Perplexity 7 of 12: 61 overall.
  const hits = [9, 6, 7];
  await seedChecks(business, 1, (m, q) => q < hits[m]);
  await page.reload();

  await expect(page.getByTestId("score-value")).toHaveText("61");
  await expect(page.getByTestId("confidence-label")).toHaveText("Early estimate");
  await expect(page.getByTestId("score-sentence")).toHaveText(
    "AI recommended you in about 6 of 10 customer questions this month.",
  );
  await expect(page.getByText("First results. Accuracy improves with every scan.")).toBeVisible();
  await expect(page.getByTestId("score-change")).toHaveCount(0);
  await expect(page.getByTestId("model-scores")).toContainText(/ChatGPT\s*75/);
  await expect(page.getByTestId("model-scores")).toContainText(/Claude\s*50/);
  await expect(page.getByTestId("last-scan")).toHaveText("Last scan 1 hour ago");

  await page.getByRole("button", { name: "How is this calculated?" }).click();
  const panel = page.getByRole("dialog", { name: "How your score is calculated" });
  await expect(panel).toContainText("Last 30 days");
  await expect(panel).toContainText("36");
  await expect(panel).toContainText(/ChatGPT\s*75, plus or minus \d+ points/);
  await expect(panel.getByRole("heading", { name: "How we check" })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Tested against the real apps" })).toHaveCount(0);
});

test("30 days of history: high confidence, a real rise and the top 3 fixes", async ({ page }) => {
  const business = await seedBusiness(page);
  // 3 of 12 mentioned before this week, 9 of 12 this week: far larger than the margin.
  await seedChecks(business, 30, (_, q, day) => q < (day < 7 ? 9 : 3));
  await db
    .from("opportunities")
    .insert([
      { business_id: business.id, title: "Add your opening hours", impact: "low", category: "local_presence", status: "open" },
      { business_id: business.id, title: "Get listed on Yelp", impact: "high", category: "citations", status: "open" },
      { business_id: business.id, title: "Answer common questions on your site", impact: "medium", category: "content", status: "open" },
      { business_id: business.id, title: "Ask customers for Google reviews", impact: "high", category: "reviews_reputation", status: "open" },
      { business_id: business.id, title: "Old fix", impact: "high", category: "content", status: "resolved" },
    ])
    .throwOnError();
  await page.reload();

  await expect(page.getByTestId("confidence-label")).toHaveText("High confidence");
  await expect(page.getByTestId("score-change")).toContainText(/^Up \d+ points on last week$/);
  await expect(page.getByText("First results. Accuracy improves with every scan.")).toHaveCount(0);
  const fixes = page.getByTestId("top-opportunities").getByRole("link");
  await expect(fixes).toHaveCount(3);
  await expect(fixes.nth(2)).toHaveText("Answer common questions on your site");
  await expect(page.getByRole("link", { name: "See all opportunities" })).toHaveAttribute("href", "/opportunities");
  for (const card of REMOVED_CARDS) await expect(page.getByText(card)).toHaveCount(0);
});

test("Run scan: the score appears when the scan finishes, without a reload", async ({ page }) => {
  await seedBusiness(page);
  await expect(page.getByTestId("no-score")).toBeVisible();
  await page.getByRole("button", { name: "Run scan" }).click();
  await expect(page.getByRole("button", { name: /Scanning/ })).toBeVisible();
  await expect(page.getByTestId("score-summary")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("no-score")).toHaveCount(0);
  await expect(page.getByTestId("last-scan")).toHaveText(/^Last scan /);
});

test("old Visibility and Reports bookmarks land on the Overview (B-58)", async ({ page }) => {
  await seedBusiness(page);
  for (const path of ["/dashboard/visibility", "/dashboard/reports"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL((url) => url.pathname === "/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Bean There Coffee" })).toBeVisible();
  }
});
