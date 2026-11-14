import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";

// BUG-278, BUG-279 and BUG-286 against the local Supabase stack: admin history rows written around the change, the
// question limit under two clicks at once, and the admin business pages for an admin.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
const userIds: string[] = [];
const ACTION = { timeout: 30_000 };
const shots = process.env.AUDIT_SHOTS_DIR;

async function createOwner(email: string, status = "active") {
  for (let p = 1; ; p++) {
    const { data } = await db.auth.admin.listUsers({ page: p, perPage: 1000 });
    const stale = data.users.find((u) => u.email === email);
    if (stale) await db.auth.admin.deleteUser(stale.id);
    if (stale || data.users.length < 1000) break;
  }
  const password = `pw-${randomUUID()}`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await db
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Audit fixes agency", is_test: true, status })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await db
    .from("businesses")
    .insert({
      owner_user_id: data.user.id,
      agency_id: agency.id,
      name: "Bean There Coffee",
      status: "active",
      industry: "coffee_shop",
      primary_city: "Orange",
      primary_region: "CA",
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single()
    .throwOnError();
  return { password, agencyId: agency.id as string, businessId: business.id as string };
}

async function logIn(page: Page, email: string, password: string, next = "/dashboard") {
  await page.goto(`/login?next=${next}`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === next, { timeout: 60_000 });
}

const shot = async (page: Page, name: string, testInfo: { project: { name: string } }) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}-${testInfo.project.name}.png`, fullPage: true });
};

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("two adds at once at 24 of 25 questions save only one (BUG-279)", async ({ browser }, testInfo) => {
  const email = `e2e-limit-${randomUUID()}@example.test`;
  const owner = await createOwner(email);
  await db
    .from("tracked_prompts")
    .insert(Array.from({ length: 24 }, (_, i) => ({ business_id: owner.businessId, prompt: `Best coffee question ${i + 1}`, source: "library", active: true })))
    .throwOnError();

  const context = await (browser as Browser).newContext({ viewport: testInfo.project.use.viewport ?? undefined });
  const [first, second] = [await context.newPage(), await context.newPage()];
  await logIn(first, email, owner.password, "/questions");
  await second.goto("/questions");
  for (const [page, text] of [[first, "Which cafe in Orange has the best cold brew"], [second, "Where can I get oat milk lattes in Orange"]] as const) {
    await expect(page.getByRole("heading", { level: 1, name: "Questions" })).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Add your own question").fill(text);
  }
  const form = (page: Page) => page.getByRole("form", { name: "Add a question" }).getByRole("button", { name: "Add question" });
  await Promise.all([form(first).click(), form(second).click()]);

  const refused = [first, second].map((p) => p.getByRole("alert").filter({ hasText: /plan includes 25 questions/ }));
  await expect.poll(async () => (await refused[0].count()) + (await refused[1].count()), ACTION).toBe(1);
  const { count } = await db.from("tracked_prompts").select("id", { count: "exact", head: true }).eq("business_id", owner.businessId).eq("active", true);
  expect(count).toBe(25);
  await first.reload();
  await expect(first.getByTestId("question-limit")).toBeVisible(ACTION);
  await shot(first, "questions-at-limit", testInfo);
  await context.close();
});

test("admin history records a suspend, and marks a change that did not go through (BUG-278)", async ({ page }, testInfo) => {
  const adminEmail = `e2e-admin-${testInfo.project.name}@example.test`;
  test.skip(!adminEmails.includes(adminEmail), `Skipped: add ${adminEmail} to ADMIN_EMAILS for the dev server and this run.`);
  const admin = await createOwner(adminEmail);
  const target = await createOwner(`e2e-target-${randomUUID()}@example.test`, "past_due");
  await logIn(page, adminEmail, admin.password);

  await page.goto(`/internal/admin/agencies/${target.agencyId}`);
  await page.getByRole("button", { name: "Suspend", exact: true }).click();
  await page.getByRole("textbox", { name: "Reason" }).fill("Audit check suspend");
  await page.getByRole("button", { name: "Suspend agency" }).click();
  await expect(page.getByRole("button", { name: "Unsuspend", exact: true })).toBeVisible(ACTION);

  const { data: rows } = await db.from("admin_audit_log").select("action, outcome").eq("target_id", target.agencyId).throwOnError();
  expect(rows).toEqual([{ action: "agency.suspend", outcome: "done" }]);

  // A change whose row was never finished, and one that did not go through, as a failed write would leave them.
  await db
    .from("admin_audit_log")
    .insert([
      { action: "agency.mark_test", target_type: "agency", target_id: target.agencyId, outcome: "started", details: { reason: "Started only" } },
      { action: "agency.restore", target_type: "agency", target_id: target.agencyId, outcome: "failed", details: { reason: "Refused restore", error: "status changed meanwhile" } },
    ])
    .throwOnError();
  await page.reload();
  const history = page.getByRole("listitem").filter({ hasText: "Refused restore" });
  await expect(history).toContainText("Did not go through", ACTION);
  await expect(page.getByRole("listitem").filter({ hasText: "Started only" })).toContainText("Result not confirmed");
  await expect(page.getByRole("listitem").filter({ hasText: "Audit check suspend" })).not.toContainText(/Did not go through|Result not confirmed/);
  await history.scrollIntoViewIfNeeded();
  await shot(page, "admin-history", testInfo);

  // The admin business list and detail still open for an admin (BUG-286).
  await page.goto("/internal/admin/businesses");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible(ACTION);
  await page.goto(`/internal/admin/businesses/${target.businessId}`);
  await expect(page.getByText("Bean There Coffee").first()).toBeVisible(ACTION);
  await shot(page, "admin-business-detail", testInfo);
});
