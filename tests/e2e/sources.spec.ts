import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// B-54 and the dashboard redesign (2026-10-27) against the local Supabase stack only. Each test seeds its own is_test agency and saved checks,
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

/** Where every screenshot of a test run goes when E2E_SHOTS_DIR is set (layout reviews only). */
async function shot(page: Page, info: TestInfo, name: string) {
  if (process.env.E2E_SHOTS_DIR) await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR}/${name}-${info.project.name}.png`, fullPage: true });
}

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
type Seed = { provider: (typeof MODELS)[number]; urls: string[]; mentioned?: boolean; competitors?: string[] };

async function seedChecks(businessId: string, checks: Seed[]) {
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
        business_mentioned: c.mentioned ?? false,
        competitors_mentioned: (c.competitors ?? []).map((name, p) => ({ name, position: p + 2 })),
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
  await expect(page.getByRole("link", { name: "Go to Overview", exact: true })).toHaveAttribute("href", "/dashboard");
});

test("first scan with no citations: says so and what happens next", async ({ page }) => {
  const businessId = await seedBusiness(page);
  await seedChecks(businessId, MODELS.map((provider) => ({ provider, urls: [] })));
  await page.reload();
  await expect(page.getByTestId("no-sources")).toContainText("AI gave 3 answers without linking to any websites.");
  await expect(page.getByTestId("site-list")).toHaveCount(0);
});

test("cited sites: most cited first, with kind, how often, who used it and the own site", async ({ page }, info) => {
  const businessId = await seedBusiness(page);
  await seedChecks(businessId, [
    { provider: "openai", urls: ["https://www.yelp.com/biz/bean-there", "https://patch.com/california/orange/coffee"] },
    { provider: "anthropic", urls: ["https://yelp.com/biz/daily-grind", "https://www.yelp.com/biz/bean-there"], mentioned: true },
    { provider: "perplexity", urls: ["https://yelp.com/x", "https://beantherecoffee.example/menu", "https://yellowpages.com/orange-ca/coffee"] },
    { provider: "perplexity", urls: ["https://dailygrindcoffee.example/"] },
    { provider: "openai", urls: [] },
  ]);
  await page.reload();

  await expect(page.getByText("Websites AI used in the last 30 days to answer customer questions in Orange, CA.")).toBeVisible();
  // The own site was used, so there is no alert; the KPI says how often.
  await expect(page.getByTestId("own-site")).toHaveCount(0);
  await expect(page.getByTestId("kpi-sites")).toContainText(/5\s*in 5 answers/);
  await expect(page.getByTestId("kpi-top-source")).toContainText(/yelp\.com\s*used in 3 of 5 answers/);
  await expect(page.getByTestId("kpi-own-site")).toContainText("1 time");

  const rows = page.getByTestId("site-row");
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("yelp.com");
  await expect(rows.first().getByTestId("site-kind")).toHaveText("Reviews");
  await expect(rows.first().getByTestId("site-count")).toHaveText("3 of 5 answers");
  await expect(rows.first().getByTestId("site-mentions")).toHaveText("Sometimes");
  // One dot per AI tool, named for screen readers.
  await expect(rows.first().getByTestId("tool-dots")).toContainText("Used by ChatGPT, Claude, Perplexity");
  await expect(rows.filter({ hasText: "yellowpages.com" }).getByTestId("site-kind")).toHaveText("Directory");
  await expect(rows.filter({ hasText: "patch.com" }).getByTestId("site-kind")).toHaveText("News");
  await expect(rows.filter({ hasText: "dailygrindcoffee.example" }).getByTestId("site-kind")).toHaveText("Business site");
  await expect(rows.filter({ hasText: "beantherecoffee.example" }).getByTestId("site-kind")).toHaveText("Your website");

  await expect(page.getByTestId("source-types")).toContainText(/Reviews and forums\s*3 of 5 answers/);
  await shot(page, info, "sources");
  // Plain wording (MVP_SPEC 8.4).
  await expect(page.getByText(/UGC|citation rate/i)).toHaveCount(0);
  // On a phone the menu is closed in a sheet (B-48), so the active item is checked on desktop.
  if (test.info().project.name === "desktop") {
    await expect(page.getByRole("link", { name: "Sources", exact: true })).toHaveAttribute("aria-current", "page");
  }
});

test("own site not cited, and the old address still works", async ({ page }) => {
  const businessId = await seedBusiness(page);
  await seedChecks(businessId, [{ provider: "openai", urls: ["https://www.yelp.com/biz/daily-grind"] }]);
  await page.goto("/dashboard/citations");
  await page.waitForURL((url) => url.pathname === "/sources");
  await expect(page.getByTestId("own-site")).toContainText(
    "AI never used your website (beantherecoffee.example) in the last 30 days.",
  );
  await expect(page.getByRole("link", { name: "See website fixes" })).toHaveAttribute("href", "/actions");
});

test("the AI tool filter changes every number and can be linked", async ({ page }) => {
  const businessId = await seedBusiness(page);
  await seedChecks(businessId, [
    { provider: "openai", urls: ["https://yelp.com/a", "https://beantherecoffee.example/"], mentioned: true },
    { provider: "anthropic", urls: ["https://yelp.com/b", "https://foodpanda.example/x"] },
    { provider: "anthropic", urls: ["https://doordash.com/store/1"] },
  ]);
  await page.reload();
  await expect(page.getByTestId("kpi-sites")).toContainText("in 3 answers");

  await page.getByTestId("tool-filter").getByRole("link", { name: "Claude" }).click();
  await page.waitForURL((url) => url.searchParams.get("tool") === "claude");
  await expect(page.getByTestId("tool-filter").getByRole("link", { name: "Claude" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("kpi-sites")).toContainText("in 2 answers");
  await expect(page.getByTestId("own-site")).toContainText("Claude never used your website");
  await expect(page.getByTestId("site-row")).toHaveCount(3);
  await expect(page.getByTestId("site-row").filter({ hasText: "doordash.com" }).getByTestId("site-kind")).toHaveText("Delivery app");

  await page.goto("/sources?tool=chatgpt");
  await expect(page.getByTestId("kpi-own-site")).toContainText("1 time");
  await expect(page.getByTestId("own-site")).toHaveCount(0);
});

test("get listed here first: adds the fix to Actions once", async ({ page }) => {
  const businessId = await seedBusiness(page);
  await seedChecks(businessId, [
    { provider: "openai", urls: ["https://doordash.com/store/1", "https://yelp.com/a"] },
    { provider: "anthropic", urls: ["https://doordash.com/store/1"] },
    { provider: "perplexity", urls: ["https://doordash.com/store/2", "https://yelp.com/b"], mentioned: true },
  ]);
  await page.reload();

  const first = page.getByTestId("listed-first").getByTestId("listed-site").first();
  await expect(first).toContainText("doordash.com");
  await expect(first).toContainText("Used in 3 answers, 2 without naming you. Complete your page: menu, prices, hours and reviews.");
  await expect(first.getByTestId("impact")).toContainText("High");
  await first.getByTestId("add-to-actions").click();
  await expect(first.getByTestId("in-actions")).toHaveText("In Actions · To do");

  const { data: saved } = await db.from("opportunities").select("dedupe_key, source, where_to_apply").eq("business_id", businessId).throwOnError();
  expect(saved).toEqual([{ dedupe_key: "site:doordash.com", source: "sources", where_to_apply: "doordash.com" }]);
  await page.reload();
  await expect(page.getByTestId("listed-first").getByTestId("listed-site").first().getByTestId("in-actions")).toHaveText("In Actions · To do");
});

test("table filters: competitor sites link to Compare", async ({ page }) => {
  const businessId = await seedBusiness(page);
  const { data: rival } = await db
    .from("business_competitors")
    .insert({ business_id: businessId, name: "Daily Grind", domain: "dailygrind.example" })
    .select("id")
    .single()
    .throwOnError();
  await seedChecks(businessId, [
    { provider: "openai", urls: ["https://dailygrind.example/", "https://yelp.com/a"], competitors: ["Daily Grind"] },
    { provider: "anthropic", urls: ["https://yelp.com/b"], mentioned: true },
  ]);
  await page.reload();

  await expect(page.getByTestId("kpi-own-site")).toContainText("Competitor sites: 1 time");
  await page.getByTestId("site-filter").getByRole("radio", { name: "Competitor sites" }).click();
  const rows = page.getByTestId("site-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByTestId("site-kind")).toHaveText("Competitor site");
  await expect(rows.first().getByTestId("site-mentions")).toHaveText("Their own site");
  await expect(rows.first().getByTestId("site-names")).toHaveText("Daily Grind");
  await expect(rows.first().getByRole("link", { name: /Compare/ })).toHaveAttribute("href", `/competitors/compare?with=${rival.id}`);

  await page.getByTestId("site-filter").getByRole("radio", { name: "Mentions you" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("yelp.com");
  await expect(rows.first().getByRole("link", { name: /Improve/ })).toHaveAttribute("href", "/actions");
});
