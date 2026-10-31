import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

// EMAIL-01 (2026-10-20): Settings, Emails turns the weekly report off and on, and the choice is saved at once.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const userIds: string[] = [];

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("turn the weekly report off and on again; it stays as set after a reload", async ({ page }) => {
  const email = `e2e-emails-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);
  const { data: agency } = await db
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Blue Door Marketing", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  await db
    .from("businesses")
    .insert({ owner_user_id: user.user.id, agency_id: agency.id, name: "Northside Plumbing", status: "active", primary_city: "Austin" })
    .throwOnError();
  const saved = async () => (await db.from("agencies").select("weekly_report_emails").eq("id", agency.id).single().throwOnError()).data.weekly_report_emails;

  await page.goto("/login?next=/settings");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/settings");

  const section = page.getByRole("region", { name: "Emails" });
  const toggle = section.getByRole("switch", { name: "Weekly report" });
  await expect(toggle).toBeChecked();

  await toggle.click();
  await expect(page.getByText("Weekly report turned off")).toBeVisible({ timeout: 15_000 });
  await expect(toggle).not.toBeChecked();
  await expect.poll(saved).toBe(false);

  await page.reload();
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(page.getByText("Weekly report turned on")).toBeVisible({ timeout: 15_000 });
  await expect.poll(saved).toBe(true);
});
