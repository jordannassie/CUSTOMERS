import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// B-59 and D-90 against the local Supabase stack, with the dev server on .env.test.local values and PLACES_FIXTURES=true,
// so Google values come from made-up fixtures. Each test seeds an is_test agency (D-61). A share link and Download PDF
// both open the stored report PDF through a fresh signed URL.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const MODELS = ["openai", "anthropic", "perplexity"] as const;
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

const NOT_AVAILABLE = "This report is not available. Ask the person who sent it to you for a new link.";
const PDF_FILE = /^Sunrise Coffee Bar AI visibility report \d{4}-\d{2}-\d{2}\.pdf$/;

/** The share link's redirect: 303 to a signed URL of the stored PDF, with nothing indexed, cached or referred. */
async function openLink(page: Page, link: string) {
  const response = await page.request.get(link, { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  const headers = response.headers();
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["cache-control"]).toContain("no-store");
  const location = headers["location"];
  expect(location).toMatch(/\/storage\/v1\/object\/sign\/reports\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf\?token=/);
  return location;
}

async function expectPdf(page: Page, link: string) {
  const file = await page.request.get(link);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toContain("application/pdf");
  expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");
}

async function expectGone(page: Page, link: string) {
  const response = await page.request.get(link, { maxRedirects: 0 });
  expect(response.status()).toBe(404);
  expect(response.headers()["content-type"]).toContain("text/plain");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect(await response.text()).toContain(NOT_AVAILABLE);
}

test("Reports shows the report's numbers and adds its fixes to Actions; the share link opens the PDF until it is turned off", async ({ page }, info) => {
  const owner = await seed(page);
  await page.goto("/reports");
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible({ timeout: 60_000 });
  // The key numbers from the report's frozen snapshot (D-90).
  const overview = page.getByTestId("report-overview");
  await expect(overview).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("fact-score")).toContainText("/100");
  await expect(page.getByTestId("fact-named")).toContainText("of 36");
  await expect(page.getByTestId("fact-rank")).toContainText("#");
  await expect(page.getByTestId("fact-fixes")).toContainText("Also added to Actions");
  await expect(page.getByTestId("report-period")).toContainText("Covers");
  await expect(page.getByTestId("saved-report").first()).toContainText("Latest report");
  await expect(page.getByTestId("copy-email-summary")).toBeVisible();
  await expect(page.getByTestId("export-pdf")).toBeVisible();
  await expect(page.getByTestId("branding-form")).toBeVisible();
  await shot(page, info, "reports");

  // One list of fixes (D-92): the report's fixes are in Actions, from the report.
  const { data: fixes } = await db.from("opportunities").select("dedupe_key, status").eq("business_id", owner.businessId).eq("source", "report").throwOnError();
  const { count } = await db.from("reports").select("id", { count: "exact", head: true }).eq("business_id", owner.businessId).throwOnError();
  expect(count).toBe(1);
  for (const fix of fixes) expect(fix).toMatchObject({ dedupe_key: expect.stringMatching(/^report:/), status: "open" });

  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("share-panel")).toContainText("Share link is off");
  await page.getByTestId("create-link").click();
  await expect(page.getByTestId("share-url")).toHaveValue(/^http:\/\/localhost:\d+\/r\/[A-Za-z0-9_-]{43}$/, ACTION);
  await expect(page.getByTestId("share-panel")).toContainText("Share link is on");
  const link = await page.getByTestId("share-url").inputValue();

  // Opened with no login, as a client would: a redirect to the stored PDF, never a page of the app.
  const location = await openLink(page, link);
  expect(location).toContain(owner.businessId);
  await expectPdf(page, link);

  await page.getByTestId("revoke-link").click();
  await expect(page.getByText("Clients with this link will lose access.")).toBeVisible();
  await page.getByTestId("confirm-revoke").click();
  await expect(page.getByTestId("create-link")).toBeVisible(ACTION);
  await expectGone(page, link);
});

test("Download PDF saves the report PDF under a readable name", async ({ page }) => {
  await seed(page);
  await page.goto("/reports");
  await expect(page.getByTestId("report-overview")).toBeVisible({ timeout: 60_000 });
  const download = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByTestId("export-pdf").click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(PDF_FILE);
  const path = await file.path();
  expect(readFileSync(path).subarray(0, 5).toString()).toBe("%PDF-");
});

test("a snapshot link keeps opening its own report after new answers come in", async ({ page }) => {
  const owner = await seed(page);
  // The Overview's Share opens the panel straight away.
  await page.goto("/reports?share=1");
  await expect(page.getByTestId("share-panel")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("create-link").click();
  const live = await page.getByTestId("share-url").inputValue();

  await page.getByTestId("save-snapshot").click();
  await page.waitForURL(/\/reports\?report=[0-9a-f-]{36}$/, ACTION);
  const reportId = new URL(page.url()).searchParams.get("report")!;
  // The latest report and the snapshot: reports saved automatically are not listed.
  await expect(page.getByTestId("saved-report")).toHaveCount(2);
  await page.getByTestId("share-button").click();
  await page.getByTestId("create-link").click();
  const frozen = await page.getByTestId("share-url").inputValue();
  expect(frozen).not.toBe(live);

  // A new scan's answer that does not name the business: the live link gets a new report, the snapshot link does not.
  const { data: question } = await db.from("tracked_prompts").select("id").eq("business_id", owner.businessId).single().throwOnError();
  const { data: run } = await db.from("visibility_runs").insert({ business_id: owner.businessId, provider: "scan", status: "completed" }).select("id").single().throwOnError();
  await db
    .from("visibility_results")
    .insert({ run_id: run.id, business_id: owner.businessId, tracked_prompt_id: question.id, provider: "openai", business_mentioned: false, competitors_mentioned: [], cached: false, answer_text: "new answer" })
    .throwOnError();
  expect(await openLink(page, frozen)).toContain(`/${reportId}.pdf`);
  expect(await openLink(page, live)).not.toContain(`/${reportId}.pdf`);
  await expectPdf(page, frozen);

  // Deleting the snapshot stops its link. Opening the live link saved a newer report (D-90), so pick the snapshot's
  // own row (the open one), then wait for the page to leave it once the delete is done.
  await page.goto(`/reports?report=${reportId}`);
  const row = page.locator("li").filter({ has: page.locator('[data-testid="saved-report"][aria-current="page"]') });
  await row.getByRole("button", { name: /^Delete Report / }).click();
  await row.getByTestId("confirm-delete-snapshot").click();
  await page.waitForURL((url) => !url.searchParams.has("report"), ACTION);
  await expectGone(page, frozen);
});

test("an unknown link answers 404 with a short note", async ({ page }) => {
  await expectGone(page, `/r/${"A".repeat(43)}`);
});
