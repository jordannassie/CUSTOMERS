import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// "Why you are behind" (Phase A, moved by the dashboard redesign, D-86): the leaderboard's top reason, Compare's reason
// cards and tabs, Add to Actions and the Actions board, and the Overview. Everything comes from saved answers seeded here; Google values come from fixtures
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
    sites: ["https://sunrise-coffee.example/"],
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
      domain: "sunrise-coffee.example",
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
  // What setup read on the business's own website, so "Check their website" has something to compare with.
  await db
    .from("business_site_facts")
    .insert({
      business_id: business.id,
      data: {
        pages: [{ path: "/", status: "ok" }],
        facts: { phone: "(217) 555-0142", address: "120 Main St", services: ["pour-over coffee", "espresso drinks", "pastries"] },
        contact: { hasPhone: true, hasAddress: true },
      },
    })
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
            // The first answer is the newest, so the opened question shows it.
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

async function competitorId(businessId: string, name: string): Promise<string> {
  const { data } = await db.from("business_competitors").select("id").eq("business_id", businessId).eq("name", name).single().throwOnError();
  return data.id;
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

test("Competitors names the leader's top reason, and Compare shows every fact with its fix, a tab for each kind of evidence", async ({ page }, info) => {
  const businessId = await seed(page, "/competitors");
  const bean = await competitorId(businessId, "Bean House");
  await expect(page.getByRole("heading", { level: 1, name: "Competitors" })).toBeVisible({ timeout: 60_000 });
  // Share of AI picks: your share as the headline, no hover card over it (2026-10-27).
  await expect(page.getByTestId("share-you")).toHaveText("17%");
  await expect(page.getByTestId("share-of-voice-chart")).toContainText("Bean House leads with 67%");
  // Heat map: a row per business, a column per AI, the top score in each column marked.
  const heat = page.getByTestId("model-comparison-chart");
  await expect(heat.getByRole("row").filter({ hasText: "You" })).toContainText(/You\s*20/);
  await expect(heat.getByRole("row").filter({ hasText: "Bean House" })).toContainText(/Bean House\s*80\s*Top/);
  // Donut: hovering a row shows that business in the middle; you are back when the pointer leaves.
  const donut = page.getByTestId("share-of-voice-chart");
  await donut.getByTestId("share-row").filter({ hasText: "Bean House" }).hover();
  await expect(donut.getByTestId("share-focus")).toHaveText("67%");
  await page.mouse.move(0, 0);
  await expect(donut.getByTestId("share-you")).toHaveText("17%");
  // The leaderboard says the leader's biggest likely reason, and opens Compare for the rest (D-86).
  const row = page.getByTestId("leaderboard").getByTestId("leader-row").filter({ hasText: "Bean House" });
  await expect(row.getByTestId("top-reason")).toHaveText("Top reason: AI used yelp.com when it picked them");
  await row.getByTestId("compare-link").click();
  await page.waitForURL((url) => url.pathname === "/competitors/compare" && url.searchParams.get("with") === bean, { timeout: 60_000 });

  const compare = page.getByTestId("compare-page");
  await expect(compare.getByRole("heading", { level: 2, name: "You vs Bean House" })).toBeVisible({ timeout: 60_000 });
  await expect(compare.getByTestId("why-versus")).toHaveText(/You\s*20\s*3 of 15 answers\s*Bean House\s*80\s*12 of 15 answers/);
  await expect(compare.getByTestId("gap")).toHaveText("60 pts behind");
  await expect(compare.getByTestId("by-ai")).toContainText("ChatGPT");
  // Never wider than the screen, at 390px too: the tab row scrolls on its own.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  // Why ahead or behind (the first tab): every likely reason as a card, biggest first, with what to do and where.
  const reasons = compare.getByTestId("tab-summary").getByTestId("reason-card");
  await expect(reasons.first()).toContainText("AI used yelp.com when it picked them");
  const yelp = reasons.filter({ hasText: "AI used yelp.com when it picked them" });
  await expect(yelp.getByTestId("reason-basis")).toHaveText("Based on 9 answers");
  await expect(yelp.getByTestId("fix-action")).toContainText("Claim or update your listing on yelp.com");
  await expect(yelp.getByTestId("fix-where")).toHaveText("Where: yelp.com");
  await expect(reasons.filter({ hasText: "AI quotes their website more" })).toHaveCount(1);
  // Google lives on the Google tab only (2026-10-29): nothing about Google on this one.
  await expect(reasons.filter({ hasText: "More Google reviews" })).toHaveCount(0);
  await expect(compare.getByTestId("tab-summary").getByTestId("show-google")).toHaveCount(0);
  await shot(page, info, "compare-summary");
  // Google reasons wait for "Show Google details" (2026-10-27): Google is asked only on request, for this view.
  await compare.getByTestId("compare-tab-google").click();
  await compare.getByTestId("tab-google").getByTestId("show-google-button").click();
  await page.waitForURL((url) => url.searchParams.get("google") === "1");
  // They show Google's live values (D-73), and what Add to Actions saves leaves them out.
  const googleReasons = compare.getByTestId("tab-google").getByTestId("reason-card");
  const reviews = googleReasons.filter({ hasText: "More Google reviews" });
  await expect(reviews).toContainText("320", { timeout: 60_000 });
  await expect(reviews.getByTestId("reason-basis")).toHaveText("Based on Google's listing");
  // The reviews reason has a scan fix already ("Ask your customers for Google reviews"): it moves that fix, no copy.
  await expect(reviews.getByTestId("in-actions")).toHaveText("In Actions · Suggested");
  await reviews.getByTestId("move-to-todo").click();
  await expect(reviews.getByTestId("in-actions")).toHaveText("In Actions · To do", { timeout: 30_000 });
  const moved = await db.from("opportunities").select("status").eq("business_id", businessId).eq("title", "Ask your customers for Google reviews").single().throwOnError();
  expect(moved.data!.status).toBe("todo");
  expect((await db.from("opportunities").select("id").eq("business_id", businessId).eq("dedupe_key", "google:reviews")).data).toEqual([]);
  // A Google reason with no saved fix adds one, and what it saves leaves Google's values out.
  const hours = googleReasons.filter({ hasText: "Open more days on Google" });
  await hours.getByTestId("add-to-actions").click();
  await expect(hours.getByTestId("in-actions")).toHaveText("In Actions · To do");
  const saved = await db.from("opportunities").select("evidence, recommended_action").eq("business_id", businessId).eq("dedupe_key", "google:hours").single().throwOnError();
  expect(`${saved.data!.evidence} ${saved.data!.recommended_action}`).not.toMatch(/\b[67]\b|320|4\.7/);
  await shot(page, info, "compare-google");

  // Questions: each question, how many answers named each of you, and who won it.
  await compare.getByTestId("compare-tab-questions").click();
  await expect(page).toHaveURL(/tab=questions/);
  await expect(compare.getByTestId("compare-question")).toHaveText(/Best coffee shop in Springfield, IL\?\s*12 of 15\s*3 of 15\s*They win/);

  // Where AI looked: each site the answers used, them against you.
  await compare.getByTestId("compare-tab-sources").click();
  await expect(page).toHaveURL(/tab=sources/);
  const sites = compare.getByTestId("compare-site");
  await expect(sites.filter({ hasText: "yelp.com" })).toHaveText(/yelp.com\s*9\s*9\s*0\s*They win/);
  await expect(sites.filter({ hasText: "beanhouse.example" })).toHaveText(/beanhouse.example\s*6\s*6\s*0\s*They win/);
  await shot(page, info, "compare-sources");

  await compare.getByTestId("compare-tab-google").click();
  await expect(compare.getByTestId("why-google")).toContainText(/Reviews\s*320\s*12/, { timeout: 60_000 });
  // Each tab has its own address, so Back returns to the one before.
  await page.goBack();
  await expect(page).toHaveURL(/tab=sources/);
  await expect(compare.getByTestId("tab-sources")).toBeVisible();
  await expect(compare.getByTestId("why-google")).toBeHidden();
});

test("Questions show who AI named and the sites it used, and the answers list them", async ({
  page,
}, info) => {
  await seed(page, "/questions");
  const summary = page.getByTestId("question-summary");
  // The row names the business AI named most and the sites it used without you (dashboard redesign, Questions).
  await expect(summary).toContainText(/Top pick:\s*Bean House/, { timeout: 60_000 });
  await expect(summary).toContainText(/Sites AI used when it skipped you:\s*yelp.com, beanhouse.example/);
  // The question opens in place, with each AI's answer in a tab.
  const row = page.getByTestId("question-row").filter({ has: summary });
  await row.getByTestId("question-text").click();
  const details = row.getByTestId("question-details");
  await expect(details.getByRole("tab")).toHaveCount(3, { timeout: 30_000 });
  const answer = details.getByTestId("answer");
  await expect(answer.getByTestId("answer-named")).toContainText("Bean House");
  await expect(answer.getByTestId("answer-named")).toContainText("Blue Door Coffee");
  await expect(answer.getByTestId("answer-sites")).toContainText("yelp.com");
  await details.getByRole("tab", { name: /Claude/ }).click();
  await expect(details.getByRole("tabpanel")).toHaveAttribute(
    "data-model",
    "anthropic",
  );
  await shot(page, info, "questions");
});

test("Actions say where each fix is made and which competitor it is about", async ({ page }, info) => {
  const businessId = await seed(page, "/actions");
  const bean = await competitorId(businessId, "Bean House");
  const card = (title: string) => page.getByTestId("opportunity").filter({ hasText: title });
  await expect(card("Ask your customers for Google reviews").getByTestId("action-where")).toHaveText("Google Business Profile", { timeout: 60_000 });
  await expect(card("Add a menu page to your website").getByTestId("action-where")).toHaveText("Your website");
  await expect(card("Check your Yelp listing").getByTestId("action-where")).toHaveText("yelp.com");
  // A scan's fixes are suggestions, most important first.
  await expect(page.getByTestId("column-suggested").getByRole("heading", { level: 3 })).toHaveText([
    "Ask your customers for Google reviews",
    "Add a menu page to your website",
    "Check your Yelp listing",
  ]);
  // The competitor a fix is about opens on Compare.
  await expect(card("Ask your customers for Google reviews").getByRole("link", { name: "Bean House" })).toHaveAttribute(
    "href",
    `/competitors/compare?with=${bean}`,
  );
  await shot(page, info, "actions");
  // Where each fix is made, counted in the three groups, and one click shows only that group.
  const counts = page.getByTestId("place-counts");
  await expect(counts.getByRole("button")).toHaveText(["Website 1", "Google Business Profile 1", "Other places 1"]);
  await counts.getByRole("button", { name: "Other places 1" }).click();
  await expect(page.getByTestId("opportunity")).toHaveCount(1);
  await expect(page.getByTestId("opportunity")).toContainText("Check your Yelp listing");
});

test("The Overview shows where you stand and opens the competitor who leads", async ({ page }, info) => {
  const businessId = await seed(page, "/dashboard");
  const stand = page.getByTestId("where-you-stand");
  await expect(stand.getByRole("listitem").first()).toHaveText(/Bean House\s*80\s*You're behind/, { timeout: 60_000 });
  await expect(stand.getByRole("listitem").filter({ hasText: "(you)" })).toContainText("20");
  await shot(page, info, "overview");
  await stand.getByRole("link", { name: "All competitors" }).click();
  await page.waitForURL((url) => url.pathname === "/competitors", { timeout: 60_000 });
  // The leader's likely reason is on its row, and Compare has the rest.
  const row = page.getByTestId("leaderboard").getByTestId("leader-row").first();
  await expect(row).toContainText("Bean House", { timeout: 60_000 });
  await expect(row.getByTestId("top-reason")).toHaveText("Top reason: AI used yelp.com when it picked them");
  await row.getByTestId("compare-link").click();
  await page.waitForURL((url) => url.pathname === "/competitors/compare", { timeout: 60_000 });
  expect(new URL(page.url()).searchParams.get("with")).toBe(await competitorId(businessId, "Bean House"));
  await expect(page.getByTestId("compare-page").getByRole("heading", { level: 2, name: "You vs Bean House" })).toBeVisible({ timeout: 60_000 });
});

test("Competitors: the trend chart draws a line for you and each competitor", async ({ page }, info) => {
  await seed(page, "/competitors", [8 * 24, 1]);
  const trend = page.getByTestId("competitor-trend-chart");
  await expect(trend).toBeVisible({ timeout: 60_000 });
  // Two scans, so each business has a line to draw (you, Bean House, The Daily Grind), plus your 30-day score.
  await expect(trend.locator("svg .recharts-line-curve")).toHaveCount(4, { timeout: 30_000 });
  await expect(trend.getByTestId("chart-legend")).toContainText("Bean House");
  await shot(page, info, "competitors-layout");
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

test("Each reason says what to do and where; a reason with a saved fix moves that fix, and Add to Actions adds once", async ({ page }) => {
  const businessId = await seed(page, "/competitors");
  const bean = await competitorId(businessId, "Bean House");
  const scanFix = await db.from("opportunities").select("id").eq("business_id", businessId).eq("title", "Check your Yelp listing").single().throwOnError();
  await page.goto(`/competitors/compare?with=${bean}`);
  const reasons = page.getByTestId("tab-summary").getByTestId("reason-card");
  const yelp = reasons.filter({ hasText: "AI used yelp.com when it picked them" });
  await expect(yelp.getByTestId("reason-basis")).toHaveText("Based on 9 answers", { timeout: 60_000 });
  await expect(yelp.getByTestId("fix-where")).toHaveText("Where: yelp.com");
  await expect(yelp.getByTestId("fix-action")).toContainText("Claim or update your listing on yelp.com");

  // The scan already saved a fix for this reason ("Check your Yelp listing"): the card says so and links to it.
  await expect(yelp.getByTestId("in-actions")).toHaveText("In Actions · Suggested");
  await expect(yelp.getByTestId("in-actions")).toHaveAttribute("href", `/actions?fix=${scanFix.data.id}`);
  await expect(yelp.getByTestId("add-to-actions")).toHaveCount(0);
  // "Move to To do" moves that fix; nothing is copied, and it stays that way after a reload.
  await yelp.getByTestId("move-to-todo").click();
  await expect(yelp.getByTestId("in-actions")).toHaveText("In Actions · To do", { timeout: 30_000 });
  await expect(page.getByText("Moved to To do.")).toBeVisible();
  await page.reload();
  await expect(yelp.getByTestId("in-actions")).toHaveText("In Actions · To do", { timeout: 60_000 });
  await expect(yelp.getByTestId("move-to-todo")).toHaveCount(0);
  const moved = await db.from("opportunities").select("id, status").eq("business_id", businessId).ilike("title", "%yelp%").throwOnError();
  expect(moved.data).toEqual([{ id: scanFix.data.id, status: "todo" }]);
  const copies = await db.from("opportunities").select("id").eq("business_id", businessId).eq("dedupe_key", "site:yelp.com").throwOnError();
  expect(copies.data).toEqual([]);

  // A reason with no saved fix (the website one) has its own step, and Add to Actions puts it in To do once.
  const website = reasons.filter({ hasText: "AI quotes their website more" });
  await expect(website.getByTestId("fix-action")).toContainText("own clear page");
  await expect(website.getByTestId("in-actions")).toHaveCount(0);
  await website.getByTestId("add-to-actions").click();
  await expect(website.getByTestId("in-actions")).toHaveText("In Actions · To do", { timeout: 30_000 });
  await expect(page.getByText("Added to Actions, in To do.")).toBeVisible();
  await page.reload();
  await expect(website.getByTestId("in-actions")).toHaveText("In Actions · To do", { timeout: 60_000 });
  await expect(website.getByTestId("add-to-actions")).toHaveCount(0);
  const added = await db.from("opportunities").select("status").eq("business_id", businessId).eq("dedupe_key", "web:quoted").throwOnError();
  expect(added.data).toEqual([{ status: "todo" }]);

  // The Yelp reason opens the scan's fix on the board, in To do, picked out and on screen.
  await yelp.getByTestId("in-actions").click();
  await page.waitForURL((url) => url.pathname === "/actions" && url.searchParams.get("fix") === scanFix.data.id, { timeout: 60_000 });
  const todo = page.getByTestId("column-todo").getByTestId("opportunity").filter({ hasText: "Check your Yelp listing" });
  await expect(todo).toHaveCount(1, { timeout: 60_000 });
  await expect(todo).toHaveAttribute("data-status", "todo");
  await expect(todo.getByTestId("action-where")).toHaveText("yelp.com");
  await expect(todo.getByRole("button", { name: "Check your Yelp listing", exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(todo).toHaveClass(/border-primary/);
  await expect(todo).toBeInViewport();
});

test("A fix picked on the Overview opens on Actions, picked out, and no other one is", async ({ page }) => {
  await seed(page, "/dashboard");
  await page.getByTestId("top-opportunities").getByRole("link", { name: "Check your Yelp listing" }).click({ timeout: 60_000 });
  await page.waitForURL((url) => url.pathname === "/actions" && url.searchParams.has("fix"), { timeout: 60_000 });
  const card = (title: string) => page.getByTestId("opportunity").filter({ hasText: title });
  const toggle = (title: string) => card(title).getByRole("button", { name: title, exact: true });
  await expect(toggle("Check your Yelp listing")).toHaveAttribute("aria-expanded", "true", { timeout: 30_000 });
  await expect(card("Check your Yelp listing")).toHaveClass(/border-primary/);
  await expect(card("Check your Yelp listing")).toBeInViewport();
  await expect(toggle("Ask your customers for Google reviews")).toHaveAttribute("aria-expanded", "false");
  await expect(card("Ask your customers for Google reviews")).not.toHaveClass(/border-primary/);

  // An old Opportunities link to the same fix lands on it too.
  const id = new URL(page.url()).searchParams.get("fix")!;
  await page.goto(`/opportunities?fix=${id}`);
  await page.waitForURL((url) => url.pathname === "/actions" && url.searchParams.get("fix") === id);
  await expect(toggle("Check your Yelp listing")).toHaveAttribute("aria-expanded", "true", { timeout: 30_000 });

  // Arriving without a pick, nothing is picked out.
  await page.goto("/actions");
  await expect(toggle("Ask your customers for Google reviews")).toHaveAttribute("aria-expanded", "false", { timeout: 30_000 });
  await expect(toggle("Check your Yelp listing")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("[data-testid=opportunity].border-primary")).toHaveCount(0);
});

test("Check their website: on Compare's Website tab only, read once, compared side by side with quotes", async ({ page }, info) => {
  // One project only: both would share the one fixture site, and a check is kept for everyone.
  test.skip(info.project.name !== "desktop", "The website check runs once, on desktop.");
  // Both sites are read on the first check: theirs, and yours the same way (fixture sites, no real reads).
  await db.from("website_facts").delete().in("domain", ["beanhouse.example", "sunrise-coffee.example"]).throwOnError();
  const businessId = await seed(page, "/competitors");
  const bean = await competitorId(businessId, "Bean House");
  // An old link to the Websites tab lands on Compare's Website tab (D-86).
  await page.goto(`/competitors/${bean}?tab=websites`);
  await page.waitForURL((url) => url.pathname === "/competitors/compare" && url.searchParams.get("with") === bean && url.searchParams.get("tab") === "website", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("compare-tab-website")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: "Check their website" })).toHaveAttribute("href", `/competitors/compare?with=${bean}&tab=website`);
  const tab = page.getByTestId("tab-websites");
  // Found from the AI answers that cited it, so the owner only presses the button.
  await expect(tab.getByTestId("check-website")).toContainText("beanhouse.example", { timeout: 60_000 });
  await tab.getByTestId("check-website-button").click();
  await expect(tab.getByTestId("their-services")).toContainText("Office catering", { timeout: 60_000 });
  await expect(tab.getByTestId("their-services").getByTestId("service-row").filter({ hasText: "Office catering" })).toContainText("Not on your site");
  await expect(tab.getByTestId("check-website")).toContainText(/beanhouse.example\s*·\s*checked/);
  await expect(tab.getByTestId("check-website-button")).toHaveCount(0);

  // At a glance: checks each site passes, and the things customers ask about each one says.
  const score = tab.getByTestId("website-score");
  await expect(score).toContainText(/What AI tools can find\s*Bean House\s*6 of 6\s*You\s*0 of 6/);
  await expect(score).toContainText(/Things customers ask about\s*Bean House\s*2 of 11\s*You\s*0 of 11/);
  // Step 1: what each site shows AI tools. The fixture robots.txt on yours turns GPTBot and ClaudeBot away.
  const table = tab.getByTestId("website-compare");
  await expect(table.getByRole("row", { name: /Lets AI tools read it/ }).getByLabel("Yes")).toHaveCount(1);
  await expect(table.getByRole("row", { name: /FAQ section/ }).getByLabel("Not found")).toHaveCount(1);
  // What their website says: each claim side by side, with their words, tidied for reading.
  const claims = tab.getByTestId("website-claims");
  const years = claims.getByTestId("claim-row").filter({ hasText: "Years in business" });
  await expect(years).toContainText("“Roasting since 2009.”");
  await expect(years).toContainText("Home page");
  await expect(years.getByLabel("Says it")).toHaveCount(1);
  await expect(years.getByLabel("Not found")).toHaveCount(1);
  await expect(claims.getByTestId("claim-row").filter({ hasText: "Free estimates" })).toContainText("free quotes for teams");

  // Open a service for both websites' words; the claims stay on screen. "Show all quotes" opens every row, then closes them.
  const services = tab.getByTestId("their-services");
  const catering = services.getByRole("button", { name: /Office catering/ });
  await expect(catering).toHaveAttribute("aria-expanded", "false");
  await catering.click();
  await expect(catering).toHaveAttribute("aria-expanded", "true");
  const one = services.getByTestId("service-row").filter({ hasText: "Office catering" });
  await expect(one).toContainText("Office catering for teams of 10 to 200");
  await expect(one).toContainText("/services page");
  await expect(one).toContainText("Not found on the pages we read of yours.");
  await expect(tab.getByTestId("website-claims")).toBeVisible();
  await services.getByRole("button", { name: "Show all quotes" }).click();
  await expect(services.getByRole("button", { expanded: false })).toHaveCount(0);
  await services.getByRole("button", { name: "Hide quotes" }).click();
  await expect(services.getByRole("button", { expanded: true })).toHaveCount(0);
  await catering.click();
  await shot(page, info, "compare-websites");

  // Steps 1 and 2 add likely reasons on the first tab, each with its fix.
  await page.getByTestId("compare-tab-summary").click();
  const why = page.getByTestId("tab-summary");
  await expect(why.getByTestId("reason-card").filter({ hasText: "Their website lists office catering" })).toContainText("Based on the website check", { timeout: 60_000 });
  await expect(why).toContainText("Your website blocks some AI tools");
  await expect(why).toContainText("GPTBot and ClaudeBot");
  await expect(why).toContainText("Their website says years in business");
  await shot(page, info, "compare-website-reasons");

  // Read once (D-85): reload, and no screen offers to read it again; the record is unchanged.
  const before = (await db.from("website_facts").select("fetched_at").eq("domain", "beanhouse.example").single().throwOnError()).data.fetched_at;
  await page.goto(`/competitors/compare?with=${bean}&tab=website`);
  await expect(page.getByTestId("tab-websites").getByTestId("check-website")).toContainText("checked", { timeout: 60_000 });
  await expect(page.getByTestId("check-website-button")).toHaveCount(0);
  // The header now says the website was checked instead of offering a scan, on every tab.
  await page.goto(`/competitors/compare?with=${bean}`);
  // and opens their website itself, in a new tab.
  const visit = page.getByRole("link", { name: "Their website (opens in a new tab)" });
  await expect(visit).toBeVisible({ timeout: 60_000 });
  await expect(visit).toHaveAttribute("href", "https://beanhouse.example");
  await expect(visit).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: "Check their website" })).toHaveCount(0);
  await expect(page.getByTestId("check-website-button")).toHaveCount(0);
  const after = (await db.from("website_facts").select("fetched_at").eq("domain", "beanhouse.example").single().throwOnError()).data.fetched_at;
  expect(after).toBe(before);

  // Saved once for every business, with the page and the words it came from, and nothing from Google.
  const { data } = await db.from("website_facts").select("domain, data").in("domain", ["beanhouse.example", "sunrise-coffee.example"]).throwOnError();
  expect(data.map((r) => r.domain).sort()).toEqual(["beanhouse.example", "sunrise-coffee.example"]);
  const saved = data.find((r) => r.domain === "beanhouse.example")!.data as { status: string; services: { name: string; page: string | null }[] };
  expect(saved.status).toBe("read");
  expect(saved.services).toContainEqual(expect.objectContaining({ name: "office catering", page: "/services" }));
  expect(JSON.stringify(saved)).not.toMatch(/rating|review_count|place_id/i);
  // Kept for everyone: leave nothing behind for the other tests.
  await db.from("website_facts").delete().in("domain", ["beanhouse.example", "sunrise-coffee.example"]).throwOnError();
});

test("Compare's Website tab says what is known of each competitor's website, and asks for an unknown address", async ({ page }) => {
  const businessId = await seed(page, "/competitors");
  const [bean, grind] = await Promise.all([competitorId(businessId, "Bean House"), competitorId(businessId, "The Daily Grind")]);
  // Found from the AI answers that cited it, not checked yet: the header offers the scan.
  await page.goto(`/competitors/compare?with=${bean}&tab=website`);
  await expect(page.getByTestId("tab-websites").getByTestId("check-website")).toContainText("beanhouse.example", { timeout: 60_000 });
  await expect(page.getByRole("link", { name: "Check their website" })).toBeVisible();
  // No website known yet: the tab asks for it. Old links to the Websites tab land here too.
  await page.goto(`/competitors/${grind}?tab=websites`);
  await page.waitForURL((url) => url.pathname === "/competitors/compare" && url.searchParams.get("with") === grind, { timeout: 60_000 });
  await expect(page.getByTestId("tab-websites").getByRole("textbox", { name: "Website for The Daily Grind" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("check-website-button")).toHaveCount(0);
});

test("See the answers on a Compare reason opens the answers it counts, not an empty list", async ({ page }, info) => {
  const businessId = await seed(page, "/competitors");
  const bean = await competitorId(businessId, "Bean House");
  await page.goto(`/competitors/compare?with=${bean}`);
  const yelp = page.getByTestId("tab-summary").getByTestId("reason-card").filter({ hasText: "AI used yelp.com when it picked them" });
  await expect(yelp.getByTestId("reason-basis")).toHaveText("Based on 9 answers", { timeout: 60_000 });
  await yelp.getByRole("link", { name: "See the answers" }).click();
  await page.waitForURL((url) => url.pathname === "/questions" && url.searchParams.get("site") === "yelp.com" && url.searchParams.get("named") === "Bean House");
  // The same 9 answers the card counts, at the top, the newest open with its text and why you were skipped.
  const found = page.getByTestId("focus-answers");
  await expect(found.getByRole("heading", { level: 2 })).toHaveText("9 answers that used yelp.com and named Bean House, not you", { timeout: 60_000 });
  const first = found.getByTestId("focus-answer").first();
  await expect(first.locator("button[aria-expanded]").first()).toHaveAttribute("aria-expanded", "true");
  await expect(first).toContainText("yelp.com");
  await expect(first).toContainText("Why you were skipped");
  await shot(page, info, "questions-from-compare");

  // The saved fix for yelp.com ("Check your Yelp listing", from a scan) opens on Actions, picked out and pulsing.
  await expect(first.getByTestId("why-skipped")).toContainText("In Actions · Suggested");
  await expect(first.getByTestId("skipped-fix-title")).toHaveText("Check your Yelp listing");
  await first.getByTestId("skipped-fix-link").click();
  await page.waitForURL((url) => url.pathname === "/actions" && url.searchParams.has("fix"), { timeout: 60_000 });
  const picked = page.locator("[data-testid=opportunity][data-picked]");
  await expect(picked).toHaveCount(1, { timeout: 30_000 });
  await expect(picked).toContainText("The fix you opened");
  await expect(picked).toContainText("Check your Yelp listing");
  await expect(picked).toBeInViewport();
});

test("Why you were skipped adds a site's fix that isn't in Actions yet, then opens it picked out", async ({ page }, info) => {
  const businessId = await seed(page, "/questions");
  // beanhouse.example is their own site (no fix to add); a site with no saved fix offers Add to Actions.
  await db.from("opportunities").delete().eq("business_id", businessId).eq("title", "Check your Yelp listing").throwOnError();
  await page.goto("/questions?site=yelp.com&named=Bean%20House");
  const first = page.getByTestId("focus-answers").getByTestId("focus-answer").first();
  const add = first.getByTestId("skipped-fix-add");
  await expect(add).toContainText("Where: yelp.com", { timeout: 60_000 });
  await add.getByTestId("add-to-actions").click();
  await page.waitForURL((url) => url.pathname === "/actions" && url.searchParams.has("fix"), { timeout: 60_000 });
  const picked = page.locator("[data-testid=opportunity][data-picked]");
  await expect(picked).toContainText("Get listed on yelp.com", { timeout: 30_000 });
  await expect(picked).toHaveAttribute("data-status", "todo");
  const saved = await db.from("opportunities").select("dedupe_key, source").eq("business_id", businessId).eq("dedupe_key", "site:yelp.com").throwOnError();
  expect(saved.data).toEqual([{ dedupe_key: "site:yelp.com", source: "sources" }]);
  await shot(page, info, "actions-picked-from-questions");
});

// Google is compared on the Google tab only (2026-10-29); the table says when Google can't be compared.
test("Show Google details on Compare lives on the Google tab: the table, and a message when Google can't be compared", async ({ page }) => {
  const businessId = await seed(page, "/competitors");
  const grind = await competitorId(businessId, "The Daily Grind");
  // Your listing has more reviews than The Daily Grind's, with the same rating and opening days (place-fixtures.ts).
  await db.from("businesses").update({ places_id: "ChIJ-fixture-blue-door" }).eq("id", businessId).throwOnError();
  await page.goto(`/competitors/compare?with=${grind}`);
  await expect(page.getByTestId("tab-summary").getByTestId("show-google")).toHaveCount(0);
  await page.getByTestId("compare-tab-google").click();
  const tab = page.getByTestId("tab-google");
  await tab.getByTestId("show-google-button").click();
  await page.waitForURL((url) => url.searchParams.get("google") === "1");
  await expect(tab.getByTestId("why-google")).toContainText(/Reviews\s*211\s*402/, { timeout: 60_000 });
  // They are not ahead on any Google line, so no Google reasons under the table.
  await expect(tab.getByTestId("google-reasons")).toHaveCount(0);
  await expect(tab.getByTestId("show-google-button")).toHaveCount(0);

  // With no Google listing linked for you, it says so instead of showing nothing.
  await db.from("businesses").update({ places_id: null }).eq("id", businessId).throwOnError();
  await page.goto(`/competitors/compare?with=${grind}&tab=google`);
  await tab.getByTestId("show-google-button").click();
  await page.waitForURL((url) => url.searchParams.get("google") === "1");
  await expect(tab.getByTestId("google-unavailable")).toContainText(
    "Google details aren't available for both of you. A business needs a Google listing linked.",
    { timeout: 60_000 },
  );
});
