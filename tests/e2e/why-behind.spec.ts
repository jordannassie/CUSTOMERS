import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// "Why you are behind" (Phase A): the Competitors "See why" panel, who won each question, fixes grouped by where you
// make them, and the Overview card. Everything comes from saved answers seeded here; Google values come from fixtures
// (PLACES_FIXTURES), and no scan, AI or Places call is made. Each test seeds its own is_test agency.
const local = existsSync(".env.test.local")
  ? parseEnv(readFileSync(".env.test.local", "utf8"))
  : {};
const hasDb = !!(
  local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY
);
test.skip(
  !hasDb,
  "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.",
);

const db = hasDb
  ? createClient(
      local.NEXT_PUBLIC_SUPABASE_URL!,
      local.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
  : null!;
const MODELS = ["openai", "anthropic", "perplexity"] as const;
const DAY = 86_400_000;
const SHOTS = process.env.E2E_SHOTS_DIR;
const userIds: string[] = [];

// Per model: Bean House in 4 of 5 answers, you in 1. Answers that named Bean House and not you cite Yelp and its site.
const ANSWERS = [
  {
    names: ["Bean House", "Blue Door Coffee"],
    sites: [
      "https://www.yelp.com/biz/bean-house",
      "https://beanhouse.example/menu",
    ],
  },
  {
    names: ["Bean House", "Blue Door Coffee"],
    sites: [
      "https://www.yelp.com/biz/bean-house",
      "https://beanhouse.example/",
    ],
  },
  { names: ["Bean House"], sites: ["https://yelp.com/search?q=coffee"] },
  {
    names: ["Bean House", "Sunrise Coffee Bar"],
    sites: ["https://sunrisecoffee.example/"],
  },
  { names: ["The Daily Grind"], sites: [] },
];

/** `scansHoursAgo`: one scan of the same answers per entry, so two or more draw the trend chart. */
async function seed(
  page: Page,
  next: string,
  scansHoursAgo: number[] = [1],
): Promise<string> {
  const email = `e2e-why-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency } = await db
    .from("agencies")
    .insert({
      owner_user_id: user.user.id,
      name: "Why test agency",
      is_test: true,
      status: "active",
    })
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
      domain: "sunrisecoffee.example",
      has_website: true,
      places_id: "ChIJ-fixture-sunrise-coffee",
      models: [...MODELS],
    })
    .select("id")
    .single()
    .throwOnError();
  await db
    .from("business_competitors")
    .insert(
      ["Bean House", "The Daily Grind"].map((name) => ({
        business_id: business.id,
        name,
        places_id:
          name === "Bean House"
            ? "ChIJ-fixture-bean-house"
            : "ChIJ-fixture-daily-grind",
        source: "confirmed_place",
        confirmed: true,
        // Tracked before the oldest seeded scan, as in real use.
        created_at: new Date(
          Date.now() -
            Math.max(2 * DAY, (Math.max(...scansHoursAgo) + 24) * 3_600_000),
        ).toISOString(),
      })),
    )
    .throwOnError();
  const { data: question } = await db
    .from("tracked_prompts")
    .insert({
      business_id: business.id,
      prompt: "Best coffee shop in Springfield, IL?",
      source: "library",
    })
    .select("id")
    .single()
    .throwOnError();
  const tracked = ["Bean House", "The Daily Grind"];
  for (const hoursAgo of scansHoursAgo) {
    const { data: run } = await db
      .from("visibility_runs")
      .insert({
        business_id: business.id,
        provider: "scan",
        status: "completed",
        explained_at: new Date().toISOString(),
      })
      .select("id")
      .single()
      .throwOnError();
    await db
      .from("visibility_results")
      .insert(
        ANSWERS.flatMap(({ names, sites }, i) =>
          MODELS.map((provider) => ({
            run_id: run.id,
            business_id: business.id,
            tracked_prompt_id: question.id,
            provider,
            // The first answer is the newest, so "See the answers" shows it.
            created_at: new Date(
              Date.now() - hoursAgo * 3_600_000 - i * 60_000,
            ).toISOString(),
            business_mentioned: names.includes("Sunrise Coffee Bar"),
            competitors_mentioned: names
              .filter((n) => tracked.includes(n))
              .map((name) => ({ name, position: 1 })),
            extracted_names: {
              promptVersion: "extract-names.v1",
              names: names.map((name, p) => ({
                name,
                position: p + 1,
                matches:
                  name === "Sunrise Coffee Bar"
                    ? "business"
                    : tracked.includes(name)
                      ? "competitor"
                      : null,
                competitorName: tracked.includes(name) ? name : null,
              })),
            },
            cited_sources: sites.map((url) => ({ url, title: null })),
            cached: false,
            answer_text: `${provider} answer ${i}: ${names.join(", ")}`,
          })),
        ),
      )
      .throwOnError();
  }
  await db
    .from("opportunities")
    .insert(
      [
        {
          title: "Ask your customers for Google reviews",
          evidence: "Bean House has more Google reviews than you.",
          impact: "high",
          category: "reviews_reputation",
        },
        {
          title: "Add a menu page to your website",
          evidence: "AI used beanhouse.example in 2 answers.",
          impact: "medium",
          category: "service_page",
          claude_prompt: "Draft a menu page.",
        },
        {
          title: "Check your Yelp listing",
          evidence: "AI used yelp.com in 3 answers that did not name you.",
          impact: "low",
          category: "citations",
        },
      ].map((o) => ({ ...o, business_id: business.id, status: "open" })),
    )
    .throwOnError();

  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === next.split("?")[0]);
  return business.id;
}

async function shot(page: Page, info: TestInfo, name: string) {
  if (SHOTS)
    await page.screenshot({
      path: `${SHOTS}/${name}-${info.project.name}.png`,
      fullPage: true,
    });
}

// Every screen here must load without console errors from our code.
const errors: string[] = [];
test.beforeEach(({ page }) => {
  errors.length = 0;
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
});
test.afterEach(() => {
  expect(errors).toEqual([]);
});

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("See why on a competitor: where they beat you, likely reasons, Google and fixes", async ({
  page,
}, info) => {
  await seed(page, "/competitors");
  await expect(
    page.getByRole("heading", { level: 1, name: "Competitors" }),
  ).toBeVisible({ timeout: 60_000 });
  const bean = page
    .getByTestId("leaderboard")
    .getByRole("listitem")
    .filter({ hasText: "Bean House" });
  await bean.getByTestId("see-why").click();
  const sheet = page.getByTestId("why-sheet");
  await expect(
    sheet.getByRole("heading", { name: /Bean House/ }),
  ).toBeVisible();
  await expect(sheet.getByTestId("why-versus")).toHaveText(
    /Bean House\s*12 of 15 answers\s*You\s*3 of 15 answers/,
  );
  await expect(sheet.getByTestId("questions-they-win")).toHaveText(
    /Best coffee shop in Springfield, IL\?\s*12\s*vs\s*3/,
  );
  const reasons = sheet.getByTestId("why-reasons").getByTestId("fact");
  await expect(reasons.first()).toHaveText(
    /AI used yelp.com when it picked them\s*9 answers without you. Check your listing there.\s*Fix on the sites AI uses/,
  );
  await expect(reasons.nth(1)).toHaveText(
    /AI quotes their website more\s*beanhouse.example in 6 answers, yours in 3.\s*Fix on your website/,
  );
  await expect(sheet.getByTestId("why-google")).toContainText(
    /Reviews\s*320\s*12/,
  );
  await expect(sheet.getByRole("img", { name: "Google Maps" })).toBeVisible();
  await expect(sheet).toContainText("Ask your customers for Google reviews");
  await shot(page, info, "competitors-see-why");
});

test("Questions show who AI named and the sites it used, and the answers list them", async ({
  page,
}, info) => {
  await seed(page, "/questions");
  const summary = page.getByTestId("question-summary");
  await expect(summary).toContainText(
    /AI named\s*Bean House\s*12\s*Blue Door Coffee\s*6\s*The Daily Grind\s*3/,
    { timeout: 60_000 },
  );
  await expect(summary).toContainText(
    /Sites used without you\s*yelp.com\s*9\s*beanhouse.example\s*6/,
  );
  await summary.getByRole("button", { name: "See the answers" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab")).toHaveCount(3);
  const answer = dialog.getByTestId("answer");
  await expect(answer.getByTestId("answer-named")).toHaveText(
    /Bean House\s*Blue Door Coffee/,
  );
  await expect(answer.getByTestId("answer-sites")).toContainText("yelp.com");
  await dialog.getByRole("tab", { name: /Claude/ }).click();
  await expect(dialog.getByRole("tabpanel")).toHaveAttribute(
    "data-model",
    "anthropic",
  );
  await shot(page, info, "questions");
});

test("Fixes are grouped by where you make them, and say which competitor they are about", async ({
  page,
}, info) => {
  await seed(page, "/opportunities");
  const list = page.getByTestId("list-open");
  await expect(list.getByTestId("group-google_listing")).toContainText(
    "Ask your customers for Google reviews",
    { timeout: 60_000 },
  );
  await expect(list.getByTestId("group-website")).toContainText(
    "Add a menu page to your website",
  );
  await expect(list.getByTestId("group-other_places")).toContainText(
    "Check your Yelp listing",
  );
  await expect(list.locator("section > header h2")).toHaveText([
    /Your Google listing/,
    /Your website/,
    /Other places AI looks/,
  ]);
  await expect(list.getByTestId("fix-about").first()).toHaveText(
    "About Bean House",
  );
  await shot(page, info, "opportunities");
});

test("The Overview says why the leading competitor is ahead and opens its panel", async ({
  page,
}, info) => {
  await seed(page, "/dashboard");
  const card = page.getByTestId("why-behind");
  await expect(card).toContainText("Why Bean House is ahead of you", {
    timeout: 60_000,
  });
  await expect(card).toContainText("AI used yelp.com when it picked them");
  await shot(page, info, "overview");
  await card.getByRole("link", { name: "See why" }).click();
  await expect(page.getByTestId("why-sheet")).toBeVisible({ timeout: 60_000 });
});

test("The shared report says the same likely reason, with no Google values in it", async ({
  page,
  browser,
}, info) => {
  const businessId = await seed(page, "/dashboard");
  const token =
    randomUUID().replace(/-/g, "") +
    randomUUID().replace(/-/g, "").slice(0, 11);
  await db
    .from("report_shares")
    .insert({ business_id: businessId, token })
    .throwOnError();
  // Opened by someone with no account, as a client would.
  const visitor = await browser.newPage();
  await visitor.goto(`/r/${token}`);
  const summary = visitor.getByTestId("report-summary");
  await expect(summary).toContainText(
    "A likely reason Bean House is ahead of you: AI used yelp.com in 9 answers that named Bean House and not you.",
    { timeout: 60_000 },
  );
  // The fixture's live Google numbers (320 reviews, 4.7 stars) never go into the summary text.
  await expect(summary).not.toContainText("320");
  await expect(summary).not.toContainText("4.7");
  await shot(visitor, info, "share-report");
  await visitor.close();
});

test("Competitors: the trend sits under the leaderboard and both columns end level", async ({
  page,
}, info) => {
  await seed(page, "/competitors", [8 * 24, 1]);
  await expect(page.getByTestId("competitor-trend-chart")).toBeVisible({
    timeout: 60_000,
  });
  await shot(page, info, "competitors-layout");
  // Side by side only on wide screens; on a phone the cards stack.
  if (info.project.name !== "desktop") return;
  const trend = await page
    .getByTestId("competitor-trend-chart")
    .locator("xpath=ancestor::*[@data-slot='card'][1]")
    .boundingBox();
  const also = await page
    .getByTestId("also-recommended")
    .locator("xpath=ancestor::*[@data-slot='card'][1]")
    .boundingBox();
  expect(
    Math.abs(trend!.y + trend!.height - (also!.y + also!.height)),
  ).toBeLessThan(2);
});

test("How is this calculated: score by AI, how we check, and accuracy said as how it improves", async ({
  page,
}, info) => {
  await seed(page, "/dashboard");
  await page.getByRole("button", { name: "How is this calculated?" }).click();
  const panel = page.getByTestId("score-details");
  await expect(panel).toContainText(/ChatGPT\s*20/, { timeout: 60_000 });
  await expect(
    panel.getByRole("heading", { name: "How we check" }),
  ).toBeVisible();
  await expect(panel.getByTestId("score-accuracy")).toContainText(
    "Gets sharper with every scan",
  );
  await expect(panel).not.toContainText("margin of error");
  await shot(page, info, "score-details");
});

test("Fix on ... opens the matching fixes, and is plain text when that group has none", async ({ page }) => {
  const businessId = await seed(page, "/dashboard");
  const card = page.getByTestId("why-behind");
  const link = card.getByRole("link", { name: "Fix on the sites AI uses" });
  await expect(link).toHaveAttribute("href", "/opportunities#fix-other_places", { timeout: 60_000 });
  await link.click();
  await page.waitForURL((url) => url.pathname === "/opportunities" && url.hash === "#fix-other_places");
  await expect(page.getByTestId("group-other_places")).toBeInViewport({ timeout: 30_000 });

  // With the website fix done, the website reason has nothing to open: plain text, no link.
  await db.from("opportunities").update({ status: "resolved" }).eq("business_id", businessId).eq("category", "service_page").throwOnError();
  await page.goto("/dashboard");
  await expect(card.getByTestId("fix-label")).toHaveText("Fix on your website", { timeout: 60_000 });
  await expect(card.getByRole("link", { name: "Fix on your website" })).toHaveCount(0);
  await expect(card.getByTestId("fix-link")).toHaveCount(1);
});

test("A fix picked on the Overview opens on Opportunities instead of the first one", async ({ page }) => {
  await seed(page, "/dashboard");
  await page.getByTestId("top-opportunities").getByRole("link", { name: "Check your Yelp listing" }).click({ timeout: 60_000 });
  await page.waitForURL((url) => url.pathname === "/opportunities" && url.searchParams.has("fix"));
  const card = (title: string) => page.getByTestId("opportunity").filter({ hasText: title });
  await expect(card("Check your Yelp listing").getByRole("button", { name: "Check your Yelp listing" })).toHaveAttribute("aria-expanded", "true", {
    timeout: 30_000,
  });
  await expect(card("Check your Yelp listing")).toBeInViewport();
  await expect(card("Ask your customers for Google reviews").getByRole("button", { name: "Ask your customers for Google reviews" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  // Arriving without a pick still opens the most important fix, as before.
  await page.goto("/opportunities");
  await expect(card("Ask your customers for Google reviews").getByRole("button", { name: "Ask your customers for Google reviews" })).toHaveAttribute(
    "aria-expanded",
    "true",
    { timeout: 30_000 },
  );
  await expect(card("Check your Yelp listing").getByRole("button", { name: "Check your Yelp listing" })).toHaveAttribute("aria-expanded", "false");
});
