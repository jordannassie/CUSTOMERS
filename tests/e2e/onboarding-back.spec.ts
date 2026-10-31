import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Back from every setup step, then Continue again, with and without changes (2026-10-16), against the local stack in
// fixture mode like onboarding.spec.ts: never an error page, one business, competitors and questions as expected.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const userIds: string[] = [];
const slow = expect.configure({ timeout: 30_000 });

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

const HEADINGS = {
  agency: "Welcome. What's your agency called?",
  website: "Which business should we check?",
  details: "Check your business details",
  competitors: "Who do you compete with?",
  questions: "What do your customers ask AI?",
  models: /Choose the AI to check/,
} as const;
type Step = keyof typeof HEADINGS;

const visible = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).filter({ visible: true }).last();

// The dev server's "N" badge sits bottom-left on a phone, over the competitors step's Back (only in development, never
// on the live site), so it is hidden here.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
  });
});

async function at(page: Page, step: Step) {
  await slow(page.getByRole("heading", { level: 1, name: HEADINGS[step] })).toBeVisible();
  await expect(page.getByText("This step didn't load")).toHaveCount(0);
}

// The Back link, or on a phone where a step keeps only Continue in reach, the same address it links to.
async function back(page: Page, to: Step) {
  const link = page.getByRole("link", { name: "Back", exact: true }).filter({ visible: true });
  if (await link.count()) await link.first().click();
  else await page.goto(`/onboarding/${to}`);
  await at(page, to);
}

async function signIn(page: Page) {
  const email = `e2e-onboarding-back-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  await page.goto("/login?next=/onboarding");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await at(page, "agency");
  return data.user.id;
}

async function businesses(userId: string) {
  const { data } = await db.from("businesses").select("id, domain, services, primary_city").eq("owner_user_id", userId).throwOnError();
  return data ?? [];
}
const competitors = async (businessId: string) =>
  ((await db.from("business_competitors").select("name").eq("business_id", businessId).order("name").throwOnError()).data ?? []).map((c) => c.name);
const questions = async (businessId: string) =>
  ((await db.from("tracked_prompts").select("id").eq("business_id", businessId).eq("active", true).order("id").throwOnError()).data ?? []).map((q) => q.id);

test("Back from every step, then Continue again: one business, questions rebuilt only for new details", async ({ page }) => {
  test.setTimeout(240_000);
  const userId = await signIn(page);
  await page.locator("#agency-name").fill("Back Test Agency");
  await visible(page, "Continue").click();
  await at(page, "website");
  await page.locator("#website").fill("www.sunrise-coffee.example");
  await visible(page, "Find my business").click();
  await at(page, "details");
  await slow(page.locator("#name")).toHaveValue("Sunrise Coffee Bar & Roastery");
  await visible(page, "Continue").click();
  await at(page, "competitors");
  await page.getByRole("checkbox").filter({ visible: true }).first().check();
  await visible(page, "Continue").click();
  await at(page, "questions");
  await expect(page.getByRole("textbox", { name: /^Question \d+$/ })).toHaveCount(12);
  await visible(page, "Continue").click();
  await at(page, "models");

  const [business] = await businesses(userId);
  const firstQuestions = await questions(business.id);
  expect(firstQuestions).toHaveLength(12);
  expect(await competitors(business.id)).toHaveLength(1);

  // Back through every step to the agency, each showing what was saved, then Continue all the way with no change.
  await back(page, "questions");
  await expect(page.getByTestId("questions-updated")).toHaveCount(0);
  await back(page, "competitors");
  await expect(page.getByRole("list", { name: "Picked competitors" }).filter({ visible: true }).getByRole("listitem")).toHaveCount(1);
  await back(page, "details");
  await expect(page.locator("#name")).toHaveValue("Sunrise Coffee Bar & Roastery");
  await back(page, "website");
  await expect(page.locator("#website")).toHaveValue("sunrise-coffee.example");
  await back(page, "agency");
  await expect(page.locator("#agency-name")).toHaveValue("Back Test Agency");
  for (const [button, next] of [
    ["Continue", "website"],
    ["Find my business", "details"],
    ["Continue", "competitors"],
    ["Continue", "questions"],
  ] as const) {
    await visible(page, button).click();
    await at(page, next);
  }
  await expect(page.getByTestId("questions-updated")).toHaveCount(0);
  expect(await businesses(userId)).toHaveLength(1);
  expect(await competitors(business.id)).toHaveLength(1);
  expect(await questions(business.id)).toEqual(firstQuestions);

  // A changed competitor list keeps the questions.
  await back(page, "competitors");
  await page.getByRole("checkbox").filter({ visible: true }).nth(1).check();
  await visible(page, "Continue").click();
  await at(page, "questions");
  await expect(page.getByTestId("questions-updated")).toHaveCount(0);
  expect(await competitors(business.id)).toHaveLength(2);
  expect(await questions(business.id)).toEqual(firstQuestions);

  // New services: the suggested questions are rebuilt, and the questions step says so once.
  await back(page, "competitors");
  await back(page, "details");
  await page.locator("#services").fill("espresso, cold brew, wedding catering");
  await visible(page, "Continue").click();
  await at(page, "competitors");
  await visible(page, "Continue").click();
  await at(page, "questions");
  await expect(page.getByTestId("questions-updated")).toBeVisible();
  const rebuilt = await questions(business.id);
  expect(rebuilt.length).toBeGreaterThan(0);
  expect(rebuilt.some((id) => firstQuestions.includes(id))).toBe(false);
  expect(await competitors(business.id)).toHaveLength(2);
  await visible(page, "Continue").click();
  await at(page, "models");
  await back(page, "questions");
  await expect(page.getByTestId("questions-updated")).toHaveCount(0);

  // Another website: the same draft starts over for it, still one business.
  await back(page, "competitors");
  await back(page, "details");
  await back(page, "website");
  await page.locator("#website").fill("orange-florist.example");
  await visible(page, "Find my business").click();
  await at(page, "details");
  await expect(page.locator("#name")).toHaveValue("");
  const after = await businesses(userId);
  expect(after).toEqual([expect.objectContaining({ id: business.id, domain: "orange-florist.example", services: [], primary_city: null })]);
  expect(await competitors(business.id)).toEqual([]);
  expect(await questions(business.id)).toEqual([]);
});

test("a double click on each Continue saves once: one business, one competitor list, one question set", async ({ page }) => {
  test.setTimeout(180_000);
  const userId = await signIn(page);
  await page.locator("#agency-name").fill("Double Click Agency");
  await visible(page, "Continue").dblclick();
  await at(page, "website");
  await page.locator("#website").fill("sunrise-coffee.example");
  await visible(page, "Find my business").dblclick();
  await at(page, "details");
  await slow(page.locator("#name")).toHaveValue("Sunrise Coffee Bar & Roastery");
  await visible(page, "Continue").dblclick();
  await at(page, "competitors");
  await page.getByRole("checkbox").filter({ visible: true }).first().check();
  await visible(page, "Continue").dblclick();
  await at(page, "questions");
  await page.getByRole("textbox", { name: "Add a question" }).fill("Which coffee shop in Springfield opens at 6am?");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await visible(page, "Continue").dblclick();
  await at(page, "models");

  const all = await businesses(userId);
  expect(all).toHaveLength(1);
  const { count } = await db.from("agencies").select("id", { count: "exact", head: true }).eq("owner_user_id", userId);
  expect(count).toBe(1);
  expect(await competitors(all[0].id)).toHaveLength(1);
  expect(await questions(all[0].id)).toHaveLength(13);
});
