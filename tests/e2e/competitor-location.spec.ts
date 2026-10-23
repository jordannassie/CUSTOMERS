import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Competitors follow the business's location (2026-10-16), in fixture mode like onboarding-back.spec.ts: set up in
// Austin, pick an Austin and a Dallas business and one by name, go Back and move to Dallas. The Austin pick is removed
// and the competitors step says so once; the Dallas pick stays and the typed one asks to be checked.
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
  details: "Check your business details",
  competitors: "Who do you compete with?",
  questions: "What do your customers ask AI?",
} as const;
type Step = keyof typeof HEADINGS;

const visible = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).filter({ visible: true }).last();
const picked = (page: Page) => page.getByRole("list", { name: "Picked competitors" }).filter({ visible: true });

// The dev server's "N" badge sits over the competitors step's Back on a phone (development only).
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

async function back(page: Page, to: Step) {
  const link = page.getByRole("link", { name: "Back", exact: true }).filter({ visible: true });
  if (await link.count()) await link.first().click();
  else await page.goto(`/onboarding/${to}`);
  await at(page, to);
}

async function find(page: Page, name: string) {
  await page.locator("#competitor-name").fill(name);
  await page.getByRole("search", { name: "Find a competitor by name" }).getByRole("button", { name: "Find" }).click();
}

test("moving from Austin to Dallas removes the Austin pick and says so once", async ({ page }, info) => {
  test.setTimeout(240_000);
  const email = `e2e-competitor-location-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  await page.goto("/login?next=/onboarding");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();

  await slow(page.locator("#agency-name")).toBeVisible();
  await page.locator("#agency-name").fill("Location Test Agency");
  await visible(page, "Continue").click();
  await slow(page.locator("#website")).toBeVisible();
  await page.locator("#website").fill("sunrise-coffee.example");
  await visible(page, "Find my business").click();
  await at(page, "details");
  await slow(page.locator("#name")).toHaveValue("Sunrise Coffee Bar & Roastery");
  await page.locator("#city").fill("Austin");
  await page.locator("#state").fill("TX");
  await visible(page, "Continue").click();
  await at(page, "competitors");
  await expect(page.getByTestId("competitors-moved")).toHaveCount(0);
  // BUG-090: one visible Continue at every width, never the phone bar's and the desktop one together.
  const start = page.viewportSize()!;
  const widths = info.project.name === "mobile" ? [start.width] : [1440, 1024, 900, 768, 640];
  for (const width of widths) {
    await page.setViewportSize({ width, height: start.height });
    await expect(page.getByRole("button", { name: "Continue", exact: true }).filter({ visible: true }), `${width}px`).toHaveCount(1);
  }
  await page.setViewportSize(start);

  // One business in Austin and one in Dallas from Google, and one added by name.
  await find(page, "Austin Bean");
  await page.getByRole("button", { name: "Add Austin Bean Co" }).click();
  await find(page, "Dallas Roast");
  await page.getByRole("button", { name: "Add Dallas Roast Co" }).click();
  await find(page, "Corner Cafe");
  await page.getByRole("button", { name: 'Add "Corner Cafe" as typed' }).click();
  await expect(picked(page).getByRole("listitem")).toHaveCount(3);
  await visible(page, "Continue").click();
  await at(page, "questions");

  const { data: business } = await db.from("businesses").select("id").eq("owner_user_id", data.user.id).single().throwOnError();
  const competitors = async () =>
    ((await db.from("business_competitors").select("name").eq("business_id", business.id).order("name").throwOnError()).data ?? []).map((c) => c.name);
  expect(await competitors()).toEqual(["Austin Bean Co", "Corner Cafe", "Dallas Roast Co"]);

  // Back to the details and move to Dallas.
  await back(page, "competitors");
  await back(page, "details");
  await page.locator("#city").fill("Dallas");
  await visible(page, "Continue").click();
  await at(page, "competitors");
  await expect(page.getByTestId("competitors-moved")).toHaveText("We removed 1 competitor from Austin. The suggestions below are near Dallas.");
  const list = picked(page);
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list.getByText("Austin Bean Co")).toHaveCount(0);
  await expect(list.getByRole("listitem").filter({ hasText: "Dallas Roast Co" })).toBeVisible();
  await expect(list.getByRole("listitem").filter({ hasText: "Corner Cafe" })).toContainText("Added by name: check it is near Dallas");
  expect(await competitors()).toEqual(["Corner Cafe", "Dallas Roast Co"]);
  await page.screenshot({ path: info.outputPath("moved.png"), fullPage: true });

  // Continue confirms the list for Dallas: back on the step, the note and the check line are gone.
  await visible(page, "Continue").click();
  await at(page, "questions");
  await back(page, "competitors");
  await expect(page.getByTestId("competitors-moved")).toHaveCount(0);
  await expect(picked(page).getByRole("listitem").filter({ hasText: "Corner Cafe" })).toContainText("Added by name");
  await expect(picked(page).getByText("check it is near")).toHaveCount(0);
  expect(await competitors()).toEqual(["Corner Cafe", "Dallas Roast Co"]);
});
