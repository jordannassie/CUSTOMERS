import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Failed in full local runs and passed alone (BUG-068: shared test data and auth under load): one retry here only.
test.describe.configure({ retries: 1 });

// B-46 against the local Supabase stack with STRIPE_CHECKOUT_FIXTURES (playwright.config.ts): plan changes run on
// the in-memory Stripe, and the real webhook handlers save the result, so Stripe is never called.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");
// Dates show in the viewer's zone (BUG-111) and dayOf() below is UTC: without this, runs between local midnight and
// UTC midnight expect one day and see the next.
test.use({ timezoneId: "UTC" });

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const userIds: string[] = [];
const DAY = 86_400_000;

type Seed = {
  status: "trialing" | "active" | "past_due" | "canceled";
  subscription?: boolean;
  businesses: { name: string; planId: string | null }[];
  /** When the trial or period ends, from now; negative for one that has ended. */
  endsInDays?: number;
  /** A trial grant, as the first invoice.paid gives it (B-42, B-45). */
  trialCredits?: number;
};

/** An agency with a fixture subscription and these businesses, logged in on /settings/billing. */
async function logIn(page: Page, seed: Seed): Promise<{ ends: string; userId: string; agencyId: string }> {
  const email = `e2e-billing-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const ends = new Date(Date.now() + (seed.endsInDays ?? 12) * DAY).toISOString();
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
      trial_ends_at: seed.status === "trialing" || seed.status === "canceled" ? ends : null,
      current_period_end: ends,
    })
    .select("id")
    .single()
    .throwOnError();
  for (const b of seed.businesses) {
    const { data: business } = await db
      .from("businesses")
      .insert({ owner_user_id: user.user.id, agency_id: agency.id, name: b.name, status: "active", domain: `${randomUUID().slice(0, 8)}.example.test` })
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

  if (seed.trialCredits) {
    const trial = { p_agency_id: agency.id, p_source_id: `il_e2e_${randomUUID()}`, p_amount: seed.trialCredits, p_expires_at: ends };
    await db.rpc("grant_trial_credits", trial).throwOnError();
  }

  await page.goto("/login?next=/settings/billing");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/settings/billing");
  return { ends, userId: user.user.id, agencyId: agency.id };
}

const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

async function change(page: Page, button: string, preview: RegExp | string, confirm: string) {
  await page.getByRole("button", { name: button, exact: true }).click();
  const dialog = page.getByTestId("change-dialog");
  await expect(dialog.getByTestId("change-preview")).toContainText(preview);
  await dialog.getByRole("button", { name: confirm, exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

/** Cancel or remove through "Before you cancel": the preview first, then the destructive button. */
async function cancelAnyway(page: Page, button: string, preview: RegExp | string, confirm: string) {
  await page.getByRole("button", { name: button, exact: true }).click();
  const dialog = page.getByTestId("cancel-dialog");
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

  // BUG-B: after cancelling, one message that agrees with the Overview banner.
  await cancelAnyway(page, "Cancel plan", "Your card won't be charged.", "Cancel anyway");
  await expect(page.getByTestId("cancel-notice")).toContainText("Your free trial ends on");
  await expect(page.getByTestId("cancel-notice")).toContainText("Your trial credits work until then, and you won't be charged.");
  await expect(page.getByTestId("plan-status")).not.toContainText("Cancel before then");
  await expect(page.getByTestId("charge-summary")).toContainText("No more charges. Your free trial ends on");
  await expect(page.getByText("Your plan ends on")).toHaveCount(0);
});

test("trial: a business set up after the first joins the plan, free until the trial ends (BUG-071)", async ({ page }) => {
  const { userId, agencyId } = await logIn(page, { status: "trialing", businesses: [{ name: "Northside Plumbing", planId: "starter" }] });
  // The second business, saved up to the AI models step of setup.
  const { data: draft } = await db
    .from("businesses")
    .insert({ owner_user_id: userId, agency_id: agencyId, name: "Harbor Dental", status: "onboarding", onboarding_step: 7, primary_city: "Austin" })
    .select("id")
    .single()
    .throwOnError();

  await page.goto("/onboarding/models");
  await expect(page.getByTestId("add-on-note")).toHaveText("This business joins your Starter plan. It's free during your trial, then $149 a month.");
  await page.getByRole("button", { name: "Finish setup", exact: true }).filter({ visible: true }).last().click();
  await page.waitForURL((url) => url.pathname === "/onboarding/first-scan", { timeout: 30_000 });

  // Saved by the webhook handlers, as Stripe's customer.subscription.updated does (B-42).
  await expect
    .poll(async () => (await db.from("business_subscriptions").select("plan_id").eq("business_id", draft.id).maybeSingle()).data?.plan_id ?? null)
    .toBe("starter");
  await page.goto("/settings/billing");
  await expect(line(page, "Harbor Dental")).toContainText("Starter");
  await expect(page.getByTestId("next-charge")).toHaveText("$298");
});

test("the new-business plan picker carries the chosen plan into setup", async ({ page }) => {
  await logIn(page, { status: "trialing", businesses: [{ name: "Northside Plumbing", planId: "starter" }] });
  // Billing has no See plans link beside Set up another business; the picker opens from the add-business block.
  await expect(page.getByRole("link", { name: "See plans" })).toHaveCount(0);

  await page.goto("/settings/billing/plans/new-business");
  await page.getByTestId("plan-pro").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((url) => url.pathname === "/onboarding/website" && url.searchParams.get("plan") === "pro");
});

test("a plan chosen on the picker wins over auto-matching the agency's other businesses", async ({ page }) => {
  const { userId, agencyId } = await logIn(page, { status: "trialing", businesses: [{ name: "Northside Plumbing", planId: "starter" }] });
  // What startBusiness saves when the website step is reached with ?plan=pro (new-business plan picker).
  const { data: draft } = await db
    .from("businesses")
    .insert({
      owner_user_id: userId,
      agency_id: agencyId,
      name: "Harbor Dental",
      status: "onboarding",
      onboarding_step: 7,
      primary_city: "Austin",
      requested_plan_id: "pro",
    })
    .select("id")
    .single()
    .throwOnError();

  await page.goto("/onboarding/models");
  await expect(page.getByTestId("add-on-note")).toContainText("This business joins your Pro plan");
  await page.getByRole("button", { name: "Finish setup", exact: true }).filter({ visible: true }).last().click();
  await page.waitForURL((url) => url.pathname === "/onboarding/first-scan", { timeout: 30_000 });

  await expect
    .poll(async () => (await db.from("business_subscriptions").select("plan_id").eq("business_id", draft.id).maybeSingle()).data?.plan_id ?? null)
    .toBe("pro");
  await page.goto("/settings/billing");
  await expect(line(page, "Harbor Dental")).toContainText("Pro");
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

test("trial: a third business can start the paid plan now, then set up on the plan picked", async ({ page }) => {
  await logIn(page, {
    status: "trialing",
    trialCredits: 100,
    businesses: [{ name: "Northside Plumbing", planId: "starter" }, { name: "Harbor Dental", planId: "starter" }],
  });
  await page.goto("/settings/billing/plans/new-business");
  await page.getByTestId("plan-pro").click();
  const box = page.getByTestId("plan-now");
  await expect(box).toContainText("Start your plan now to add more businesses");
  await expect(box).toContainText("$298 today");
  await box.getByRole("button", { name: "Start my plan now" }).click();
  await page.waitForURL((url) => url.pathname === "/onboarding/website" && url.searchParams.get("plan") === "pro", { timeout: 30_000 });
  await page.goto("/settings/billing");
  await expect(page.getByTestId("plan-status")).not.toContainText(/trial/i);
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
  // BUG-238: the button follows the new plan without a reload.
  await expect(line(page, "Northside Plumbing").getByRole("button", { name: "Upgrade to Pro" })).toHaveCount(0);
  await expect(line(page, "Northside Plumbing").getByRole("button", { name: "Move to Starter" })).toBeVisible();
  await expect(page.getByTestId("next-charge")).toHaveText("$398");

  await line(page, "Harbor Dental").getByRole("button", { name: "Remove", exact: true }).click();
  const before = page.getByTestId("cancel-dialog");
  await expect(before.getByTestId("change-preview")).toContainText(/Harbor Dental stays on your plan until \w+ \d+, \d{4}\. No refund\./);
  await before.getByRole("button", { name: "Remove anyway" }).click();
  await expect(before).toHaveCount(0);
  await expect(line(page, "Harbor Dental").getByTestId("pending-change")).toContainText("Comes off your plan on");
  await expect(page.getByTestId("next-charge")).toHaveText("$249");

  // B1: a business that is leaving can be kept, and offers no plan changes while it is leaving.
  await expect(line(page, "Harbor Dental").getByRole("button", { name: /^Upgrade to|^Move to/ })).toHaveCount(0);
  await line(page, "Harbor Dental").getByRole("button", { name: "Keep on plan" }).click();
  await expect(dialog.getByTestId("change-preview")).toContainText("Harbor Dental stays on your plan");
  await dialog.getByRole("button", { name: "Keep on plan" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(line(page, "Harbor Dental").getByTestId("pending-change")).toHaveCount(0);
  await expect(page.getByTestId("next-charge")).toHaveText("$398");
  await line(page, "Harbor Dental").getByRole("button", { name: "Remove", exact: true }).click();
  await before.getByRole("button", { name: "Remove anyway" }).click();
  await expect(before).toHaveCount(0);
  await expect(page.getByTestId("next-charge")).toHaveText("$249");

  await cancelAnyway(page, "Cancel plan", "Your plan stays active until", "Cancel anyway");
  await expect(page.getByTestId("cancel-notice")).toContainText("Your plan ends on");
  await expect(page.getByTestId("charge-summary")).toContainText("No more charges.");
  await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toHaveCount(0);

  // BUG-124: keeping the plan brings back the change scheduled before the cancel, so the next bill stays $249.
  await change(page, "Keep my plan", "Harbor Dental still comes off your plan on", "Keep my plan");
  await expect(page.getByTestId("cancel-notice")).toHaveCount(0);
  await expect(line(page, "Harbor Dental").getByTestId("pending-change")).toContainText("Comes off your plan on");
  await expect(page.getByTestId("next-charge")).toHaveText("$249");

  await page.getByRole("button", { name: "Manage card and invoices" }).click();
  await page.waitForURL((url) => url.searchParams.get("portal") === "fixture");
  await expect(page.getByTestId("portal-fixture")).toBeVisible();
});

test("trial banner: days, credits and the charge date, then no charge after cancelling (B-45)", async ({ page }) => {
  const { ends } = await logIn(page, {
    status: "trialing",
    endsInDays: 5,
    trialCredits: 100,
    businesses: [{ name: "Northside Plumbing", planId: "starter" }],
  });
  const banner = page.locator('[data-kind="trial"]');
  await expect(banner).toHaveText(`Your free trial has 5 days and 100 trial credits left. Your card will be charged on ${dayOf(ends)}.`);

  await cancelAnyway(page, "Cancel plan", "Your card won't be charged.", "Cancel anyway");
  await expect(banner).toContainText(`Your free trial has 5 days and 100 trial credits left. Your trial ends on ${dayOf(ends)}. You won't be charged.`);
  await expect(banner.getByRole("link", { name: "Keep my plan" })).toHaveAttribute("href", "/settings/billing");
  await page.goto("/dashboard");
  await expect(banner).toContainText("You won't be charged.");
});

test("ended trial: results stay readable and the banner says scans are off (B-45)", async ({ page }) => {
  await logIn(page, { status: "canceled", endsInDays: -2, businesses: [{ name: "Northside Plumbing", planId: "starter" }] });
  await expect(page.getByTestId("no-plan")).toContainText("Your plan has ended");
  await expect(page.getByRole("link", { name: "Start your plan again" })).toHaveAttribute("href", "/settings/billing/plans");
  await page.goto("/dashboard");
  const banner = page.locator('[data-kind="ended"]');
  await expect(banner).toContainText("Your free trial has ended and you weren't charged. Your results are still here to read, but new scans are off.");
  await expect(banner.getByRole("link", { name: "Choose a plan" })).toHaveAttribute("href", "/settings/billing/plans");
  // Top-ups can't be spent without a plan, so the out of credits banner would only lead to a refusal.
  await expect(page.locator('[data-kind="out_of_credits"]')).toHaveCount(0);
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
  await expect(page.getByRole("link", { name: "Choose a plan" })).toHaveAttribute("href", "/settings/billing/plans");
  await page.goto("/dashboard/billing");
  await page.waitForURL((url) => url.pathname === "/settings/billing");
});
