import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

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
  const rows = [0, 1].flatMap((day) =>
    MODELS.flatMap((provider, m) =>
      Array.from({ length: 6 }, (_, q) => ({
        run_id: run.id,
        business_id: business.id,
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

test("Share gives a link the client opens without a login, and turning it off stops it", async ({ page, browser }) => {
  const owner = await seed(page);
  await page.getByTestId("share-button").click();
  await page.getByTestId("create-link").click();
  await expect(page.getByTestId("share-url")).toHaveValue(/^http:\/\/localhost:\d+\/r\/[A-Za-z0-9_-]{43}$/, ACTION);
  const link = await page.getByTestId("share-url").inputValue();

  const client = await browser.newContext();
  const reader = await client.newPage();
  const response = await reader.goto(link);
  expect(response!.headers()["x-robots-tag"]).toContain("noindex");
  await expect(reader.getByRole("heading", { level: 1, name: "Sunrise Coffee Bar" })).toBeVisible({ timeout: 60_000 });
  await expect(reader.getByTestId("agency-name")).toHaveText("Northside Marketing");
  await expect(reader.getByTestId("score-sentence")).toBeVisible();
  await expect(reader.getByTestId("leaderboard")).toContainText("Bean House");
  await expect(reader.getByText("Bean House: 320 Google reviews, 4.7 stars")).toBeVisible();
  await expect(reader.getByRole("img", { name: "Google Maps" })).toBeVisible();
  await expect(reader.getByTestId("report-opportunities")).toContainText("Add your opening hours to your website");
  await expect(reader.locator("[data-report-ready]")).toBeAttached({ timeout: 10_000 });
  await expect(reader.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(reader.locator('a[href^="/"]')).toHaveCount(0);

  // The full HTML, flight data included, holds no database ids or the owner's email.
  const html = await (await reader.request.get(link)).text();
  for (const secret of [owner.agencyId, owner.businessId, owner.email]) expect(html).not.toContain(secret);
  expect(html).not.toMatch(UUID);

  await page.getByTestId("revoke-link").click();
  await expect(page.getByTestId("create-link")).toBeVisible(ACTION);
  expect((await reader.reload())?.status()).toBe(404);
  await expect(reader.getByText("This report link is no longer active.")).toBeVisible();
  await client.close();
});

test("an unknown link shows the inactive page", async ({ page }) => {
  expect((await page.goto(`/r/${"A".repeat(43)}`))?.status()).toBe(404);
  await expect(page.getByText("This report link is no longer active.")).toBeVisible({ timeout: 60_000 });
  // The page's own tag and the one Next adds to every 404.
  for (const meta of await page.locator('meta[name="robots"]').all()) await expect(meta).toHaveAttribute("content", /noindex/);
});
