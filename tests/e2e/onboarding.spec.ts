import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// B-36 end to end against the local Supabase stack. The dev server runs with ONBOARDING_FIXTURES and
// PLACES_FIXTURES (playwright.config.ts), so auto-fill, competitors and questions never call a provider.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const userIds: string[] = [];
// Each step is a server round trip; a dev server compiling pages for parallel workers can take longer than 5s.
const slow = expect.configure({ timeout: 30_000 });

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

// A new account with no agency yet, like one just back from email confirmation.
async function newUser() {
  const email = `e2e-onboarding-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return { id: data.user.id, email, password };
}

// What the Stripe webhook's checkout.session.completed does (B-42): link the subscription to the agency.
async function webhookLinks(userId: string) {
  const { error } = await db
    .from("agencies")
    .update({ stripe_customer_id: `cus_e2e_${randomUUID()}`, stripe_subscription_id: `sub_e2e_${randomUUID()}` })
    .eq("owner_user_id", userId);
  if (error) throw error;
}

async function trialPaid(userId: string) {
  const { data: agency } = await db.from("agencies").select("id").eq("owner_user_id", userId).single().throwOnError();
  const { error } = await db.rpc("grant_credits", {
    p_agency_id: agency.id,
    p_source: "trial",
    p_source_id: `il_e2e_${randomUUID()}`,
    p_amount: 200,
  });
  if (error) throw error;
}

async function payWith(page: Page, card: string) {
  await page.locator("#card-number").fill(card);
  await visible(page, "Start free trial").click();
}

const visible = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).filter({ visible: true }).last();

test("the whole wizard: plan carried through, auto-filled, resumable, live estimate", async ({ page }, testInfo) => {
  const phone = testInfo.project.name === "mobile";
  const user = await newUser();

  // The pricing page's plan rides through login into onboarding.
  await page.goto("/login?plan=pro");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/onboarding/agency?plan=pro");

  await page.locator("#agency-name").fill("Blue Door Marketing");
  await visible(page, "Continue").click();
  await slow(page.getByRole("heading", { name: "Which business should we check?" })).toBeVisible();

  await page.locator("#website").fill("www.sunrise-coffee.example");
  await visible(page, "Find my business").click();
  await slow(page.getByRole("heading", { name: "Check your business details" })).toBeVisible();
  await slow(page.locator("#name")).toHaveValue("Sunrise Coffee Bar & Roastery");
  await expect(page.locator("#phone")).toHaveValue("(217) 555-0142");
  await expect(page.locator("#services")).toHaveValue(/oat milk lattes/);
  await expect(page.getByTestId("google-attribution").first()).toHaveText("Business details from");
  await expect(page.getByRole("img", { name: "Google Maps" }).first()).toBeVisible();
  await visible(page, "Continue").click();

  await slow(page.getByRole("heading", { name: "Who do you compete with?" })).toBeVisible();
  await page.getByRole("checkbox").filter({ visible: true }).first().check();
  await visible(page, "Continue").click();
  await slow(page.getByRole("heading", { name: "What do your customers ask AI?" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Question \d+$/ })).toHaveCount(12);

  // Closing the browser halfway: a fresh visit continues at the same step, and later steps stay locked.
  await page.goto("/dashboard");
  await page.waitForURL("**/onboarding/questions");
  await page.goto("/onboarding/models");
  await page.waitForURL("**/onboarding/questions");

  await page.getByRole("button", { name: "Remove question 1", exact: true }).click();
  await page.getByRole("textbox", { name: "Add a question" }).fill("Which coffee shop in Springfield, IL opens at 6am?");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await visible(page, "Continue").click();

  await slow(page.getByRole("heading", { name: /Choose the AI to check/ })).toBeVisible();
  const estimate = page.getByTestId(phone ? "credit-estimate-phone" : "credit-estimate");
  await expect(estimate).toContainText("155");
  await page.getByText("Daily", { exact: true }).filter({ visible: true }).click();
  await expect(estimate).toContainText("1,080");
  await page.getByText("Monthly", { exact: true }).filter({ visible: true }).click();
  await expect(estimate).toContainText("36");
  if (!phone) await expect(estimate).toContainText("your Pro plan");
  await visible(page, "Continue").click();

  // Step 8, the card (B-41): the Pro price from the plans table, then a declined card, then a good one.
  await slow(page.getByRole("heading", { name: "Start your 7-day free trial" })).toBeVisible();
  await expect(page.getByTestId("trial-terms")).toContainText(/7 days free, then \$249 per business per month\. Cancel anytime before \w+ \d{1,2}, \d{4} and you won't be charged\./);
  // B-78: renewal and how to cancel sit next to the card form, with a link to the terms.
  await expect(page.getByTestId("renewal-terms")).toContainText("renews every month on the same date until you cancel");
  await expect(page.getByRole("link", { name: /Read the trial and billing terms/ })).toHaveAttribute("href", "/terms#trial");
  await payWith(page, "4000 0000 0000 0002");
  await expect(page.getByRole("alert").filter({ hasText: "Your card was declined. Nothing was charged. Try another card." })).toBeVisible();
  await payWith(page, "4242 4242 4242 4242");
  await slow(page.getByText("Setting up your account…")).toBeVisible();
  // Nothing is finished until the webhook links the subscription.
  await page.waitForTimeout(3000);
  expect(page.url()).toContain("/onboarding/card");
  await webhookLinks(user.id);
  // The first scan screen (B-38) waits for the trial credits that invoice.paid brings (F-48).
  await page.waitForURL("**/onboarding/first-scan", { timeout: 30_000 });
  await slow(page.getByTestId("first-scan-credits")).toHaveText("Adding your trial credits…");
  await expect(page.getByText("You're out of credits", { exact: false })).toHaveCount(0);
  // What invoice.paid does (B-42). is_test first, so the scan uses recorded answers and never calls an AI (D-61).
  await db.from("agencies").update({ is_test: true }).eq("owner_user_id", user.id).throwOnError();
  await trialPaid(user.id);
  await slow(page.getByRole("heading", { level: 1, name: "Running your first scan" })).toBeVisible();

  const { data: businesses } = await db
    .from("businesses")
    .select("id, name, status, onboarding_step, scan_frequency, places_id")
    .eq("owner_user_id", user.id);
  expect(businesses).toHaveLength(1);
  expect(businesses![0]).toMatchObject({ name: "Sunrise Coffee Bar & Roastery", status: "active", onboarding_step: 9, scan_frequency: "monthly" });
  const { data: competitors } = await db.from("business_competitors").select("name, formatted_address").eq("business_id", businesses![0].id);
  expect(competitors).toEqual([{ name: "Bean House", formatted_address: null }]);
  const { data: auth } = await db.auth.admin.getUserById(user.id);
  expect(auth.user?.app_metadata.selected_plan).toBe("pro");
});

test("no website: the business is found on Google by name and city", async ({ page }) => {
  const user = await newUser();
  await page.goto("/login?next=/onboarding");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/onboarding/agency");

  await page.locator("#agency-name").fill("Solo Owner");
  await visible(page, "Continue").click();
  await page.getByRole("button", { name: "I don't have a website" }).click();
  await page.locator("#business-name").fill("Sunrise Coffee");
  await page.locator("#business-city").fill("Springfield");
  await visible(page, "Find my business").click();
  await slow(page.locator("#name")).toHaveValue("Sunrise Coffee Bar & Roastery");
  await expect(page.locator("#city")).toHaveValue("Springfield");
});

// A user whose first business is saved up to the AI models step, signed in on the card step.
async function atCardStep(page: Page, isTest = false) {
  const user = await newUser();
  const { data: agency, error } = await db
    .from("agencies")
    .insert({ owner_user_id: user.id, name: "Card Test Agency", is_test: isTest })
    .select("id")
    .single();
  if (error) throw error;
  const { data: biz, error: bizError } = await db
    .from("businesses")
    .insert({ owner_user_id: user.id, agency_id: agency.id, name: "Sunrise Coffee", status: "onboarding", onboarding_step: 8 })
    .select("id")
    .single();
  if (bizError) throw bizError;
  await page.goto("/login?next=/onboarding");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.locator("button[type=submit]").click();
  return { user, businessId: biz.id };
}

test("card step: a failed bank check lets the user try again, a passed one starts the trial", async ({ page }) => {
  const { user } = await atCardStep(page);
  await page.waitForURL("**/onboarding/card");
  // No plan picked on the pricing page: Starter.
  await expect(page.getByTestId("trial-terms")).toContainText("7 days free, then $149 per business per month.");

  await payWith(page, "4000 0025 0000 3155");
  await slow(page.getByRole("dialog", { name: "Confirm with your bank" })).toBeVisible();
  await page.getByRole("button", { name: "Fail" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "We couldn't confirm this card with your bank." })).toBeVisible();

  await payWith(page, "4000 0025 0000 3155");
  await page.getByRole("button", { name: "Complete" }).click();
  await slow(page.getByText("Setting up your account…")).toBeVisible();
  await webhookLinks(user.id);
  await page.waitForURL("**/onboarding/first-scan", { timeout: 30_000 });
});

test("card step: a test agency never sees it", async ({ page }) => {
  const { businessId } = await atCardStep(page, true);
  // Already at step 8 (the flag was set after models): the step finishes by itself.
  await page.waitForURL("**/onboarding/first-scan", { timeout: 30_000 });
  const { data } = await db.from("businesses").select("status, onboarding_step").eq("id", businessId).single();
  expect(data).toEqual({ status: "active", onboarding_step: 9 });
});
