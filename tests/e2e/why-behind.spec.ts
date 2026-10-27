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

async function competitorId(businessId: string, name: string): Promise<string> {
  const { data } = await db.from("business_competitors").select("id").eq("business_id", businessId).eq("name", name).single().throwOnError();
  return data.id;
}

/** The whole See why panel in one picture, on a screen tall enough to show it all (layout reviews only). */
async function panelShot(page: Page, info: TestInfo, name: string) {
  if (!SHOTS) return;
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.width, height: 7000 });
  await page.getByTestId("why-sheet").screenshot({ path: `${SHOTS}/${name}-${info.project.name}.png` });
  await page.setViewportSize(size);
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

test("See why: a short panel, then the full comparison page with a tab for each kind of evidence", async ({ page }, info) => {
  const businessId = await seed(page, "/competitors");
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
  await page.getByTestId("leaderboard").getByRole("listitem").filter({ hasText: "Bean House" }).getByTestId("see-why").click();
  const sheet = page.getByTestId("why-sheet");
  await expect(sheet.getByRole("heading", { name: /Bean House/ })).toBeVisible();
  await expect(sheet.getByTestId("why-versus")).toHaveText(/Bean House\s*12 of 15 answers\s*You\s*3 of 15 answers/);
  // 3 places, or 4 once a website check (another test, shared for everyone) has read both sites.
  await expect(sheet.getByTestId("gap-summary")).toContainText(/Bean House leads in (3 of 3|4 of 4) places AI looks/);
  await expect(sheet.getByTestId("gap-areas")).toContainText("320 reviews vs your 12, rated 4.7 vs 4.2.");
  await expect(sheet.getByRole("img", { name: "Google Maps" })).toHaveCount(1);
  const first = sheet.getByTestId("why-reasons").getByTestId("fact").first();
  await expect(first).toHaveText(
    /AI used yelp.com when it picked them\s*9 answers without you.\s*What to do\s*Other places AI looks\s*Claim or update your listing on yelp.com/,
  );
  // Its link opens the Yelp fix itself.
  const yelpFix = await db.from("opportunities").select("id").eq("business_id", businessId).eq("title", "Check your Yelp listing").single().throwOnError();
  await expect(first.getByTestId("fix-link")).toHaveAttribute("href", `/opportunities?fix=${yelpFix.data!.id}`);
  // The short panel has no tables: those are on the comparison page.
  await expect(sheet.getByTestId("gap-sources")).toHaveCount(0);
  await expect(sheet.getByTestId("website-status")).toContainText("Their website");
  await shot(page, info, "competitors-see-why");
  await panelShot(page, info, "panel-full");

  await sheet.getByTestId("open-comparison").click();
  await page.waitForURL(/\/competitors\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  const compare = page.getByTestId("compare-page");
  await expect(compare.getByRole("heading", { level: 1 })).toHaveText("Bean House vs you");
  await expect(compare.getByTestId("head-to-head")).toContainText(/Bean House\s*80%/);
  await expect(compare.getByTestId("head-to-head")).toContainText(/You\s*20%/);
  // Never wider than the screen, at 390px too: the tab row scrolls on its own.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // Why they're ahead (the first tab): every reason, grouped by where you fix it, Google included.
  const why = compare.getByTestId("tab-why");
  await expect(why.getByTestId("why-group").filter({ hasText: "Other places AI looks" })).toContainText("AI used yelp.com when it picked them", { timeout: 60_000 });
  await expect(why.getByTestId("why-group").filter({ hasText: "Your website" })).toContainText("AI quotes their website more");
  await expect(why.getByTestId("why-group").filter({ hasText: "Your Google listing" })).toContainText("More Google reviews");
  await shot(page, info, "compare-why");

  // AI answers: the score's own answers, by where AI looked, by question, and the pages used.
  await compare.getByTestId("compare-tab-answers").click();
  // The dev server compiles each tab's first visit, which can take far longer than an assertion's 5s.
  await expect(page).toHaveURL(/tab=answers/, { timeout: 60_000 });
  const sources = compare.getByTestId("gap-sources");
  // Them against you per kind of site: answers, then how many named them and you.
  await expect(sources.getByTestId("source-row").filter({ hasText: "Review sites and directories" })).toHaveText(/Review sites and directories\s*9 answers · yelp.com\s*9\s*0/);
  await expect(sources.getByTestId("source-row").filter({ hasText: "Their website" })).toHaveText(/Their website\s*6 answers · beanhouse.example\s*6\s*0/);
  await expect(compare.getByTestId("by-ai")).toContainText("ChatGPT");
  await expect(compare.getByTestId("questions-they-win")).toHaveText(/Best coffee shop in Springfield, IL\?\s*12\s*vs\s*3/, { timeout: 60_000 });
  await expect(compare.getByTestId("their-pages")).toContainText("/menu");
  await shot(page, info, "compare-answers");

  await compare.getByTestId("compare-tab-google").click();
  await expect(compare.getByTestId("why-google")).toContainText(/Reviews\s*320\s*12/, { timeout: 60_000 });
  await compare.getByTestId("compare-tab-fixes").click();
  await expect(compare.getByTestId("tab-fixes")).toContainText("Ask your customers for Google reviews", { timeout: 60_000 });
  // Each tab has its own address, so Back returns to the one before.
  await page.goBack();
  await expect(page).toHaveURL(/tab=google/);
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

test("The Overview says why the leading competitor is ahead and opens its comparison page", async ({ page }, info) => {
  await seed(page, "/dashboard");
  const card = page.getByTestId("why-behind");
  await expect(card).toContainText("Why Bean House is ahead of you", { timeout: 60_000 });
  await expect(card).toContainText("AI used yelp.com when it picked them");
  await shot(page, info, "overview");
  await card.getByRole("link", { name: "See why" }).click();
  await expect(page.getByTestId("compare-page").getByRole("heading", { level: 1 })).toHaveText("Bean House vs you", { timeout: 60_000 });
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

test("Each reason says what to do and where, and opens only the fix about it", async ({ page }) => {
  await seed(page, "/dashboard");
  const card = page.getByTestId("why-behind");
  const yelp = card.getByTestId("fact").filter({ hasText: "yelp.com" });
  await expect(yelp.getByTestId("fix-where")).toHaveText("Other places AI looks", { timeout: 60_000 });
  await expect(yelp.getByTestId("fix-action")).toContainText("Claim or update your listing on yelp.com");

  // The website reason has no saved fix about it (the menu page fix is about something else): its step, no link.
  const website = card.getByTestId("fact").filter({ hasText: "AI quotes their website more" });
  await expect(website.getByTestId("fix-action")).toContainText("own clear page");
  await expect(website.getByTestId("fix-link")).toHaveCount(0);

  // The Yelp reason opens the Yelp fix itself, not the first fix in its group.
  await yelp.getByTestId("fix-link").click();
  await page.waitForURL((url) => url.pathname === "/opportunities" && url.searchParams.has("fix"));
  const fix = page.getByTestId("opportunity").filter({ hasText: "Check your Yelp listing" });
  await expect(fix.getByRole("button", { name: "Check your Yelp listing" })).toHaveAttribute("aria-expanded", "true", { timeout: 30_000 });
  await expect(fix).toBeInViewport();
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

test("Check their website: on the Websites tab only, read once, compared side by side with quotes", async ({ page }, info) => {
  // One project only: both would share the one fixture site, and a check is kept for everyone.
  test.skip(info.project.name !== "desktop", "The website check runs once, on desktop.");
  // Both sites are read on the first check: theirs, and yours the same way (fixture sites, no real reads).
  await db.from("website_facts").delete().in("domain", ["beanhouse.example", "sunrise-coffee.example"]).throwOnError();
  const businessId = await seed(page, "/competitors");
  const bean = await competitorId(businessId, "Bean House");
  await page.goto(`/competitors/${bean}?tab=websites`);
  const tab = page.getByTestId("tab-websites");
  // Found from the AI answers that cited it, so the owner only presses the button.
  await expect(tab.getByTestId("check-website")).toContainText("beanhouse.example", { timeout: 60_000 });
  await tab.getByTestId("check-website-button").click();
  await expect(tab.getByTestId("their-services")).toContainText("office catering", { timeout: 60_000 });
  await expect(tab.getByTestId("their-services").getByRole("button", { name: "office catering" })).toHaveClass(/bg-mid-bg/);
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

  // Hover a service for its words; pick it and the list becomes that service, them against you.
  const catering = tab.getByTestId("their-services").getByRole("button", { name: "office catering" });
  await catering.hover();
  await expect(page.getByRole("tooltip")).toContainText("Office catering for teams of 10 to 200");
  await catering.click();
  const one = tab.getByTestId("service-compare");
  await expect(one).toContainText("Office catering");
  await expect(one).toContainText("/services page");
  await expect(one).toContainText("Not found on the pages we read of yours.");
  await expect(tab.getByTestId("website-claims")).toHaveCount(0);
  await one.getByRole("button", { name: "Show everything" }).click();
  await expect(tab.getByTestId("website-claims")).toBeVisible();
  await shot(page, info, "compare-websites");

  // Steps 1 and 2 add likely reasons on the first tab.
  await page.getByTestId("compare-tab-why").click();
  const why = page.getByTestId("tab-why");
  await expect(why).toContainText("Their website lists office catering", { timeout: 60_000 });
  await expect(why).toContainText("Your website blocks some AI tools");
  await expect(why).toContainText("GPTBot and ClaudeBot");
  await expect(why).toContainText("Their website says years in business");
  await expect(page.getByTestId("gap-areas").getByRole("listitem").filter({ hasText: "The websites" })).toContainText("Only theirs:");

  // Read once (D-85): reload, and no screen offers to read it again; the record is unchanged.
  const before = (await db.from("website_facts").select("fetched_at").eq("domain", "beanhouse.example").single().throwOnError()).data.fetched_at;
  await page.goto(`/competitors/${bean}?tab=websites`);
  await expect(page.getByTestId("tab-websites").getByTestId("check-website")).toContainText("checked", { timeout: 60_000 });
  await expect(page.getByTestId("check-website-button")).toHaveCount(0);
  await page.goto("/competitors");
  await page.getByTestId("leaderboard").getByRole("listitem").filter({ hasText: "Bean House" }).getByTestId("see-why").click({ timeout: 60_000 });
  await expect(page.getByTestId("why-sheet").getByTestId("website-status")).toContainText("Their website: checked");
  await page.goto("/opportunities");
  const row = page.getByTestId("competitor-websites").getByTestId("website-row").filter({ hasText: "Bean House" });
  await expect(row).toContainText("Checked", { timeout: 60_000 });
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

test("Competitor websites: Opportunities lists where each check stands, and the Websites tab asks for an unknown address", async ({ page }) => {
  await seed(page, "/opportunities");
  const card = page.getByTestId("competitor-websites");
  const grind = card.getByTestId("website-row").filter({ hasText: "The Daily Grind" });
  await expect(grind).toContainText("Website not known yet", { timeout: 60_000 });
  await expect(card.getByTestId("website-row").filter({ hasText: "Bean House" })).toContainText("beanhouse.example");
  // No check button here: the check is only on each competitor's Websites tab (read once, D-85).
  await expect(card.getByRole("button")).toHaveCount(0);
  await grind.click();
  await expect(page.getByTestId("tab-websites").getByRole("textbox", { name: "Website for The Daily Grind" })).toBeVisible({ timeout: 60_000 });
});
