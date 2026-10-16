import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// 2026-10-16, bennucoffee.com: a website that blocks automated readers, in fixture mode (ONBOARDING_FIXTURES). Google
// lists it only by its brand, so the user picks the listing; when Google can't be reached either, the step says so and
// offers Try again. Fixtures: dev-fixtures.ts (bennu-coffee.example, quiet-roasters.example).
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }) : null!;
const userIds: string[] = [];
const slow = expect.configure({ timeout: 30_000 });
const visible = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).filter({ visible: true }).last();

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

async function atWebsiteStep(page: Page) {
  const email = `e2e-blocked-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  await page.goto("/login?next=/onboarding");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/onboarding/agency");
  await page.locator("#agency-name").fill("Blocked Site Agency");
  await visible(page, "Continue").click();
  await page.waitForURL("**/onboarding/website");
  return data.user.id;
}

test("a site that blocks readers: the user picks their Google listing, which fills the form", async ({ page }) => {
  const userId = await atWebsiteStep(page);
  await page.locator("#website").fill("bennu-coffee.example");
  await visible(page, "Find my business").click();
  const choices = page.getByRole("group", { name: "Is one of these your business?" });
  await slow(choices).toBeVisible();
  await expect(page.getByText("We couldn't read bennu-coffee.example because it blocks automated readers. Pick your Google listing or fill in the details below.")).toBeVisible();
  await expect(page.getByText("temporarily unavailable")).toHaveCount(0);
  await choices.getByRole("radio", { name: /Bennu Coffee East/ }).check();
  await visible(page, "Continue").click();
  await slow(page.locator("#name")).toHaveValue("Bennu Coffee East");
  const { data } = await db.from("businesses").select("places_id, domain").eq("owner_user_id", userId).single().throwOnError();
  expect(data).toEqual({ places_id: "ChIJ-fixture-bennu-east", domain: "bennu-coffee.example" });
});

test("a site that blocks readers and Google can't be reached: the real reason, Try again, then fill in by hand", async ({ page }) => {
  await atWebsiteStep(page);
  await page.locator("#website").fill("quiet-roasters.example");
  await visible(page, "Find my business").click();
  const failed = page.getByTestId("autofill-failed");
  await slow(failed).toContainText("We couldn't read your website or find it on Google right now. Fill in the details below, or try again in a minute.");
  await failed.getByRole("button", { name: "Try again" }).click();
  // The fixture's Google stays down, so the same message comes back (no new business, no crash).
  await slow(failed).toBeVisible();
  await failed.getByRole("button", { name: "Fill in the details" }).click();
  await page.waitForURL("**/onboarding/details");
  await slow(page.locator("#name")).toBeVisible();
});
