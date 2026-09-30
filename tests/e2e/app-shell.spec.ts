import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// B-48 against the local Supabase stack only: the dev server must run with .env.test.local
// (see the PR), and every test seeds its own agency so a reset by another session cannot break it.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const DAY = 24 * 60 * 60 * 1000;
const userIds: string[] = [];

type Seed = { status: "active" | "trialing"; grant: number; spend: number; days: number };

async function rpc(fn: string, args: Record<string, unknown>) {
  const { error } = await db.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
}

async function seedAgency({ status, grant, spend, days }: Seed) {
  const email = `e2e-shell-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);

  const ends = new Date(Date.now() + days * DAY - 60_000).toISOString();
  const { data: agency, error: agencyError } = await db
    .from("agencies")
    .insert({
      owner_user_id: user.user.id,
      name: "Shell test agency",
      is_test: true,
      status,
      trial_ends_at: status === "trialing" ? ends : null,
      current_period_end: status === "active" ? ends : null,
    })
    .select("id")
    .single();
  if (agencyError) throw agencyError;

  const names = ["Northside Plumbing", "Riverbend Dental"];
  for (const name of names) {
    const { error: e } = await db
      .from("businesses")
      .insert({ owner_user_id: user.user.id, agency_id: agency.id, name, status: "active", domain: `${name.split(" ")[0].toLowerCase()}.example` });
    if (e) throw e;
  }

  await rpc("grant_credits", {
    p_agency_id: agency.id,
    p_source: status === "trialing" ? "trial" : "plan",
    p_source_id: `e2e-${randomUUID()}`,
    p_amount: grant,
    p_expires_at: ends,
  });
  if (spend) {
    await rpc("admin_adjust_credits", {
      p_agency_id: agency.id,
      p_delta: -spend,
      p_admin_user_id: user.user.id,
      p_note: "e2e spend",
      p_request_id: randomUUID(),
    });
  }
  return { email, password };
}

async function logIn(page: Page, seed: Seed) {
  const { email, password } = await seedAgency(seed);
  await page.goto("/login?next=/competitors");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/competitors");
}

// The sidebar on desktop, the sheet behind the menu button on a phone.
async function openNav(page: Page) {
  // lg breakpoint in AppShell.
  if (page.viewportSize()!.width < 1024) {
    await page.getByRole("button", { name: "Open menu" }).click();
    return page.getByRole("dialog", { name: "Menu" });
  }
  return page.locator("aside");
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("six menu items navigate, and switching business keeps the page", async ({ page }) => {
  await logIn(page, { status: "active", grant: 1200, spend: 620, days: 12 });

  let nav = await openNav(page);
  const links = nav.getByRole("navigation", { name: "Main" }).getByRole("link");
  await expect(links).toHaveText(["Overview", "Competitors", "Opportunities", "Questions", "Sources", "Settings"]);
  await expect(links.filter({ hasText: "Competitors" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Find anything")).toHaveCount(0);

  await links.filter({ hasText: "Opportunities" }).click();
  await page.waitForURL((url) => url.pathname === "/opportunities");
  await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);

  nav = await openNav(page);
  const switcher = nav.getByTestId("business-switcher");
  await expect(switcher).toContainText("Riverbend Dental");
  await switcher.click();
  await page.getByRole("menuitem", { name: "Northside Plumbing" }).click();
  await expect(page.getByTestId("business-switcher").first()).toContainText("Northside Plumbing");
  expect(new URL(page.url()).pathname).toBe("/opportunities");
});

test("usage widget: normal plan", async ({ page }) => {
  await logIn(page, { status: "active", grant: 1200, spend: 620, days: 12 });
  const widget = (await openNav(page)).getByTestId("usage-widget");
  await expect(widget).toHaveAttribute("data-tone", "normal");
  await expect(widget).toContainText("620 of 1,200 credits used");
  await expect(widget).toContainText("Renews in 12 days");
  await expect(widget.getByRole("link", { name: "Buy credits" })).toHaveCount(0);
  await expect(page.getByTestId("app-banners")).toHaveCount(0);
});

test("usage widget: trial", async ({ page }) => {
  await logIn(page, { status: "trialing", grant: 100, spend: 36, days: 5 });
  await expect(page.locator("[data-kind=trial]")).toContainText("Your free trial has 5 days and 64 trial credits left. Your card will be charged on");
  const widget = (await openNav(page)).getByTestId("usage-widget");
  await expect(widget).toContainText("Trial: 5 days left, 64 of 100 credits left");
});

test("usage widget: zero credits", async ({ page }) => {
  await logIn(page, { status: "active", grant: 1200, spend: 1200, days: 12 });
  await expect(page.locator("[data-kind=out_of_credits]")).toContainText("You're out of credits");
  const widget = (await openNav(page)).getByTestId("usage-widget");
  await expect(widget).toHaveAttribute("data-tone", "empty");
  await expect(widget).toContainText("No credits left");
  await expect(widget.getByRole("link", { name: "Buy credits" })).toBeVisible();
});

test("usage widget: negative balance", async ({ page }) => {
  await logIn(page, { status: "active", grant: 1200, spend: 1231, days: 12 });
  await expect(page.locator("[data-kind=out_of_credits]")).toContainText("You used 31 credits more than you had");
  const widget = (await openNav(page)).getByTestId("usage-widget");
  await expect(widget).toHaveAttribute("data-tone", "empty");
  await expect(widget).toContainText("31 credits over");
  await expect(widget.getByRole("link", { name: "Buy credits" })).toBeVisible();
});
