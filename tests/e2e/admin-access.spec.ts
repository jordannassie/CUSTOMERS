import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// BUG-020 and BUG-021 against the local Supabase stack, like app-shell.spec.ts. The dev server and this run share
// ADMIN_EMAILS (set in CI) with one admin per project, since projects run in parallel.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
const userIds: string[] = [];

async function createUser(email: string) {
  const password = `pw-${randomUUID()}`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency, error: agencyError } = await db
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Admin access test", is_test: true, status: "active" })
    .select("id")
    .single();
  if (agencyError) throw agencyError;
  const { error: bizError } = await db
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Northside Plumbing", status: "active" });
  if (bizError) throw bizError;
  return password;
}

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname.startsWith("/dashboard"));
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("a logged-out visitor goes to login", async ({ page }) => {
  await page.goto("/internal/admin/settings");
  await expect(page).toHaveURL((url) => url.pathname === "/login");
});

test("a signed-in non-admin lands on the dashboard", async ({ page }) => {
  const email = `e2e-nonadmin-${randomUUID()}@example.test`;
  await logIn(page, email, await createUser(email));

  for (const path of ["/internal/admin", "/internal/admin/settings", "/internal/admin/businesses"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL((url) => url.pathname === "/dashboard");
  }
});

test("a signed-in user whose account is gone lands on login once, not in a loop", async ({ page }) => {
  const email = `e2e-deleted-${randomUUID()}@example.test`;
  await logIn(page, email, await createUser(email));
  await db.auth.admin.deleteUser(userIds.pop()!);

  const visits: string[] = [];
  page.on("request", (r) => {
    if (r.isNavigationRequest()) visits.push(new URL(r.url()).pathname);
  });
  await page.goto("/internal/admin/settings");
  await expect(page).toHaveURL((url) => url.pathname === "/login");
  await page.waitForTimeout(3000);
  expect(visits).toEqual(["/internal/admin/settings", "/login"]);
});

test("an admin sees the admin overview", async ({ page }, testInfo) => {
  const adminEmail = `e2e-admin-${testInfo.project.name}@example.test`;
  test.skip(!adminEmails.includes(adminEmail), `Skipped: add ${adminEmail} to ADMIN_EMAILS for the dev server and this run.`);
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const stale = data.users.find((u) => u.email === adminEmail);
  if (stale) await db.auth.admin.deleteUser(stale.id);

  await logIn(page, adminEmail, await createUser(adminEmail));
  await page.goto("/internal/admin");
  await expect(page).toHaveURL((url) => url.pathname === "/internal/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
});
