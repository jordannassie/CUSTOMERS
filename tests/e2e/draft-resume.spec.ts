import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type Route } from "@playwright/test";

// Unfinished drafts never block or get lost (D-16, 2026-10-16), against the local stack in fixture mode like
// onboarding.spec.ts: a refresh during auto-fill, Add a business, the plan picker and the switcher all lead back to the
// agency's one draft, and a trial with 1 set-up business and a draft can finish it.
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
  website: "Which business should we check?",
  details: "Check your business details",
  models: /Choose the AI to check/,
} as const;

const visible = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).filter({ visible: true }).last();
const at = (page: Page, step: keyof typeof HEADINGS) => slow(page.getByRole("heading", { level: 1, name: HEADINGS[step] })).toBeVisible();

async function newUser() {
  const email = `e2e-draft-resume-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function signIn(page: Page, user: { email: string; password: string }, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.locator("button[type=submit]").click();
}

/** A trial test agency (D-61, no Stripe) with `setUp` set-up businesses and one draft saved up to the AI models step. */
async function trialWithDraft(page: Page, setUp: number, draft: { name: string; domain: string | null }) {
  const user = await newUser();
  const { data: agency } = await db
    .from("agencies")
    .insert({ owner_user_id: user.id, name: "Draft test agency", is_test: true, status: "trialing" })
    .select("id")
    .single()
    .throwOnError();
  let firstId = "";
  for (let i = 0; i < setUp; i++) {
    const { data } = await db
      .from("businesses")
      .insert({ owner_user_id: user.id, agency_id: agency.id, name: i === 0 ? "Northside Plumbing" : `Business ${i}`, status: "active", domain: `${randomUUID().slice(0, 8)}.example.test` })
      .select("id")
      .single()
      .throwOnError();
    firstId ||= data.id;
  }
  const { data: made } = await db
    .from("businesses")
    .insert({ owner_user_id: user.id, agency_id: agency.id, ...draft, status: "onboarding", onboarding_step: 7, primary_city: "Austin" })
    .select("id")
    .single()
    .throwOnError();
  // What the website step does for a business after the first: the set-up one stays on screen (keepActiveBusiness).
  await db.from("profiles").update({ active_business_id: firstId }).eq("id", user.id).throwOnError();
  return { user, draftId: made.id };
}

const statusOf = async (id: string) => (await db.from("businesses").select("status").eq("id", id).single().throwOnError()).data.status;

test("a refresh during auto-fill comes back to the draft with its website filled", async ({ page }) => {
  const user = await newUser();
  await signIn(page, user, "/onboarding");
  await page.waitForURL("**/onboarding/agency");
  await page.locator("#agency-name").fill("Blue Door Marketing");
  await visible(page, "Continue").click();
  await at(page, "website");

  // The website step's save is held mid-way: the server has made the draft and is still reading the website.
  let held: Route | null = null;
  const draftMade = new Promise<void>((resolve) => {
    void page.route("**/onboarding/website", async (route) => {
      if (route.request().method() !== "POST" || held) return route.fallback();
      held = route;
      const { data: agency } = await db.from("agencies").select("id").eq("owner_user_id", user.id).single().throwOnError();
      await db
        .from("businesses")
        .insert({ owner_user_id: user.id, agency_id: agency.id, name: "sunrise-coffee.example", domain: "sunrise-coffee.example", has_website: true, status: "onboarding", onboarding_step: 4 })
        .throwOnError();
      resolve();
    });
  });
  await page.locator("#website").fill("www.sunrise-coffee.example");
  await visible(page, "Find my business").click();
  await draftMade;

  await page.reload();
  await (held as Route | null)?.abort().catch(() => {});
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await at(page, "website");
  await expect(page.getByTestId("upgrade-note")).toHaveCount(0);
  await expect(page.locator("#website")).toHaveValue("sunrise-coffee.example");

  // Continue carries on with the same draft and auto-fill fills the details.
  await visible(page, "Find my business").click();
  await at(page, "details");
  await slow(page.locator("#name")).toHaveValue("Sunrise Coffee Bar & Roastery");
  const rows = (await db.from("businesses").select("id").eq("owner_user_id", user.id).throwOnError()).data ?? [];
  expect(rows).toHaveLength(1);

  // A direct visit later goes back to the website step of the same draft, never a blank form.
  await page.goto("/onboarding/website");
  await at(page, "website");
  await expect(page.locator("#website")).toHaveValue("sunrise-coffee.example");
});

test("a trial with 1 set-up business and a draft goes back to the draft and finishes it", async ({ page }) => {
  const { user, draftId } = await trialWithDraft(page, 1, { name: "Harbor Dental", domain: "harbor-dental.example" });
  await signIn(page, user, "/competitors");
  await page.waitForURL((url) => url.pathname === "/competitors");

  // Add a business, and the new-business plan picker, both continue the draft where it stopped.
  await page.goto("/onboarding?add=1");
  await page.waitForURL("**/onboarding/models");
  await page.goto("/settings/billing/plans/new-business");
  await page.waitForURL("**/onboarding/models");

  // The website step, by URL, shows the draft's website: the trial limit never counts the draft.
  await page.goto("/onboarding/website");
  await at(page, "website");
  await expect(page.getByTestId("upgrade-note")).toHaveCount(0);
  await expect(page.locator("#website")).toHaveValue("harbor-dental.example");

  await page.goto("/onboarding/models");
  await at(page, "models");
  await visible(page, "Finish setup").click();
  await page.waitForURL((url) => url.pathname === "/onboarding/first-scan", { timeout: 30_000 });
  expect(await statusOf(draftId)).toBe("active");
});

test("a trial with 2 set-up businesses keeps its draft and says to upgrade at the finish", async ({ page }) => {
  const { user, draftId } = await trialWithDraft(page, 2, { name: "Harbor Dental", domain: "harbor-dental.example" });
  await signIn(page, user, "/onboarding/models");
  await page.waitForURL("**/onboarding/models");
  await expect(page.getByTestId("upgrade-note")).toContainText("Your trial includes 2 businesses. Upgrade to add more.");
  await expect(page.getByTestId("upgrade-note")).toContainText("This business is saved.");
  await expect(page.getByRole("button", { name: "Finish setup" })).toHaveCount(0);
  expect(await statusOf(draftId)).toBe("onboarding");
});

// The sidebar on desktop, the sheet behind the menu button on a phone (lg breakpoint in AppShell).
async function openSwitcher(page: Page) {
  if (page.viewportSize()!.width < 1024) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByTestId("business-switcher").filter({ visible: true }).click();
}

test("the switcher offers Finish setting up for the open draft", async ({ page }) => {
  // The name is still the website until the details step: the label uses the domain.
  const { user } = await trialWithDraft(page, 1, { name: "harbor-dental.example", domain: "harbor-dental.example" });
  await signIn(page, user, "/competitors");
  await page.waitForURL((url) => url.pathname === "/competitors");

  await openSwitcher(page);
  const item = page.getByTestId("switcher-draft");
  await expect(item).toHaveText("Finish setting up harbor-dental.example");
  await expect(page.getByRole("menuitem", { name: "Add business" })).toHaveCount(0);
  // Drafts stay out of the list of businesses to switch to.
  await expect(page.getByTestId("switcher-item")).toHaveCount(1);
  await expect(page.getByTestId("switcher-item")).toContainText("Northside Plumbing");
  await item.click();
  await page.waitForURL("**/onboarding/models");
  await at(page, "models");
});

test("the switcher's Add business starts a new business when there is no draft", async ({ page }) => {
  const { user, draftId } = await trialWithDraft(page, 1, { name: "", domain: null });
  await db.from("businesses").delete().eq("id", draftId).throwOnError();
  await signIn(page, user, "/competitors");
  await page.waitForURL((url) => url.pathname === "/competitors");

  await openSwitcher(page);
  await expect(page.getByTestId("switcher-draft")).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Add business" }).click();
  await page.waitForURL("**/onboarding/website");
  await at(page, "website");
  await expect(page.locator("#website")).toHaveValue("");
});
