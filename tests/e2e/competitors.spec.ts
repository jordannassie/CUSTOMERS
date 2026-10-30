import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

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
// Server Actions and the refresh after them can take several seconds on a busy dev server.
const ACTION = { timeout: 30_000 };

const DAY = 86_400_000;

type Seed = {
  competitors: { name: string; places_id: string | null; addedDaysAgo?: number }[];
  answers: string[][];
  /** One scan of the same answers per entry, in days before now. */
  scanDaysAgo?: number[];
};

async function seed(page: Page, { competitors, answers, scanDaysAgo = [1 / 24] }: Seed): Promise<string> {
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
        competitors.map(({ addedDaysAgo = 2, ...c }) => ({
          business_id: business.id,
          ...c,
          source: c.places_id ? "confirmed_place" : "manual",
          confirmed: true,
          // Tracked before the seeded scan, as in real use.
          created_at: new Date(Date.now() - addedDaysAgo * DAY).toISOString(),
        })),
      )
      .throwOnError();
  }
  // One suggested question for every answer: only suggested questions count in the score (BUG-129).
  const question = answers.length
    ? (
        await db
          .from("tracked_prompts")
          .insert({ business_id: business.id, prompt: "Best coffee shop in Springfield, IL?", source: "library" })
          .select("id")
          .single()
          .throwOnError()
      ).data
    : null;
  for (const daysAgo of answers.length ? scanDaysAgo : []) {
    const { data: run } = await db
      .from("visibility_runs")
      .insert({ business_id: business.id, provider: "scan", status: "completed" })
      .select("id")
      .single()
      .throwOnError();
    // A scan only looks for the competitors tracked when it ran.
    const tracked = competitors.filter((c) => (c.addedDaysAgo ?? 2) > daysAgo).map((c) => c.name);
    await db
      .from("visibility_results")
      .insert(
        answers.flatMap((names, i) =>
          MODELS.map((provider) => ({
            run_id: run.id,
            business_id: business.id,
            tracked_prompt_id: question!.id,
            provider,
            created_at: new Date(Date.now() - daysAgo * DAY).toISOString(),
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

/** Where every screenshot of a test run goes when E2E_SHOTS_DIR is set (layout reviews only). */
async function shot(page: Page, info: TestInfo, name: string) {
  if (process.env.E2E_SHOTS_DIR) await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR}/${name}-${info.project.name}.png`, fullPage: true });
}

// The leaderboard table's cells (dashboard redesign): the business name, its score and its status, one per row.
const names = (board: Locator) => board.getByTestId("leader-row").locator("td:nth-child(2) > span:first-child");
const scores = (board: Locator) => board.getByTestId("leader-row").locator("td:nth-child(3)");
const statuses = (board: Locator) => board.getByTestId("leader-row").locator("td:nth-last-child(2)");

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("a tracked branch that answers never name keeps its own name, scored by its chain's answers (BUG-132)", async ({ page }) => {
  // The saved answers never say "Congress": AI named the chain, so the number comes from the chain's answers. The row
  // is still named by the branch you track (2026-10-30: no "(all locations)").
  await seed(page, {
    competitors: [{ name: "Bean House on Congress", places_id: null }],
    answers: [["Bean House on Congress"], ["Bean House on Congress"], ["Sunrise Coffee Bar"]],
  });
  const board = page.getByTestId("leaderboard");
  await expect(board.getByTestId("leader-row").first()).toContainText("Bean House on Congress");
  await expect(board.getByTestId("leader-row").first()).not.toContainText("all locations");
  await expect(board.getByTestId("chain-note")).toHaveCount(0);
  // The chain row opens Compare too, under the branch's name.
  await board.getByTestId("leader-row").first().getByTestId("compare-link").click();
  await page.waitForURL((url) => url.pathname === "/competitors/compare" && url.searchParams.has("with"), { timeout: 60_000 });
  const compare = page.getByTestId("compare-page");
  await expect(compare.getByRole("heading", { level: 2, name: "You vs Bean House on Congress" })).toBeVisible({ timeout: 60_000 });
  await expect(compare.getByTestId("why-chain-note")).toHaveCount(0);
  await expect(compare.getByTestId("why-versus")).toContainText("Bean House");
});

test("leaderboard, Google side by side, and tracking a business AI keeps naming", async ({ page }, info) => {
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
  await expect(names(board)).toHaveText(["Bean House", "Sunrise Coffee Bar (you)", "The Daily Grind"]);
  await expect(scores(board)).toHaveText(["80", "20", "20"]);
  await expect(statuses(board)).toHaveText(["You're behind", "", "About the same"]);
  // Each competitor opens on Compare; your own row has no link.
  await expect(board.getByTestId("leader-row").nth(0).getByTestId("compare-link")).toHaveAttribute("href", /^\/competitors\/compare\?with=[0-9a-f-]{36}$/);
  await expect(board.getByTestId("leader-row").nth(1).getByTestId("compare-link")).toHaveCount(0);
  await expect(page.getByTestId("tracked-count")).toHaveText("(2 of 5)");
  // The wide table scrolls inside its card: the page itself is never wider than the screen, at 390px too.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByTestId("kpi-leader")).toContainText("Bean House");

  // Google is asked only when the owner presses "Show Google details" (2026-10-27).
  await expect(page.getByTestId("signals-highlight")).toHaveCount(0);
  await expect(page.getByTestId("show-google")).toBeVisible();
  await page.getByTestId("show-google-button").click();
  await page.waitForURL((url) => url.pathname === "/competitors" && url.searchParams.get("google") === "1");
  await expect(page.getByTestId("signals-highlight")).toHaveText(
    "Bean House: 320 Google reviews, 4.7 stars. You: 12 reviews, 4.2 stars",
  );
  await expect(page.getByRole("img", { name: "Google Maps" })).toBeVisible();

  const also = page.getByTestId("also-recommended");
  await expect(also.getByRole("listitem")).toHaveText([/Blue Door Coffee\s*Named in 9 of 15 answers/, /Kiln Coffee Co\s*Named in 3 of 15 answers/]);
  await shot(page, info, "competitors");
  await page.getByRole("button", { name: "Track Blue Door Coffee" }).click();
  await expect(page.getByText("Blue Door Coffee added to your competitors")).toBeVisible(ACTION);
  // Saved answers are checked for it at once (BUG-122): 9 of the 15 answers named it.
  await expect(board.getByTestId("leader-row").filter({ hasText: "Blue Door Coffee" }).locator("td:nth-child(3)")).toHaveText("60", ACTION);
  await expect(also.getByRole("listitem")).toHaveText([/Kiln Coffee Co/]);
  await expect(page.getByTestId("tracked-count")).toHaveText("(3 of 5)");

  // D-73: the saved list is names and place ids only, and loading the page stored nothing from Places.
  const { data } = await db
    .from("business_competitors")
    .select("name, places_id, source, formatted_address, category, phone, domain, city")
    .eq("business_id", businessId)
    .order("name")
    .throwOnError();
  expect(data).toEqual([
    { name: "Bean House", places_id: "ChIJ-fixture-bean-house", source: "confirmed_place", formatted_address: null, category: null, phone: null, domain: null, city: null },
    // Tracking a business AI named looks up its listing and keeps only the place id (step 9c, 2026-10-13).
    { name: "Blue Door Coffee", places_id: "ChIJ-fixture-blue-door", source: "manual", formatted_address: null, category: null, phone: null, domain: null, city: null },
    { name: "The Daily Grind", places_id: "ChIJ-fixture-daily-grind", source: "confirmed_place", formatted_address: null, category: null, phone: null, domain: null, city: null },
  ]);
});

test("a competitor added partway through the 30 days is still collecting, with no ahead or behind (F-53)", async ({ page }) => {
  await seed(page, {
    competitors: [
      { name: "Bean House", places_id: "ChIJ-fixture-bean-house", addedDaysAgo: 20 },
      { name: "Blue Door Coffee", places_id: null, addedDaysAgo: 5 },
    ],
    // Per scan and model: Bean House in 4 of 5 answers, you in 1, Blue Door Coffee in 3.
    answers: [
      ["Bean House", "Blue Door Coffee"],
      ["Bean House", "Blue Door Coffee"],
      ["Bean House", "Blue Door Coffee"],
      ["Bean House", "Sunrise Coffee Bar"],
      ["Kiln Coffee Co"],
    ],
    scanDaysAgo: [10, 1 / 24],
  });

  // Blue Door was only looked for in the second scan, so 3 of 10 answers, not 3 of 5.
  const board = page.getByTestId("leaderboard");
  await expect(names(board)).toHaveText(["Bean House", "Sunrise Coffee Bar (you)", "Blue Door Coffee"]);
  await expect(scores(board)).toHaveText(["80", "20", "30"]);
  await expect(statuses(board)).toHaveText(["You're behind", "", "New, still collecting"]);
  await expect(board.getByTestId("standing")).toHaveCount(1);
  await expect(board.getByTestId("collecting")).toHaveCount(1);
  await expect(page.getByTestId("collecting-note")).toBeVisible();
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
  await expect(page.getByText("1 competitor saved")).toBeVisible(ACTION);
  await page.getByRole("link", { name: "Back to competitors" }).click();
  await expect(page.getByTestId("tracked-count")).toHaveText("(1 of 5)", ACTION);
  await expect(page.getByText("Scores appear after your first scan.", { exact: false })).toBeVisible();
});

test("a Google page-title name is added on its brand, with the long name kept as another name (2026-10-15)", async ({ page }) => {
  const businessId = await seed(page, { competitors: [], answers: [] });
  await page.goto("/competitors/manage");
  await expect(page.getByRole("heading", { level: 1, name: "Manage competitors" })).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Competitor name").fill("BeRejuved");
  await page.getByRole("button", { name: "Find" }).click();
  await page.getByRole("button", { name: "Add BeRejuved Medical Spa & Wellness Studio - NYC" }).click();

  const picked = page.getByRole("list", { name: "Picked competitors" });
  await expect(picked.getByText("BeRejuved Medical Spa & Wellness Studio", { exact: true })).toBeVisible();
  await expect(picked.getByTestId("google-full-name")).toContainText("Google: BeRejuved Medical Spa & Wellness Studio - NYC");
  // A long name in the list never widens the page on a phone (2026-10-15).
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole("button", { name: "Save competitors" }).filter({ visible: true }).click();
  await expect(page.getByText("1 competitor saved")).toBeVisible(ACTION);

  const { data } = await db.from("business_competitors").select("name, aliases").eq("business_id", businessId).throwOnError();
  expect(data).toEqual([{ name: "BeRejuved Medical Spa & Wellness Studio", aliases: ["BeRejuved Medical Spa & Wellness Studio - NYC"] }]);
});

test("the old address sends people to the new page", async ({ page }) => {
  await seed(page, { competitors: [], answers: [] });
  await page.goto("/dashboard/competitors");
  await page.waitForURL((url) => url.pathname === "/competitors");
});
