import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// B-54 against the local Supabase stack only. Each test seeds its own is_test agency and saved checks,
// so no AI is called (D-61).
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const HOUR = 3_600_000;
const MODELS = ["openai", "anthropic", "perplexity"] as const;
const userIds: string[] = [];

async function seedBusiness(page: Page): Promise<string> {
  const email = `e2e-sources-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);

  const { data: agency } = await db
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Sources test agency", is_test: true, status: "active" })
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

  await page.goto("/login?next=/sources");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/sources");
  // The dev server compiles the page on its first visit, which can take far longer than an assertion's 5s.
  await expect(page.getByRole("heading", { level: 1, name: "Sources" })).toBeVisible({ timeout: 60_000 });
  return business.id;
}

/** One saved check per entry, as a finished scan leaves them. */
async function seedChecks(businessId: string, checks: { provider: (typeof MODELS)[number]; urls: string[] }[]) {
  const { data: run } = await db
    .from("visibility_runs")
    .insert({ business_id: businessId, provider: "scan", status: "completed" })
    .select("id")
    .single()
    .throwOnError();
  await db
    .from("visibility_results")
    .insert(
      checks.map((c, i) => ({
        run_id: run.id,
        business_id: businessId,
        provider: c.provider,
        created_at: new Date(Date.now() - HOUR).toISOString(),
        business_mentioned: false,
        competitors_mentioned: [],
        cited_sources: c.urls.map((url) => ({ url, title: null })),
        answer_text: `${c.provider} answer ${i}`,
      })),
    )
    .throwOnError();
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("no scans yet: points to the first scan", async ({ page }) => {
  await seedBusiness(page);
  await expect(page.getByTestId("no-scans")).toContainText("Run your first scan from the Overview");
  await expect(page.getByRole("link", { name: "Go to Overview" })).toHaveAttribute("href", "/dashboard");
});

test("first scan with no citations: says so and what happens next", async ({ page }) => {
  const businessId = await seedBusiness(page);
  await seedChecks(businessId, MODELS.map((provider) => ({ provider, urls: [] })));
  await page.reload();
  await expect(page.getByTestId("no-sources")).toContainText("AI gave 3 answers without linking to any websites.");
  await expect(page.getByTestId("site-list")).toHaveCount(0);
});

test("cited sites: most cited first, with type, how often, which AI and the own site", async ({ page }) => {
  const businessId = await seedBusiness(page);
  await seedChecks(businessId, [
    { provider: "openai", urls: ["https://www.yelp.com/biz/bean-there", "https://patch.com/california/orange/coffee"] },
    { provider: "anthropic", urls: ["https://yelp.com/biz/daily-grind", "https://www.yelp.com/biz/bean-there"] },
    { provider: "perplexity", urls: ["https://yelp.com/x", "https://beantherecoffee.example/menu", "https://yellowpages.com/orange-ca/coffee"] },
    { provider: "perplexity", urls: ["https://dailygrindcoffee.example/"] },
    { provider: "openai", urls: [] },
  ]);
  await page.reload();

  await expect(page.getByText("Websites AI cited in the last 30 days when answering customer questions in Orange, CA.")).toBeVisible();
  await expect(page.getByTestId("own-site")).toContainText("AI cited your website (beantherecoffee.example) in 1 of 5 answers.");

  const rows = page.getByTestId("site-row");
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("yelp.com");
  await expect(rows.first()).toContainText("Reviews and forums");
  await expect(rows.first().getByTestId("site-count")).toHaveText("3 of 5 answers");
  await expect(rows.first().getByRole("list", { name: "Cited by" })).toHaveText(/ChatGPT\s*Claude\s*Perplexity/);
  await expect(rows.filter({ hasText: "yellowpages.com" })).toContainText("Directories");
  await expect(rows.filter({ hasText: "patch.com" })).toContainText("News");
  await expect(rows.filter({ hasText: "dailygrindcoffee.example" })).toContainText("Business sites");
  await expect(rows.filter({ hasText: "beantherecoffee.example" })).toContainText("Your website");

  await expect(page.getByTestId("source-types")).toContainText(/Reviews and forums\s*3 of 5 answers/);
  // Plain wording (MVP_SPEC 8.4).
  await expect(page.getByText(/UGC|citation rate/i)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sources", exact: true }).first()).toHaveAttribute("aria-current", "page");
});

test("own site not cited, and the old address still works", async ({ page }) => {
  const businessId = await seedBusiness(page);
  await seedChecks(businessId, [{ provider: "openai", urls: ["https://www.yelp.com/biz/daily-grind"] }]);
  await page.goto("/dashboard/citations");
  await page.waitForURL((url) => url.pathname === "/sources");
  await expect(page.getByTestId("own-site")).toContainText(
    "AI did not cite your website (beantherecoffee.example) in the last 30 days.",
  );
});
