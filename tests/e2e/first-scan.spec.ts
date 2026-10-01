import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// B-38 against the local Supabase stack, with WORKER_IN_PROCESS=true like the overview spec. Each test seeds
// its own is_test agency, so the scan uses recorded answers and never calls an AI (D-61).
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
// Worded like the recorded answers in tests/fixtures/ai-answers, so the scan finds a close match.
const QUESTIONS = [
  "What is the best coffee shop in Orange, CA?",
  "Where can I find a quiet cafe to work from in Orange, CA?",
  "Which coffee shop in Orange, CA has the best cold brew?",
];
const userIds: string[] = [];
const slow = expect.configure({ timeout: 60_000 });
// Setup, a scan through the in-process worker and the dashboard's first compile add up to more than the default 90s.
test.setTimeout(240_000);

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

/**
 * A user stopped at the last setup step (AI models), with credits on a test agency. `subscription` links a
 * Stripe subscription as checkout.session.completed does; `credits: false` leaves out the grant that
 * invoice.paid brings (F-48).
 */
async function seedAtModelsStep(page: Page, opts: { subscription?: boolean; credits?: boolean } = {}) {
  const email = `e2e-first-scan-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);

  const { data: agency } = await db
    .from("agencies")
    .insert({
      owner_user_id: user.user.id,
      name: "First scan test agency",
      is_test: true,
      status: "active",
      stripe_subscription_id: opts.subscription ? `sub_${randomUUID()}` : null,
    })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await db
    .from("businesses")
    .insert({
      owner_user_id: user.user.id,
      agency_id: agency.id,
      name: "Bean There Coffee",
      status: "onboarding",
      onboarding_step: 7,
      industry: "coffee shop",
      domain: "beantherecoffee.example",
      primary_city: "Orange",
      primary_region: "CA",
      primary_country: "United States",
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single()
    .throwOnError();
  await db
    .from("tracked_prompts")
    .insert(QUESTIONS.map((prompt) => ({ business_id: business.id, prompt })))
    .throwOnError();
  if (opts.credits !== false) await grant(agency.id, opts.subscription ? "trial" : "admin");

  await page.goto("/login?next=/onboarding");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/onboarding/models", { timeout: 120_000 });
  return { businessId: business.id, agencyId: agency.id };
}

async function grant(agencyId: string, source: string) {
  const { error } = await db.rpc("grant_credits", {
    p_agency_id: agencyId,
    p_source: source,
    p_source_id: `e2e-${randomUUID()}`,
    p_amount: 200,
    p_expires_at: null,
  });
  if (error) throw error;
}

/** DB-010: the scan ends on one summary screen, and its button opens the dashboard. */
async function openDashboard(page: Page) {
  await expect(page.getByTestId("first-scan-result")).toBeVisible({ timeout: 120_000 });
  await page.getByRole("link", { name: "Go to your dashboard" }).click();
  await page.waitForURL("**/dashboard", { timeout: 120_000 });
}

const finishSetup = (page: Page) =>
  page.getByRole("button", { name: "Finish setup", exact: true }).filter({ visible: true }).last().click();

test("finish setup: a short progress screen, a summary, then the dashboard with the first score", async ({ page }) => {
  await seedAtModelsStep(page);
  await finishSetup(page);

  await page.waitForURL("**/onboarding/first-scan");
  await slow(page.getByRole("heading", { level: 1, name: "Running your first scan" })).toBeVisible();
  await expect(page.getByText("We're asking ChatGPT, Claude and Perplexity 3 questions")).toBeVisible();
  await expect(page.getByTestId("first-scan-models").getByRole("listitem")).toHaveCount(3);

  await slow(page.getByRole("heading", { level: 1, name: "Your first scan is done" })).toBeVisible();
  await expect(page.getByTestId("first-scan-result").getByTestId("score-value")).toBeVisible();
  await openDashboard(page);
  await expect(page.getByTestId("score-summary")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId("no-score")).toHaveCount(0);
});

test("a failed first scan shows Try again, never an empty dashboard, and the retry opens the score", async ({ page }) => {
  const { businessId } = await seedAtModelsStep(page);
  // Forced failure: with no active questions the worker fails the job at once, without holding credits.
  await db.from("tracked_prompts").update({ active: false }).eq("business_id", businessId).throwOnError();
  await finishSetup(page);

  await page.waitForURL("**/onboarding/first-scan");
  await slow(page.getByRole("heading", { level: 1, name: "Your first scan didn't finish" })).toBeVisible();
  await expect(page.getByTestId("first-scan-problem")).toHaveText("No credits were used. Try again in a moment.");
  expect(new URL(page.url()).pathname).toBe("/onboarding/first-scan");

  // A reload keeps the retry in view instead of starting another scan by itself.
  await page.reload();
  await slow(page.getByRole("heading", { level: 1, name: "Your first scan didn't finish" })).toBeVisible();
  const { count } = await db.from("scan_jobs").select("id", { count: "exact", head: true }).eq("business_id", businessId);
  expect(count).toBe(1);

  await db.from("tracked_prompts").update({ active: true }).eq("business_id", businessId).throwOnError();
  await page.getByRole("button", { name: "Try again" }).click();
  await openDashboard(page);
  await expect(page.getByTestId("score-summary")).toBeVisible({ timeout: 120_000 });
});

test.describe("trial credits after the card (F-48)", () => {
  const waiting = (page: Page) => page.getByTestId("first-scan-credits");

  test("credits already there: the scan starts at once", async ({ page }) => {
    await seedAtModelsStep(page, { subscription: true });
    await finishSetup(page);

    await page.waitForURL("**/onboarding/first-scan");
    await slow(page.getByRole("heading", { level: 1, name: "Running your first scan" })).toBeVisible();
    await expect(waiting(page)).toHaveCount(0);
    await openDashboard(page);
  });

  test("credits arrive late: the screen waits, then scans, never out of credits", async ({ page }) => {
    const { agencyId } = await seedAtModelsStep(page, { subscription: true, credits: false });
    await finishSetup(page);

    await page.waitForURL("**/onboarding/first-scan");
    await slow(page.getByRole("heading", { level: 1, name: "Getting your first scan ready" })).toBeVisible();
    await expect(waiting(page)).toHaveText("Adding your trial credits…");
    await expect(page.getByText("You're out of credits", { exact: false })).toHaveCount(0);

    await page.waitForTimeout(5_000);
    await expect(waiting(page)).toBeVisible();
    await grant(agencyId, "trial");

    await slow(page.getByRole("heading", { level: 1, name: "Running your first scan" })).toBeVisible();
    await openDashboard(page);
    await expect(page.getByTestId("score-summary")).toBeVisible({ timeout: 120_000 });
  });

  test("credits never arrive: a clear message, and Try again waits again", async ({ page }) => {
    const { agencyId, businessId } = await seedAtModelsStep(page, { subscription: true, credits: false });
    await finishSetup(page);

    await page.waitForURL("**/onboarding/first-scan");
    await expect(waiting(page)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Your trial credits aren't in yet" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("first-scan-problem")).toHaveText(
      "Your trial credits are taking longer than usual. Try again in a minute.",
    );
    const { count } = await db.from("scan_jobs").select("id", { count: "exact", head: true }).eq("business_id", businessId);
    expect(count).toBe(0);

    await grant(agencyId, "trial");
    await page.getByRole("button", { name: "Try again" }).click();
    await openDashboard(page);
  });
});
