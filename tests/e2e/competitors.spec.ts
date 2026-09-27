import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// B-50 against the local Supabase stack, with the dev server on .env.test.local values and PLACES_FIXTURES=true,
// so Google values come from made-up fixtures and no real Places or AI call is made. Each test seeds an is_test agency.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const MODELS = ["openai", "anthropic", "perplexity"] as const;
const userIds: string[] = [];

type Seed = { competitors: { name: string; places_id: string | null }[]; answers: string[][] };

async function seed(page: Page, { competitors, answers }: Seed): Promise<string> {
  const email = `e2e-competitors-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);

  const { data: agency } = await db
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Competitors test agency", is_test: true, status: "active" })
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
  if (competitors.length) {
    await db
      .from("business_competitors")
      .insert(
        competitors.map((c) => ({
          business_id: business.id,
          ...c,
          source: c.places_id ? "confirmed_place" : "manual",
          confirmed: true,
          // Tracked before the seeded scan, as in real use.
          created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        })),
      )
      .throwOnError();
  }
  if (answers.length) {
    const { data: run } = await db
      .from("visibility_runs")
      .insert({ business_id: business.id, provider: "scan", status: "completed" })
      .select("id")
      .single()
      .throwOnError();
    const tracked = competitors.map((c) => c.name);
    await db
      .from("visibility_results")
      .insert(
        answers.flatMap((names, i) =>
          MODELS.map((provider) => ({
            run_id: run.id,
            business_id: business.id,
            provider,
            created_at: new Date(Date.now() - 3_600_000).toISOString(),
            business_mentioned: names.includes("Sunrise Coffee Bar"),
            competitors_mentioned: names.filter((n) => tracked.includes(n)).map((name) => ({ name, position: 1 })),
            extracted_names: {
              promptVersion: "extract-names.v1",
              names: names.map((name, p) => ({ name, position: p + 1, matches: null, competitorName: null })),
            },
            cached: false,
            answer_text: `${provider} answer ${i}`,
          })),
        ),
      )
      .throwOnError();
  }

  await page.goto("/login?next=/competitors");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/competitors");
  // The dev server compiles the page on its first visit, which can take far longer than an assertion's 5s.
  await expect(page.getByRole("heading", { level: 1, name: "Competitors" })).toBeVisible({ timeout: 60_000 });
  return business.id;
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("leaderboard, Google side by side, and tracking a business AI keeps naming", async ({ page }) => {
  const businessId = await seed(page, {
    competitors: [
      { name: "Bean House", places_id: "ChIJ-fixture-bean-house" },
      { name: "The Daily Grind", places_id: "ChIJ-fixture-daily-grind" },
    ],
    // Per model: Bean House in 4 of 5 answers, you in 1, Daily Grind in 1, Blue Door Coffee in 3.
    answers: [
      ["Bean House", "Blue Door Coffee"],
      ["Bean House", "Blue Door Coffee", "Kiln Coffee Co"],
      ["Bean House", "Blue Door Coffee"],
      ["Bean House", "Sunrise Coffee Bar"],
      ["The Daily Grind"],
    ],
  });

  const board = page.getByTestId("leaderboard");
  await expect(board.getByRole("listitem")).toHaveText([/Bean House\s*80\s*You're behind/, /Sunrise Coffee Bar \(you\)\s*20/, /The Daily Grind\s*20\s*About the same/]);
  await expect(page.getByTestId("tracked-count")).toHaveText("2 of 5 tracked");

  await expect(page.getByTestId("signals-highlight")).toHaveText(
    "Bean House: 320 Google reviews, 4.7 stars. You: 12 reviews, 4.2 stars",
  );
  await expect(page.getByText("Google Maps", { exact: true })).toBeVisible();

  const also = page.getByTestId("also-recommended");
  await expect(also.getByRole("listitem")).toHaveText([/Blue Door Coffee\s*Named in 9 of 15 answers/, /Kiln Coffee Co\s*Named in 3 of 15 answers/]);
  await page.getByRole("button", { name: "Track Blue Door Coffee" }).click();
  await expect(page.getByText("Blue Door Coffee added to your competitors")).toBeVisible();
  await expect(board.getByRole("listitem").last()).toHaveText(/Blue Door Coffee\s*Checked from your next scan/);
  await expect(also.getByRole("listitem")).toHaveText([/Kiln Coffee Co/]);
  await expect(page.getByTestId("tracked-count")).toHaveText("3 of 5 tracked");

  // D-73: the saved list is names and place ids only, and loading the page stored nothing from Places.
  const { data } = await db
    .from("business_competitors")
    .select("name, places_id, source, formatted_address, category, phone, domain, city")
    .eq("business_id", businessId)
    .order("name")
    .throwOnError();
  expect(data).toEqual([
    { name: "Bean House", places_id: "ChIJ-fixture-bean-house", source: "confirmed_place", formatted_address: null, category: null, phone: null, domain: null, city: null },
    { name: "Blue Door Coffee", places_id: null, source: "manual", formatted_address: null, category: null, phone: null, domain: null, city: null },
    { name: "The Daily Grind", places_id: "ChIJ-fixture-daily-grind", source: "confirmed_place", formatted_address: null, category: null, phone: null, domain: null, city: null },
  ]);
});

test("no competitors and no scans: each section says what to do next", async ({ page }) => {
  await seed(page, { competitors: [], answers: [] });
  await expect(page.getByText("Add the businesses you compete with to see who AI recommends more often.")).toBeVisible();
  await expect(page.getByTestId("also-empty")).toHaveText("After your next scan, businesses AI names that you do not track show up here.");

  await page.getByRole("link", { name: "Add competitors" }).click();
  await page.waitForURL((url) => url.pathname === "/competitors/manage");
  await expect(page.getByRole("heading", { level: 1, name: "Manage competitors" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save competitors" }).filter({ visible: true }).click();
  await expect(page.getByText("1 competitor saved")).toBeVisible();
  await page.getByRole("link", { name: "Back to competitors" }).click();
  await expect(page.getByTestId("tracked-count")).toHaveText("1 of 5 tracked");
  await expect(page.getByText("Scores appear after your first scan.", { exact: false })).toBeVisible();
});

test("the old address sends people to the new page", async ({ page }) => {
  await seed(page, { competitors: [], answers: [] });
  await page.goto("/dashboard/competitors");
  await page.waitForURL((url) => url.pathname === "/competitors");
});
