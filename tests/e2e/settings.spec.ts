import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// B-55 against the local Supabase stack, like app-shell.spec.ts: each test seeds its own agency.
// The logo test also needs the local storage service, which scripts/test-db-reset.sh starts.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const userIds: string[] = [];
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function seed() {
  const email = `e2e-settings-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);

  const { data: agency, error: agencyError } = await db
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Blue Door Marketing", is_test: true, status: "active" })
    .select("id")
    .single();
  if (agencyError) throw agencyError;
  const { data: business, error: businessError } = await db
    .from("businesses")
    .insert({
      owner_user_id: user.user.id,
      agency_id: agency.id,
      name: "Northside Plumbing",
      status: "active",
      domain: "northside.example",
      industry: "Plumber",
      primary_city: "Austin",
    })
    .select("id")
    .single();
  if (businessError) throw businessError;
  const { error: promptError } = await db
    .from("tracked_prompts")
    .insert(Array.from({ length: 12 }, (_, i) => ({ business_id: business.id, prompt: `Best plumber near me ${i}`, active: true })));
  if (promptError) throw promptError;
  // Credits, so the out-of-credits banner does not sit on the page.
  const { error: grantError } = await db.rpc("grant_credits", {
    p_agency_id: agency.id,
    p_source: "plan",
    p_source_id: `e2e-${randomUUID()}`,
    p_amount: 1200,
    p_expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (grantError) throw grantError;
  return { email, password, agencyId: agency.id, businessId: business.id };
}

async function logIn(page: Page) {
  const s = await seed();
  await page.goto("/login?next=/settings");
  await page.locator("#email").fill(s.email);
  await page.locator("#password").fill(s.password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/settings");
  return s;
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("settings is in the menu, the old address redirects, and the account shows how you sign in", async ({ page }) => {
  const s = await logIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByTestId("account-email")).toHaveText(s.email);
  await expect(page.getByText("Signed in with email or Google")).toBeVisible();
  await expect(page.getByText(/Supabase/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Billing/ })).toHaveAttribute("href", "/dashboard/billing");
  await expect(page.getByRole("link", { name: "Contact support to delete" })).toBeVisible();

  if (page.viewportSize()!.width >= 1024) {
    await expect(page.locator("aside").getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  }
  await page.goto("/dashboard/settings");
  await page.waitForURL((url) => url.pathname === "/settings");
});

test("edit the business profile, with a warning when the website changes", async ({ page }) => {
  const s = await logIn(page);
  const form = page.getByRole("form", { name: "Business profile" });
  await form.getByLabel("Business name").fill("Northside Plumbing & Heating");
  await form.getByLabel("Services").fill("Drain cleaning, Water heaters");
  await form.getByLabel("State or region").fill("TX");
  await form.getByLabel("Phone").fill("(512) 555-0100");
  await form.getByLabel("Website").fill("https://northside.example/");
  await expect(page.getByTestId("website-warning")).toHaveCount(0);
  await form.getByLabel("Website").fill("https://www.northside-plumbing.com/");
  await expect(page.getByTestId("website-warning")).toContainText("look for www.northside-plumbing.com in AI answers instead of northside.example");

  await form.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Business profile saved")).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(form.getByLabel("Website")).toHaveValue("www.northside-plumbing.com");
  await expect(form.getByLabel("Services")).toHaveValue("Drain cleaning, Water heaters");
  const { data } = await db.from("businesses").select("name, domain, services, primary_region, phone").eq("id", s.businessId).single();
  expect(data).toEqual({
    name: "Northside Plumbing & Heating",
    domain: "www.northside-plumbing.com",
    services: ["Drain cleaning", "Water heaters"],
    primary_region: "TX",
    phone: "(512) 555-0100",
  });
});

test("change models and frequency, seeing the credit effect before saving", async ({ page }) => {
  const s = await logIn(page);
  const form = page.getByRole("form", { name: "AI checks" });
  const estimate = page.getByTestId("credit-estimate");
  await expect(estimate).toContainText("About 155");
  await expect(estimate).toContainText("13% of the 1,200 credits your Starter plan adds each month.");
  await expect(form.getByRole("button", { name: "Save AI checks" })).toBeDisabled();

  await form.getByText("Daily", { exact: true }).click();
  await expect(estimate).toContainText("About 1,080");
  await expect(page.getByTestId("estimate-change")).toHaveText("925 more than now (155)");

  await form.getByRole("checkbox", { name: /Claude/ }).uncheck();
  await expect(form).toContainText("You won't see whether Claude recommends you.");
  await expect(estimate).toContainText("About 720");

  await form.getByRole("button", { name: "Save AI checks" }).click();
  await expect(page.getByText("AI check settings saved")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("estimate-change")).toHaveCount(0);

  await page.reload();
  await expect(estimate).toContainText("About 720");
  const { data } = await db.from("businesses").select("models, scan_frequency").eq("id", s.businessId).single();
  expect(data).toEqual({ models: ["openai", "perplexity"], scan_frequency: "daily" });
});

test("rename the agency and upload a logo; other files are refused", async ({ page }) => {
  const s = await logIn(page);
  const nameForm = page.getByRole("form", { name: "Agency name" });
  await nameForm.getByLabel("Agency name").fill("Blue Door Digital");
  await nameForm.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Agency name saved")).toBeVisible({ timeout: 15_000 });

  const picker = page.locator("input[type=file]");
  await picker.setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg onload='alert(1)'/>") });
  await expect(page.getByText("That file type isn't supported.")).toBeVisible({ timeout: 15_000 });

  await picker.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG_1PX });
  await expect(page.getByText("Logo uploaded")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("agency-logo")).toBeVisible();

  const { data } = await db.from("agencies").select("name, logo_url").eq("id", s.agencyId).single();
  expect(data?.name).toBe("Blue Door Digital");
  expect(data?.logo_url).toContain(`/business-logos/agencies/${s.agencyId}/logo?v=`);
  const image = await fetch(data!.logo_url!);
  expect(image.headers.get("content-type")).toBe("image/png");
});
