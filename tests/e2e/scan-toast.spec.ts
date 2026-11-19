import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// The scan-finished toast (ScanWatcher), against the local Supabase stack only, with the dev server on .env.test.local
// values and WORKER_IN_PROCESS=true. Each test seeds its own is_test agency, so scans use recorded answers (D-61).
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const MODELS = ["openai", "anthropic", "perplexity"] as const;
// Worded like the recorded answers in tests/fixtures/ai-answers, so Run scan finds a close match.
const QUESTIONS = [
  "What is the best coffee shop in Orange, CA?",
  "Where can I find a quiet cafe to work from in Orange, CA?",
  "Which coffee shop in Orange, CA has the best cold brew?",
];
const userIds: string[] = [];

type Business = { id: string; prompts: string[] };

async function seedBusiness(page: Page, credits = 200): Promise<Business> {
  const email = `e2e-scan-toast-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);

  const { data: agency } = await db
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Scan toast test agency", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await db
    .from("businesses")
    .insert({
      owner_user_id: user.user.id,
      agency_id: agency.id,
      name: "Bean There Coffee",
      status: "active",
      industry: "coffee shop",
      domain: "beantherecoffee.example",
      primary_city: "Orange",
      primary_region: "CA",
      primary_country: "United States",
      models: [...MODELS],
    })
    .select("id")
    .single()
    .throwOnError();
  const { data: prompts } = await db
    .from("tracked_prompts")
    // Suggested questions: only these count in the score (BUG-129).
    .insert(QUESTIONS.map((prompt) => ({ business_id: business.id, prompt, source: "library" })))
    .select("id")
    .throwOnError();
  const { error: grantError } = await db.rpc("grant_credits", {
    p_agency_id: agency.id,
    p_source: "admin",
    p_source_id: `e2e-${randomUUID()}`,
    p_amount: credits,
    p_expires_at: null,
  });
  if (grantError) throw grantError;

  await page.goto("/login?next=/dashboard");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/dashboard");
  // The dev server compiles the page on its first visit, which can take far longer than an assertion's 5s.
  await expect(page.getByRole("heading", { level: 1, name: "Bean There Coffee" })).toBeVisible({ timeout: 60_000 });
  return { id: business.id, prompts: prompts.map((p) => p.id) };
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("Scan finished toast shows on another page after leaving the Overview", async ({ page }, info: TestInfo) => {
  await seedBusiness(page);
  // The dev server compiles a page on its first visit; warm it so leaving the Overview is as quick as in production.
  await page.goto("/questions");
  await expect(page.getByRole("heading", { level: 1, name: "Questions" })).toBeVisible({ timeout: 60_000 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Run first scan" }).click();
  await expect(page.getByRole("button", { name: /Scanning/ })).toBeVisible();
  // Leave right away with a client-side navigation, as the onboarding screen invites.
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Questions" }).filter({ visible: true }).first().click();
  await page.waitForURL((u) => u.pathname === "/questions");
  await expect(page.getByRole("button", { name: /Scanning/ })).toHaveCount(0);
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Scan finished for Bean There Coffee." });
  await expect(toast).toBeVisible({ timeout: 90_000 });
  await expect(toast).toContainText("Your score and answers are up to date.");
  await toast.getByRole("button", { name: "View" }).click();
  await page.waitForURL((u) => u.pathname === "/dashboard");
  await expect(page.getByTestId("score-summary")).toBeVisible({ timeout: 30_000 });
});

test("Scan finished on the Overview: inline note and toast, with no View button", async ({ page }) => {
  await seedBusiness(page);
  await page.getByRole("button", { name: "Run first scan" }).click();
  await expect(page.getByTestId("score-summary")).toBeVisible({ timeout: 90_000 });
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Scan finished" });
  await expect(toast).toBeVisible();
  await expect(toast.getByRole("button", { name: "View" })).toHaveCount(0);
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Scan finished" })).toHaveCount(1);
});
