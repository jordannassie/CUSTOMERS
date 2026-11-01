import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// BUG-079, BUG-066 against the local Supabase stack with STRIPE_CHECKOUT_FIXTURES (playwright.config.ts): the card
// form never calls Stripe, and the test does what the webhook does once the subscription exists.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const userIds: string[] = [];

type Seed = { status: "trialing" | "active" | "canceled"; subscription: boolean; businesses: string[] };

/** An agency in this state with these set-up businesses, logged in on `next`. */
async function logIn(page: Page, seed: Seed, next = "/settings/billing") {
  const email = `e2e-plan-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency } = await db
    .from("agencies")
    .insert({
      owner_user_id: user.user.id,
      name: "Plan test agency",
      is_test: true,
      status: seed.status,
      stripe_customer_id: seed.subscription ? `cus_e2e_${randomUUID()}` : null,
      stripe_subscription_id: seed.subscription ? `sub_e2e_${randomUUID()}` : null,
    })
    .select("id")
    .single()
    .throwOnError();
  for (const name of seed.businesses) {
    await db
      .from("businesses")
      .insert({ owner_user_id: user.user.id, agency_id: agency.id, name, status: "active", domain: `${randomUUID().slice(0, 8)}.example.test` })
      .throwOnError();
  }
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === next.split("?")[0]);
  return { userId: user.user.id, agencyId: agency.id as string };
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("no plan yet: choose Pro from Billing, pay, and the plan starts when Stripe confirms it", async ({ page }) => {
  const { agencyId } = await logIn(page, { status: "trialing", subscription: false, businesses: ["Northside Plumbing", "Harbor Dental"] });

  await page.getByRole("link", { name: "Choose a plan" }).click();
  await page.waitForURL((url) => url.pathname === "/settings/billing/plans");
  await expect(page.getByRole("heading", { level: 1, name: "Choose a plan" })).toBeVisible();
  await expect(page.getByTestId("plan-terms")).toContainText("7 days free, then $298 a month for 2 businesses.");
  await page.getByTestId("plan-pro").click();
  await expect(page.getByTestId("plan-terms")).toContainText("7 days free, then $498 a month for 2 businesses.");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByTestId("chosen-plan")).toHaveText(/Pro for 2 businesses, \$498 a month/);

  await page.locator("#card-number").fill("4000 0000 0000 0002");
  await page.getByRole("button", { name: "Start free trial" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Your card was declined. Nothing was charged." })).toBeVisible();
  await page.locator("#card-number").fill("4242 4242 4242 4242");
  await page.getByRole("button", { name: "Start free trial" }).click();
  await expect(page.getByTestId("plan-waiting")).toBeVisible();

  // What checkout.session.completed and customer.subscription.created do (B-42).
  await db
    .from("agencies")
    .update({ stripe_customer_id: `cus_e2e_${randomUUID()}`, stripe_subscription_id: `sub_e2e_${randomUUID()}`, status: "trialing" })
    .eq("id", agencyId)
    .throwOnError();
  await expect(page.getByTestId("plan-started")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Go to billing" })).toHaveAttribute("href", "/settings/billing");
});

test("ended plan: starts again from Billing with no second free trial (BUG-066)", async ({ page }) => {
  await logIn(page, { status: "canceled", subscription: true, businesses: ["Northside Plumbing"] });

  await page.getByRole("link", { name: "Start your plan again" }).click();
  await page.waitForURL((url) => url.pathname === "/settings/billing/plans");
  await expect(page.getByRole("heading", { level: 1, name: "Start your plan again" })).toBeVisible();
  await expect(page.getByTestId("plan-ended")).toBeVisible();
  await expect(page.getByTestId("plan-terms")).toHaveText("You pay $149 a month for 1 business today, then on the same date each month until you cancel.");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByRole("button", { name: "Pay $149" })).toBeVisible();
});

test("signed in, a plan button on the pricing page opens Choose plan with that plan picked", async ({ page }) => {
  await logIn(page, { status: "trialing", subscription: false, businesses: ["Northside Plumbing"] }, "/dashboard");
  await page.goto("/signup?plan=pro");
  await page.waitForURL((url) => url.pathname === "/settings/billing/plans");
  await expect(page.locator('input[name="plan"][value="pro"]')).toBeChecked();
});

test("an agency with a running plan changes it on Billing instead", async ({ page }) => {
  await logIn(page, { status: "active", subscription: true, businesses: ["Northside Plumbing"] }, "/dashboard");
  await page.goto("/settings/billing/plans");
  await page.waitForURL((url) => url.pathname === "/settings/billing");
});
