import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";

// Long names and menus on small screens, against the local Supabase stack with PLACES_FIXTURES=true. One is_test
// agency (D-61) with very long names is seeded once; each screen width visits every app page, the share page and
// admin, and checks the page never scrolls sideways, open menus and dialogs stay on screen, and the name shows.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
// The owner is also an admin, so the same login reaches the admin pages. Listed in playwright.config.ts.
const EMAIL = "e2e-admin-responsive@example.test";
const PASSWORD = `pw-${randomUUID()}`;
const MODELS = ["openai", "anthropic", "perplexity"] as const;
const DAY = 86_400_000;
const WIDTHS = [360, 390, 768, 1280];
// Screenshots at 390px, kept after the run for a look by eye (under E2E_SHOTS_DIR when it is set).
const SHOTS = process.env.E2E_SHOTS_DIR ? `${process.env.E2E_SHOTS_DIR}/responsive-390` : "test-results/responsive-390";

const NAME = "Christian Brothers Automotive S. Western Ave Oklahoma City Engine & Brake Repair Center";
const OTHER = "Oklahoma City Southside Transmission Rebuild & Diagnostics Specialists of Moore and Norman";
const DOMAIN = "christianbrothersautomotive-southwesternave-oklahomacity.example";
const RIVALS = [
  { name: "Firestone Complete Auto Care South Western Avenue Oklahoma City Tire & Brake", places_id: "ChIJ-fixture-bean-house" },
  { name: "Jiffy Lube Signature Service Oil Change Interstate 240 and South Western", places_id: null },
  { name: "Supercalifragilisticexpialidociousautomotiverepairsandservices", places_id: null },
];
const UNTRACKED = "Oklahoma City Discount Brake and Muffler Professionals of the South Side";
const QUESTIONS = [
  "Which auto repair shop near South Western Avenue in Oklahoma City is best for engine diagnostics and brake replacement on a weekday morning?",
  "Where can I get my car's check engine light looked at today in Oklahoma City without an appointment?",
];

let shareToken = "";
let userId = "";
let businessId = "";

test.describe.configure({ mode: "serial" });
test.beforeAll(async ({}, info) => {
  // The widths are set in each test, so one project is enough, and only one may seed the shared admin user.
  test.skip(info.project.name !== "desktop", "Widths are set in the test");
  test.skip(!adminEmails.includes(EMAIL), `Skipped: add ${EMAIL} to ADMIN_EMAILS for the dev server and this run.`);
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const stale = users.users.find((u) => u.email === EMAIL);
  if (stale) await db.auth.admin.deleteUser(stale.id);
  const { data: user, error } = await db.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userId = user.user.id;

  const ends = new Date(Date.now() + 20 * DAY).toISOString();
  const { data: agency } = await db
    .from("agencies")
    .insert({
      owner_user_id: userId,
      name: "Northside Midwest Local Marketing and Reputation Management Partners",
      is_test: true,
      status: "active",
      stripe_customer_id: `cus_e2e_${randomUUID()}`,
      stripe_subscription_id: `sub_e2e_${randomUUID()}`,
      current_period_end: ends,
    })
    .select("id")
    .single()
    .throwOnError();
  // The second business gets its own website and listing: migration 067 refuses two copies of one business.
  const business = async (name: string, own = true) =>
    (
      await db
        .from("businesses")
        .insert({
          owner_user_id: userId,
          agency_id: agency.id,
          name,
          status: "active",
          industry: "auto repair",
          domain: own ? DOMAIN : `other-${DOMAIN}`,
          primary_city: "Oklahoma City",
          primary_region: "OK",
          primary_country: "United States",
          places_id: own ? "ChIJ-fixture-sunrise-coffee" : null,
          models: [...MODELS],
        })
        .select("id")
        .single()
        .throwOnError()
    ).data;
  // The second one first, so the long-named one is the business shown after login.
  const other = await business(OTHER, false);
  const main = await business(NAME);
  for (const b of [other, main]) {
    await db
      .from("business_subscriptions")
      .insert({ agency_id: agency.id, business_id: b.id, plan_id: "starter", status: "active", stripe_subscription_item_id: `si_e2e_${randomUUID()}`, current_period_end: ends })
      .throwOnError();
  }
  await db.from("profiles").update({ active_business_id: main.id }).eq("id", userId).throwOnError();
  businessId = main.id;
  await db.rpc("grant_credits", { p_agency_id: agency.id, p_source: "admin", p_source_id: `e2e-${randomUUID()}`, p_amount: 120, p_expires_at: null }).throwOnError();

  await db
    .from("business_competitors")
    .insert(RIVALS.map((r) => ({ business_id: main.id, ...r, source: r.places_id ? "confirmed_place" : "manual", confirmed: true, created_at: new Date(Date.now() - 3 * DAY).toISOString() })))
    .throwOnError();
  const { data: prompts } = await db
    .from("tracked_prompts")
    .insert(QUESTIONS.map((prompt) => ({ business_id: main.id, prompt, source: "library" })))
    .select("id")
    .throwOnError();
  const { data: run } = await db.from("visibility_runs").insert({ business_id: main.id, provider: "scan", status: "completed" }).select("id").single().throwOnError();
  const names = [NAME, ...RIVALS.map((r) => r.name), UNTRACKED];
  await db
    .from("visibility_results")
    .insert(
      [0, 1].flatMap((day) =>
        MODELS.flatMap((provider, m) =>
          prompts.map((p, q) => ({
            run_id: run.id,
            business_id: main.id,
            tracked_prompt_id: p.id,
            provider,
            created_at: new Date(Date.now() - day * DAY - 3_600_000).toISOString(),
            business_mentioned: (m + q) % 2 === 0,
            competitors_mentioned: RIVALS.map((r, i) => ({ name: r.name, position: i + 2 })),
            extracted_names: {
              promptVersion: "extract-names.v1",
              names: names.map((name, i) => ({ name, position: i + 1, matches: null, competitorName: null })),
            },
            cited_sources: [
              { url: `https://www.yelp.com/biz/${DOMAIN.replace(/\./g, "-")}-oklahoma-city-engine-and-brake-repair`, title: null },
              { url: `https://${DOMAIN}/services/engine-diagnostics-and-brake-replacement`, title: null },
            ],
            cached: false,
            answer_text: `${provider} answer ${q} on day ${day}. ${names.join(", ")}.`,
          })),
        ),
      ),
    )
    .throwOnError();
  await db
    .from("opportunities")
    .insert([
      {
        business_id: main.id,
        title: `${RIVALS[0].name} has more Google reviews than ${NAME}`,
        impact: "high",
        status: "open",
        category: "reviews_reputation",
        evidence: `${RIVALS[2].name} was named in 5 of 6 AI answers.`,
        recommended_action: `1. Ask every happy customer for a Google review.\n2. Link to https://${DOMAIN}/reviews/leave-a-review-for-us.`,
      },
    ])
    .throwOnError();
  shareToken = randomBytes(32).toString("base64url");
  await db.from("report_shares").insert({ business_id: main.id, token: shareToken }).throwOnError();
  mkdirSync(SHOTS, { recursive: true });
});

test.afterAll(async () => {
  if (userId) await db.auth.admin.deleteUser(userId);
});

/** The page never scrolls sideways. */
async function noSideScroll(page: Page, label: string) {
  const { scroll, width, wide } = await page.evaluate(() => {
    const width = window.innerWidth;
    // Names the widest elements, so a failure says what to fix.
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > width + 1 && getComputedStyle(el).position !== "fixed")
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)}`);
    return { scroll: document.documentElement.scrollWidth, width, wide };
  });
  expect(scroll, `${label}: page wider than the screen; ${wide.join(" | ")}`).toBeLessThanOrEqual(width);
}

/** Fully inside the viewport. */
async function onScreen(page: Page, popup: Locator, label: string) {
  await expect(popup, label).toBeVisible();
  // Menus and dialogs animate in; measure once they settle.
  await page.waitForTimeout(250);
  const box = (await popup.boundingBox())!;
  const view = page.viewportSize()!;
  expect(box.x, `${label}: left edge`).toBeGreaterThanOrEqual(0);
  expect(box.y, `${label}: top edge`).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, `${label}: right edge`).toBeLessThanOrEqual(view.width + 0.5);
  expect(box.y + box.height, `${label}: bottom edge`).toBeLessThanOrEqual(view.height + 0.5);
}

/** Opens the business switcher (from the menu on small screens), checks it, its list and the name, then closes it. */
async function checkSwitcher(page: Page, label: string) {
  const width = page.viewportSize()!.width;
  if (width < 1024) await page.getByRole("button", { name: "Open menu" }).click();
  const trigger = page.getByTestId("business-switcher").filter({ visible: true });
  await expect(trigger).toHaveAttribute("title", NAME);
  const name = trigger.getByTestId("switcher-name");
  expect((await name.boundingBox())?.width ?? 0, `${label}: switcher name has no width`).toBeGreaterThan(40);
  await trigger.click();
  const menu = page.getByRole("menu");
  await onScreen(page, menu, `${label}: business switcher`);
  await expect(menu.getByTestId("switcher-item").filter({ hasText: OTHER })).toBeVisible();
  await shot(page, width, "menu-business-switcher", false);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  if (width < 1024) {
    const sheet = page.getByRole("dialog");
    await onScreen(page, sheet, `${label}: menu sheet`);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  }
}

async function visit(page: Page, path: string, ready: Locator) {
  await page.goto(path);
  // The dev server compiles each page on its first visit.
  await expect(ready).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

/** The whole page from the top, or only the screen while a dialog is open. */
async function shot(page: Page, width: number, name: string, fullPage = true) {
  if (width !== 390) return;
  if (fullPage) await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
}

for (const width of WIDTHS) {
  test(`long names and menus fit at ${width}px`, async ({ page }) => {
    // About ten pages, admin included, each compiled on its first visit by the dev server: 90 s ran out in full runs
    // (BUG-068).
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/login?next=/dashboard");
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.locator("button[type=submit]").click();
    await page.waitForURL((url) => url.pathname === "/dashboard");

    const h1 = (name: string) => page.getByRole("heading", { level: 1, name });

    // Overview: the name is the page title and wraps instead of running off the side.
    await visit(page, "/dashboard", h1(NAME));
    expect((await h1(NAME).boundingBox())!.width).toBeGreaterThan(100);
    await noSideScroll(page, `${width} overview`);
    // Sharing moved to Reports (D-86): the header's Share link opens its share panel, checked further down.
    const share = page.getByRole("link", { name: "Share" });
    await expect(share).toHaveAttribute("href", "/reports?share=1");
    await share.scrollIntoViewIfNeeded();
    await onScreen(page, share, `${width} share link`);
    await shot(page, width, "overview");
    await checkSwitcher(page, `${width} overview`);

    await visit(page, "/competitors", h1("Competitors"));
    await expect(page.getByTestId("leaderboard")).toContainText(RIVALS[2].name.slice(0, 20));
    await noSideScroll(page, `${width} competitors`);
    await shot(page, width, "competitors");

    // Compare opens the leading competitor; its long name fits, and the tab row scrolls on its own.
    await visit(page, "/competitors/compare", h1("Compare"));
    await expect(page.getByTestId("compare-picker")).toContainText(RIVALS[0].name.slice(0, 20));
    await noSideScroll(page, `${width} compare`);
    await shot(page, width, "compare");

    await visit(page, "/actions", h1("Actions"));
    await expect(page.getByTestId("opportunity").first()).toBeVisible();
    await noSideScroll(page, `${width} actions`);
    await shot(page, width, "actions");

    await visit(page, "/questions", h1("Questions"));
    await noSideScroll(page, `${width} questions`);
    await page.getByRole("button", { name: `Options for: ${QUESTIONS[0]}` }).click();
    const menu = page.getByRole("menu");
    await onScreen(page, menu, `${width} question menu`);
    // Labels stay on one line.
    const item = menu.getByRole("menuitem", { name: "Edit" });
    expect((await item.boundingBox())!.height).toBeLessThan(40);
    await shot(page, width, "menu-question-options", false);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    // A question opens in place (the answers dialog is gone), and the page still never scrolls sideways.
    await page.getByRole("button", { name: QUESTIONS[0], exact: true }).click();
    await expect(page.getByTestId("question-details")).toBeVisible();
    await noSideScroll(page, `${width} question opened`);
    await shot(page, width, "questions-answers", false);
    await shot(page, width, "questions");

    await visit(page, "/sources", h1("Sources"));
    await noSideScroll(page, `${width} sources`);
    await shot(page, width, "sources");

    // Reports (7. Reports): /reports?share=1 opens the share panel under the header; the document fits the width.
    await visit(page, "/reports?share=1", h1("Reports"));
    await expect(page.getByTestId("share-panel")).toBeVisible();
    await noSideScroll(page, `${width} reports`);
    await shot(page, width, "reports");

    await visit(page, "/settings/billing", h1("Billing"));
    await noSideScroll(page, `${width} billing`);
    await shot(page, width, "billing");

    await visit(page, "/settings/usage", h1("Usage"));
    await noSideScroll(page, `${width} usage`);
    await shot(page, width, "usage");

    await visit(page, "/settings", h1("Settings"));
    await noSideScroll(page, `${width} settings`);
    // Industry and Country lists open on screen, not past its edge (BUG-189). Nothing is saved.
    for (const [id, pick, file] of [
      ["#profile-industry", "HVAC (heating and air conditioning)", "menu-settings-industry"],
      ["#profile-country", "South Georgia & South Sandwich Islands", "menu-settings-country"],
    ] as const) {
      await page.locator(id).scrollIntoViewIfNeeded();
      await page.locator(id).click();
      const list = page.getByRole("listbox");
      await onScreen(page, list, `${width} ${id}`);
      await shot(page, width, file, false);
      await list.getByRole("option", { name: pick }).click();
      await expect(list).toHaveCount(0);
      await expect(page.locator(id)).toContainText(pick);
    }
    await page.reload();
    await expect(h1("Settings")).toBeVisible();
    await shot(page, width, "settings");

    // A share link opens the report PDF (D-90): there is no share page to lay out, only a redirect to the file.
    const shared = await page.request.get(`/r/${shareToken}`, { maxRedirects: 0 });
    expect(shared.status()).toBe(303);

    for (const [path, title, file] of [
      ["/internal/admin", "Overview", "admin-overview"],
      ["/internal/admin/businesses", "Businesses", "admin-businesses"],
      ["/internal/admin/agencies", "Agencies", "admin-agencies"],
      ["/internal/admin/scans", "Scans", "admin-scans"],
      ["/internal/admin/usage", "Usage", "admin-usage"],
    ] as const) {
      await visit(page, path, page.getByRole("heading", { level: 1 }).first());
      await expect(page.getByRole("heading", { level: 1 }).first(), path).toContainText(title);
      await noSideScroll(page, `${width} ${path}`);
      await shot(page, width, file);
    }
    await visit(page, `/internal/admin/businesses/${businessId}`, page.getByRole("heading", { level: 1, name: NAME }));
    await noSideScroll(page, `${width} admin business`);
    await shot(page, width, "admin-business");

    // 2026-10-16: the Overview's section headings wrap instead of being cut off.
    await visit(page, "/internal/admin", page.getByRole("heading", { level: 1 }).first());
    await headingsFit(page, `${width} admin overview`);

    // The leads filters and the contact form's topic are our Select now: each list opens on screen at every width.
    await visit(page, "/internal/admin/leads", page.getByRole("heading", { level: 1 }).first());
    await noSideScroll(page, `${width} admin leads`);
    await shot(page, width, "admin-leads");
    for (const [id, file] of [
      ["#leads-interest", "menu-leads-interest"],
      ["#leads-source", "menu-leads-source"],
      ["#leads-status", "menu-leads-status"],
    ] as const) {
      await openList(page, id, `${width} ${id}`, width, file);
    }

    await visit(page, "/contact", page.locator("#cf-interest"));
    await noSideScroll(page, `${width} contact`);
    await openList(page, "#cf-interest", `${width} contact topic`, width, "menu-contact-topic");
    await shot(page, width, "contact");
  });
}

/** Opens a Select by its trigger id, checks its list is on screen, then closes it without choosing. */
async function openList(page: Page, id: string, label: string, width: number, file: string) {
  await page.locator(id).scrollIntoViewIfNeeded();
  await page.locator(id).click();
  const list = page.getByRole("listbox");
  await onScreen(page, list, label);
  await shot(page, width, file, false);
  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
}

/** Every section heading shows in full: none is cut off or wider than its box. */
async function headingsFit(page: Page, label: string) {
  const cut = await page.evaluate(() =>
    [...document.querySelectorAll("h1, h2, h3")]
      .filter((h) => getComputedStyle(h).position !== "absolute" && h.getBoundingClientRect().width > 1)
      .filter((h) => h.scrollWidth > h.clientWidth + 1)
      .map((h) => h.textContent?.trim()),
  );
  expect(cut, `${label}: headings cut off`).toEqual([]);
}
