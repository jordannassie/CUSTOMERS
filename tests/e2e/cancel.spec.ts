import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// "Before you cancel" (2026-10-15) against the local stack with STRIPE_CHECKOUT_FIXTURES, so no Stripe call is
// made. Each test seeds an is_test agency (D-61) with real credit grants, opens the dialog, keeps the plan (nothing
// changes), then cancels or removes with a reason, and undoes it.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");
// The dates show in the viewer's zone (BUG-111); dayOf() below is UTC.
test.use({ timezoneId: "UTC" });

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const userIds: string[] = [];
const DAY = 86_400_000;
const ACTION = { timeout: 30_000 };
const LOST = ["Weekly scans and Run scan", "Score updates", "Competitor tracking", "New opportunities"];

const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

type Seed = { status: "trialing" | "active"; businesses: string[]; credits: { trial?: number; plan?: number; topup?: number } };

async function logIn(page: Page, seed: Seed): Promise<{ agencyId: string; ends: string; businessIds: string[] }> {
  const email = `e2e-cancel-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const ends = new Date(Date.now() + 9 * DAY).toISOString();
  const { data: agency } = await db
    .from("agencies")
    .insert({
      owner_user_id: user.user.id,
      name: "Cancel test agency",
      is_test: true,
      status: seed.status,
      stripe_customer_id: `cus_e2e_${randomUUID()}`,
      stripe_subscription_id: `sub_e2e_${randomUUID()}`,
      trial_ends_at: seed.status === "trialing" ? ends : null,
      current_period_end: ends,
    })
    .select("id")
    .single()
    .throwOnError();
  const businessIds: string[] = [];
  for (const name of seed.businesses) {
    const { data: business } = await db
      .from("businesses")
      .insert({ owner_user_id: user.user.id, agency_id: agency.id, name, status: "active", domain: "example.test" })
      .select("id")
      .single()
      .throwOnError();
    businessIds.push(business.id);
    await db
      .from("business_subscriptions")
      .insert({ agency_id: agency.id, business_id: business.id, plan_id: "starter", status: seed.status, stripe_subscription_item_id: `si_e2e_${randomUUID()}`, current_period_end: ends })
      .throwOnError();
  }
  const { trial, plan, topup } = seed.credits;
  if (trial) await db.rpc("grant_trial_credits", { p_agency_id: agency.id, p_source_id: `il_e2e_${randomUUID()}`, p_amount: trial, p_expires_at: ends }).throwOnError();
  if (plan) await db.rpc("grant_credits", { p_agency_id: agency.id, p_source: "plan", p_source_id: `il_e2e_${randomUUID()}`, p_amount: plan, p_expires_at: ends }).throwOnError();
  if (topup) await db.rpc("grant_credits", { p_agency_id: agency.id, p_source: "topup", p_source_id: `cs_e2e_${randomUUID()}`, p_amount: topup, p_expires_at: null }).throwOnError();

  await page.goto("/login?next=/settings/billing");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/settings/billing");
  await expect(page.getByRole("heading", { level: 1, name: "Billing" })).toBeVisible({ timeout: 60_000 });
  return { agencyId: agency.id, ends, businessIds };
}

const reasonsOf = async (agencyId: string) =>
  (await db.from("cancel_reasons").select("kind, reason, business_id").eq("agency_id", agencyId).throwOnError()).data;

async function pickReason(page: Page, label: string) {
  await page.getByTestId("cancel-dialog").getByRole("combobox").click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("trial: the dialog comes first, Keep my plan changes nothing, Cancel anyway cancels, and it can be undone", async ({ page }) => {
  const { agencyId, ends } = await logIn(page, { status: "trialing", businesses: ["Northside Plumbing"], credits: { trial: 150 } });
  const date = dayOf(ends);

  await page.getByRole("button", { name: "Cancel plan", exact: true }).click();
  const dialog = page.getByTestId("cancel-dialog");
  await expect(dialog.getByRole("heading", { name: "Before you cancel" })).toBeVisible();
  const preview = dialog.getByTestId("change-preview");
  await expect(preview).toContainText(`Your free trial keeps going until ${date}. Your card won't be charged.`, ACTION);
  await expect(preview).toContainText(`You have 150 trial credits left. Any left on ${date} are removed.`);
  await expect(preview).toContainText("Your results, past scans and share links stay.");
  await expect(dialog.getByTestId("cancel-losses")).toContainText(`From ${date} you lose:`);
  for (const item of LOST) await expect(dialog.getByTestId("cancel-losses")).toContainText(item);
  await page.screenshot({ path: `test-results/cancel-dialog/${test.info().project.name}-trial.png` });

  await dialog.getByRole("button", { name: "Keep my plan" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("cancel-notice")).toHaveCount(0);
  await expect(page.getByTestId("plan-status")).toContainText("Cancel before then and you won't be charged.");
  expect(await reasonsOf(agencyId)).toEqual([]);

  await page.getByRole("button", { name: "Cancel plan", exact: true }).click();
  await expect(preview).toBeVisible(ACTION);
  await pickReason(page, "Just testing");
  await dialog.getByRole("button", { name: "Cancel anyway" }).click();
  await expect(dialog).toHaveCount(0, ACTION);
  await expect(page.getByTestId("cancel-notice")).toContainText(`Your free trial ends on ${date}`);
  expect(await reasonsOf(agencyId)).toEqual([{ kind: "cancel", reason: "just_testing", business_id: null }]);

  // Undo until the end date.
  await page.getByTestId("cancel-notice").getByRole("button", { name: "Keep my plan" }).click();
  const keep = page.getByTestId("change-dialog");
  await expect(keep.getByTestId("change-preview")).toContainText("Your plan will keep going", ACTION);
  await keep.getByRole("button", { name: "Keep my plan" }).click();
  await expect(page.getByTestId("cancel-notice")).toHaveCount(0, ACTION);
  await expect(page.getByRole("button", { name: "Cancel plan", exact: true })).toBeVisible();
});

test("paid: real credits and the period end, then removing one business with its name and date", async ({ page }) => {
  const { agencyId, ends, businessIds } = await logIn(page, {
    status: "active",
    businesses: ["Northside Plumbing", "Harbor Dental"],
    credits: { plan: 830, topup: 500 },
  });
  const date = dayOf(ends);

  await page.getByRole("button", { name: "Cancel plan", exact: true }).click();
  const dialog = page.getByTestId("cancel-dialog");
  const preview = dialog.getByTestId("change-preview");
  await expect(preview).toContainText(`Your plan stays active until ${date}. You won't be charged again, and there's no refund for this month.`, ACTION);
  await expect(preview).toContainText(`You have 830 plan credits left. Any left on ${date} are removed.`);
  await expect(preview).toContainText("Your 500 top-up credits stay on your account, but you can only use them with an active plan.");
  await page.screenshot({ path: `test-results/cancel-dialog/${test.info().project.name}-paid.png` });
  await dialog.getByRole("button", { name: "Keep my plan" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("cancel-notice")).toHaveCount(0);

  const harbor = page.getByTestId("plan-lines").locator("li").filter({ hasText: "Harbor Dental" });
  await harbor.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Before you remove Harbor Dental" })).toBeVisible();
  await expect(preview).toContainText(`Harbor Dental stays on your plan until ${date}. No refund.`, ACTION);
  await expect(dialog.getByTestId("cancel-losses")).toContainText(`From ${date}, Harbor Dental loses:`);
  await pickReason(page, "Too expensive");
  await page.screenshot({ path: `test-results/cancel-dialog/${test.info().project.name}-remove.png` });
  await dialog.getByRole("button", { name: "Remove anyway" }).click();
  await expect(dialog).toHaveCount(0, ACTION);
  await expect(harbor.getByTestId("pending-change")).toContainText("Comes off your plan on");
  expect(await reasonsOf(agencyId)).toEqual([{ kind: "remove", reason: "too_expensive", business_id: businessIds[1] }]);

  // "Keep on plan" still takes the removal back.
  await harbor.getByRole("button", { name: "Keep on plan" }).click();
  await page.getByTestId("change-dialog").getByRole("button", { name: "Keep on plan" }).click();
  await expect(harbor.getByTestId("pending-change")).toHaveCount(0, ACTION);
});
