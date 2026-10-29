import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Failed in full local runs and passed alone (BUG-068: shared test data and auth under load): one retry here only.
test.describe.configure({ retries: 1 });

// B-43 against the local Supabase stack with STRIPE_CHECKOUT_FIXTURES (playwright.config.ts): the fake card form
// runs the real checkout.session.completed handler, so credits come from grant_credits and Stripe is never called.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const userIds: string[] = [];

async function rpc(fn: string, args: Record<string, unknown>) {
  const { error } = await db.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
}

/**
 * An agency with `balance` credits (negative means overdraft), logged in on /settings/usage. `setup`: a real (not test)
 * agency whose trial has not started yet, no subscription and no trial end, as before the card step.
 */
async function logIn(page: Page, status: "active" | "trialing" | "canceled", balance: number, setup = false) {
  const email = `e2e-topup-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency, error: agencyError } = await db
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Top-up test agency", is_test: !setup, status })
    .select("id")
    .single();
  if (agencyError) throw agencyError;
  const { error: bizError } = await db
    .from("businesses")
    .insert({ owner_user_id: user.user.id, agency_id: agency.id, name: "Northside Plumbing", status: "active", domain: "northside.example" });
  if (bizError) throw bizError;
  if (balance !== 0) await rpc("admin_adjust_credits", {
    p_agency_id: agency.id,
    p_delta: balance,
    p_admin_user_id: user.user.id,
    p_note: "e2e balance",
    p_request_id: randomUUID(),
  });

  await page.goto("/login?next=/settings/usage");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/settings/usage");
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("buying a pack pays back a negative balance first, then shows the new balance", async ({ page }) => {
  await logIn(page, "active", -15);

  await page.getByTestId("app-banners").getByRole("link", { name: "Buy credits" }).click();
  await page.waitForURL((url) => url.pathname === "/settings/credits");
  await expect(page.getByTestId("current-balance")).toContainText("15 credits over");
  await expect(page.getByTestId("pack-topup_500")).toContainText("$50");
  await expect(page.getByTestId("pack-topup_2000")).toContainText("$180");

  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByTestId("chosen-pack")).toHaveText("500 credits for $50");
  await page.getByLabel("Card number").fill("4000 0000 0000 0002");
  await page.getByRole("button", { name: "Pay $50" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Your card was declined. Nothing was charged.");

  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByRole("button", { name: "Pay $50" }).click();
  // The fixture payment runs the real webhook handler on the dev server; in a full run it took longer than 5s.
  await expect(page.getByTestId("topup-done")).toContainText("500 credits added.", { timeout: 30_000 });
  await expect(page.getByTestId("topup-balance")).toHaveText("485 credits");
  // E2E agencies are test agencies, so the test mode banner always shows (D-61); no other banner may.
  const banners = page.getByTestId("app-banners").locator("[data-kind]");
  await expect(banners).toHaveCount(1);
  await expect(banners).toHaveAttribute("data-kind", "test_mode");
});

test("the usage page's button opens the packs, and a cancelled plan cannot buy", async ({ page }) => {
  await logIn(page, "canceled", 30);
  await page.locator("header").getByRole("link", { name: "Buy credits" }).click();
  await page.waitForURL((url) => url.pathname === "/settings/credits");
  await expect(page.getByTestId("topup-blocked")).toContainText("Your plan has ended. Choose a plan to start it again.");
  await expect(page.getByTestId("topup-blocked").getByRole("link", { name: "Choose a plan" })).toHaveAttribute("href", "/settings/billing/plans");
  await expect(page.getByRole("button", { name: "Continue to payment" })).toHaveCount(0);
});

// F-43: a top-up bought before the card step made a Stripe customer, and the trial checkout then refused the trial.
test("an agency whose trial has not started is sent to finish setup, with no way to buy", async ({ page }) => {
  await logIn(page, "trialing", 0, true);
  await page.goto("/settings/credits");
  await expect(page.getByTestId("topup-blocked")).toContainText(
    "Finish setting up your first business to start your free trial. Then you can buy credits.",
  );
  await expect(page.getByTestId("topup-blocked").getByRole("link", { name: "Finish setup" })).toHaveAttribute("href", "/onboarding");
  await expect(page.getByRole("button", { name: "Continue to payment" })).toHaveCount(0);
});
