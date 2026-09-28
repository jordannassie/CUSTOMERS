import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// B-46 against the local Supabase stack with STRIPE_CHECKOUT_FIXTURES (playwright.config.ts): plan changes run on
// the in-memory Stripe, and the real webhook handlers save the result, so Stripe is never called.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const userIds: string[] = [];
const DAY = 86_400_000;

type Seed = {
  status: "trialing" | "active" | "past_due";
  subscription?: boolean;
  businesses: { name: string; planId: string | null }[];
};

/** An agency with a fixture subscription and these businesses, logged in on /settings/billing. */
async function logIn(page: Page, seed: Seed) {
  const email = `e2e-billing-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const ends = new Date(Date.now() + 12 * DAY).toISOString();
  const withSub = seed.subscription !== false;
  const { data: agency } = await db
    .from("agencies")
    .insert({
      owner_user_id: user.user.id,
      name: "Billing test agency",
      is_test: true,
      status: seed.status,
      stripe_customer_id: withSub ? `cus_e2e_${randomUUID()}` : null,
      stripe_subscription_id: withSub ? `sub_e2e_${randomUUID()}` : null,
      trial_ends_at: seed.status === "trialing" ? ends : null,
      current_period_end: ends,
    })
    .select("id")
    .single()
    .throwOnError();
  for (const b of seed.businesses) {
    const { data: business } = await db
      .from("businesses")
      .insert({ owner_user_id: user.user.id, agency_id: agency.id, name: b.name, status: "active", domain: "example.test" })
      .select("id")
      .single()
      .throwOnError();
    if (b.planId) {
      await db
        .from("business_subscriptions")
        .insert({
          agency_id: agency.id,
          business_id: business.id,
          plan_id: b.planId,
          status: seed.status,
          stripe_subscription_item_id: `si_e2e_${randomUUID()}`,
          current_period_end: ends,
        })
        .throwOnError();
    }
  }

  await page.goto("/login?next=/settings/billing");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/settings/billing");
}

async function change(page: Page, button: string, preview: RegExp | string, confirm: string) {
  await page.getByRole("button", { name: button, exact: true }).click();
  const dialog = page.getByTestId("change-dialog");
  await expect(dialog.getByTestId("change-preview")).toContainText(preview);
  await dialog.getByRole("button", { name: confirm, exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

const line = (page: Page, name: string) => page.getByTestId("plan-lines").locator("li").filter({ hasText: name });

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("trial: shows the first charge, adds a saved business at no cost today", async ({ page }) => {
  await logIn(page, { status: "trialing", businesses: [{ name: "Northside Plumbing", planId: "starter" }, { name: "Harbor Dental", planId: null }] });

  await expect(page.getByTestId("plan-status")).toContainText("Free trial");
  await expect(page.getByTestId("plan-status")).toContainText("Cancel before then and you won't be charged.");
  await expect(page.getByTestId("charge-summary")).toContainText("when your free trial ends");
  await expect(page.getByTestId("next-charge")).toHaveText("$149");
  await expect(page.getByText("Beta")).toHaveCount(0);

  const harbor = page.getByTestId("not-on-plan").locator("li").filter({ hasText: "Harbor Dental" });
  await harbor.getByRole("button", { name: "Add on Pro, $249 a month" }).click();
  const dialog = page.getByTestId("change-dialog");
  await expect(dialog.getByTestId("change-preview")).toContainText("You pay nothing today. You're still on your free trial.");
  await dialog.getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByText("Harbor Dental is on your plan.")).toBeVisible();
  await expect(line(page, "Harbor Dental")).toContainText("Pro");
  await expect(page.getByTestId("not-on-plan")).toHaveCount(0);
  await expect(page.getByTestId("next-charge")).toHaveText("$398");
});

test("trial: a third saved business shows the trial limit instead of a price", async ({ page }) => {
  await logIn(page, {
    status: "trialing",
    businesses: [
      { name: "Northside Plumbing", planId: "starter" },
      { name: "Harbor Dental", planId: "starter" },
      { name: "Corner Bakery", planId: null },
    ],
  });
  await page.getByRole("button", { name: "Add on Starter, $149 a month" }).click();
  const dialog = page.getByTestId("change-dialog");
  await expect(dialog.getByRole("alert")).toContainText("Your trial includes 2 businesses.");
  await expect(dialog.getByRole("button", { name: "Add to plan" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Try again" })).toHaveCount(0);
});

test("active: upgrade, remove at renewal, cancel and keep, and the portal", async ({ page }) => {
  await logIn(page, {
    status: "active",
    businesses: [{ name: "Northside Plumbing", planId: "starter" }, { name: "Harbor Dental", planId: "starter" }],
  });
  await expect(page.getByTestId("plan-status")).toContainText("2 businesses for $298 a month.");
  await expect(page.getByTestId("next-charge")).toHaveText("$298");

  await line(page, "Northside Plumbing").getByRole("button", { name: "Upgrade to Pro" }).click();
  const dialog = page.getByTestId("change-dialog");
  await expect(dialog.getByTestId("change-preview")).toContainText(/You'll pay \$[\d.,]+ today and get [\d,]+ extra credits now\./);
  await dialog.getByRole("button", { name: "Upgrade now" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(line(page, "Northside Plumbing")).toContainText("Pro");
  await expect(page.getByTestId("next-charge")).toHaveText("$398");

  await line(page, "Harbor Dental").getByRole("button", { name: "Remove" }).click();
  await expect(dialog.getByTestId("change-preview")).toContainText(/Takes effect on \w+ \d+, \d{4}\. No refund\./);
  await dialog.getByRole("button", { name: "Remove from plan" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(line(page, "Harbor Dental").getByTestId("pending-change")).toContainText("Comes off your plan on");
  await expect(page.getByTestId("next-charge")).toHaveText("$249");

  await change(page, "Cancel plan", "Your plan credits work until then.", "Cancel plan");
  await expect(page.getByTestId("cancel-notice")).toContainText("Your plan ends on");
  await expect(page.getByTestId("charge-summary")).toContainText("No more charges.");
  await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toHaveCount(0);

  await change(page, "Keep my plan", "Your plan will keep going after", "Keep my plan");
  await expect(page.getByTestId("cancel-notice")).toHaveCount(0);
  await expect(page.getByTestId("next-charge")).toBeVisible();

  await page.getByRole("button", { name: "Manage card and invoices" }).click();
  await page.waitForURL((url) => url.searchParams.get("portal") === "fixture");
  await expect(page.getByTestId("portal-fixture")).toBeVisible();
});

test("past due: explains the failed payment and offers no upgrades", async ({ page }) => {
  await logIn(page, {
    status: "past_due",
    businesses: [{ name: "Northside Plumbing", planId: "starter" }, { name: "Harbor Dental", planId: null }],
  });
  await expect(page.getByTestId("plan-status")).toContainText("Payment failed");
  await expect(page.getByTestId("past-due-notice")).toContainText("Your last payment didn't go through");
  // Said once on this page: the app banner steps aside for the page's own notice.
  await expect(page.locator('[data-kind="past_due"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Manage card and invoices" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Upgrade to/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Add on/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Buy credits" }).first()).toHaveAttribute("href", "/settings/credits");
  await page.goto("/settings/credits");
  await expect(page.locator('[data-kind="past_due"]')).toContainText("Your last payment didn't go through");
});

test("no plan yet, and old billing links land here", async ({ page }) => {
  await logIn(page, { status: "trialing", subscription: false, businesses: [{ name: "Northside Plumbing", planId: null }] });
  await expect(page.getByTestId("no-plan")).toContainText("You don't have a plan yet");
  await page.goto("/dashboard/billing");
  await page.waitForURL((url) => url.pathname === "/settings/billing");
});
