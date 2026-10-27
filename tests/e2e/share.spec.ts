import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// B-59 against the local Supabase stack, with the dev server on .env.test.local values and PLACES_FIXTURES=true,
// so Google values come from made-up fixtures. Each test seeds an is_test agency (D-61).
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const MODELS = ["openai", "anthropic", "perplexity"] as const;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const ACTION = { timeout: 30_000 };
const userIds: string[] = [];

/** Where every screenshot of a test run goes when E2E_SHOTS_DIR is set (layout reviews only). */
async function shot(page: Page, info: TestInfo, name: string) {
  if (process.env.E2E_SHOTS_DIR) await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR}/${name}-${info.project.name}.png`, fullPage: true });
}

async function seed(page: Page) {
  const email = `e2e-share-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency } = await db
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Northside Marketing", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await db
    .from("businesses")
    .insert({
      owner_user_id: user.user.id,
      agency_id: agency.id,
      name: "Sunrise Coffee Bar",
      status: "active",
      industry: "coffee_shop",
      primary_city: "Springfield",
      primary_region: "IL",
      places_id: "ChIJ-fixture-sunrise-coffee",
      models: [...MODELS],
    })
    .select("id")
    .single()
    .throwOnError();
  await db
    .from("business_competitors")
    .insert({
      business_id: business.id,
      name: "Bean House",
      places_id: "ChIJ-fixture-bean-house",
      source: "confirmed_place",
      confirmed: true,
      created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    })
    .throwOnError();
  await db
    .from("opportunities")
    .insert({ business_id: business.id, title: "Add your opening hours to your website", impact: "high", status: "open", category: "local_presence" })
    .throwOnError();
  const { data: run } = await db
    .from("visibility_runs")
    .insert({ business_id: business.id, provider: "scan", status: "completed" })
    .select("id")
    .single()
    .throwOnError();
  // One suggested question for every answer: only suggested questions count in the score (BUG-129).
  const { data: question } = await db
    .from("tracked_prompts")
    .insert({ business_id: business.id, prompt: "Best coffee shop in Springfield, IL?", source: "library" })
    .select("id")
    .single()
    .throwOnError();
  const rows = [0, 1].flatMap((day) =>
    MODELS.flatMap((provider, m) =>
      Array.from({ length: 6 }, (_, q) => ({
        run_id: run.id,
        business_id: business.id,
        tracked_prompt_id: question.id,
        provider,
        created_at: new Date(Date.now() - day * 86_400_000 - 3_600_000).toISOString(),
        business_mentioned: (q + m) % 2 === 0,
        competitors_mentioned: q % 3 === 0 ? [{ name: "Bean House", position: 1 }] : [],
        cached: false,
        answer_text: `${provider} answer ${q} on day ${day}`,
      })),
    ),
  );
  await db.from("visibility_results").insert(rows).throwOnError();

  await page.goto("/login?next=/dashboard");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Sunrise Coffee Bar" })).toBeVisible({ timeout: 60_000 });
  return { agencyId: agency.id, businessId: business.id, email };
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

const SECTION_ORDER = ["summary", "models", "competitors", "questions", "sources", "actions", "method"].map((id) => `report-section-${id}`);
const sectionIds = (page: Page) => page.locator('[data-testid^="report-section-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));

test("Share link gives a link the client opens without a login, and turning it off stops it", async ({ page, browser }, info) => {
  const owner = await seed(page);
  await page.goto("/reports");
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible({ timeout: 60_000 });
  // The report document on the page, in the fixed order (7. Reports).
  expect(await sectionIds(page)).toEqual(SECTION_ORDER);
  await shot(page, info, "reports");
  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("share-panel")).toContainText("Read-only link is off");
  await page.getByTestId("create-link").click();
  await expect(page.getByTestId("share-url")).toHaveValue(/^http:\/\/localhost:\d+\/r\/[A-Za-z0-9_-]{43}$/, ACTION);
  await expect(page.getByTestId("share-panel")).toContainText("Read-only link is on");
  const link = await page.getByTestId("share-url").inputValue();

  const client = await browser.newContext();
  const reader = await client.newPage();
  const response = await reader.goto(link);
  expect(response!.headers()["x-robots-tag"]).toContain("noindex");
  await expect(reader.getByRole("heading", { level: 1, name: "Sunrise Coffee Bar" })).toBeVisible({ timeout: 60_000 });
  await expect(reader.getByTestId("agency-name")).toHaveText("Northside Marketing");
  // The same 7 sections in the same order as the page and the PDF.
  expect(await sectionIds(reader)).toEqual(SECTION_ORDER);
  // DB-012: plain sentences built from the numbers lead the report.
  await expect(reader.getByTestId("report-summary")).toContainText("Over the last 30 days, AI recommended Sunrise Coffee Bar");
  await expect(reader.getByTestId("fact-rank")).toContainText("of 2");
  await expect(reader.getByTestId("report-section-competitors")).toContainText("Bean House");
  await expect(reader.getByTestId("report-opportunities")).toContainText("Add your opening hours to your website");
  // No Google values in the report (D-73): the fixture's 320 reviews and 4.7 stars never show.
  await expect(reader.getByTestId("report")).not.toContainText("320");
  await expect(reader.getByTestId("report")).not.toContainText("4.7");
  await expect(reader.locator("[data-report-ready]")).toBeAttached({ timeout: 10_000 });
  await expect(reader.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // The report only, never the dashboard: no links into the app.
  await expect(reader.locator('a[href^="/"]')).toHaveCount(0);

  // The full HTML, flight data included, holds no database ids or the owner's email.
  const html = await (await reader.request.get(link)).text();
  for (const secret of [owner.agencyId, owner.businessId, owner.email]) expect(html).not.toContain(secret);
  expect(html).not.toMatch(UUID);

  await page.getByTestId("revoke-link").click();
  await expect(page.getByText("Clients with this link will lose access.")).toBeVisible();
  await page.getByTestId("confirm-revoke").click();
  await expect(page.getByTestId("create-link")).toBeVisible(ACTION);
  expect((await reader.reload())?.status()).toBe(404);
  await expect(reader.getByText("This report is not available.")).toBeVisible();
  await client.close();
});

test("hidden sections leave the page and the link; a snapshot link keeps its numbers", async ({ page, browser }) => {
  const owner = await seed(page);
  // The Overview's Share opens the panel straight away.
  await page.goto("/reports?share=1");
  await expect(page.getByTestId("share-panel")).toBeVisible({ timeout: 60_000 });

  await page.getByRole("switch", { name: "Competitors" }).click();
  await expect(page.getByTestId("report-section-competitors")).toHaveCount(0, ACTION);
  await page.getByTestId("create-link").click();
  const live = await page.getByTestId("share-url").inputValue();

  await page.getByTestId("save-snapshot").click();
  await page.waitForURL(/\/reports\?report=[0-9a-f-]{36}$/, ACTION);
  await expect(page.getByTestId("saved-report")).toHaveCount(2);
  await expect(page.getByTestId("report-prepared")).toContainText("Snapshot saved");
  await page.getByTestId("share-button").click();
  await page.getByTestId("create-link").click();
  const frozen = await page.getByTestId("share-url").inputValue();
  expect(frozen).not.toBe(live);
  // textContent, as toHaveText reads it: innerText puts line breaks between the tile's lines.
  const score = (await page.getByTestId("fact-score").textContent())!;

  // New answers that never name the business: the live link moves, the snapshot link does not.
  await db.from("visibility_results").update({ business_mentioned: false }).eq("business_id", owner.businessId).throwOnError();
  const client = await browser.newContext();
  const reader = await client.newPage();
  await reader.goto(frozen);
  await expect(reader.getByTestId("fact-score")).toHaveText(score, { timeout: 60_000 });
  await expect(reader.getByTestId("report-section-competitors")).toHaveCount(0);
  await reader.goto(live);
  await expect(reader.getByTestId("fact-score")).not.toHaveText(score, { timeout: 60_000 });
  await client.close();
});

test("an unknown link shows the inactive page", async ({ page }) => {
  expect((await page.goto(`/r/${"A".repeat(43)}`))?.status()).toBe(404);
  await expect(page.getByText("This report is not available.")).toBeVisible({ timeout: 60_000 });
  // The page's own tag and the one Next adds to every 404.
  for (const meta of await page.locator('meta[name="robots"]').all()) await expect(meta).toHaveAttribute("content", /noindex/);
});
