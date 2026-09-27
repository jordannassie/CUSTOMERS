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
  await expect(page.getByText("Ratings and addresses from Google Maps").first()).toBeVisible();
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
  await visible(page, "Finish setup").click();
  await page.waitForURL("**/dashboard");

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
