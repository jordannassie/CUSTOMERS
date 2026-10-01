import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// B-52 against the local Supabase stack only. Each test seeds its own is_test agency and opportunities,
// so no AI or Google call is made (D-61); run the dev server with PLACES_FIXTURES=true.
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const userIds: string[] = [];

type Seed = { hasWebsite: boolean; opportunities: boolean };

async function seed(page: Page, { hasWebsite, opportunities }: Seed): Promise<string> {
  const email = `e2e-opps-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);

  const { data: agency } = await db
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Opportunities test agency", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await db
    .from("businesses")
    .insert({
      owner_user_id: user.user.id,
      agency_id: agency.id,
      name: hasWebsite ? "Sunrise Coffee Bar" : "Nowhere Plumbing",
      status: "active",
      industry: hasWebsite ? "coffee_shop" : "plumber",
      domain: hasWebsite ? "sunrise-coffee.example" : null,
      has_website: hasWebsite,
      phone: hasWebsite ? "(217) 555-0142" : null,
      places_id: hasWebsite ? "ChIJ-fixture-sunrise-coffee" : null,
      primary_city: "Springfield",
      primary_region: "IL",
      models: ["openai", "anthropic", "perplexity"],
    })
    .select("id")
    .single()
    .throwOnError();

  if (opportunities) {
    const { data: rival } = await db
      .from("business_competitors")
      .insert({ business_id: business.id, name: "Bean House", places_id: "ChIJ-fixture-bean-house", source: "confirmed_place", confirmed: true })
      .select("id")
      .single()
      .throwOnError();
    await db
      .from("opportunities")
      .insert([
        {
          business_id: business.id,
          title: "Answer common questions on your site",
          impact: "low",
          category: "content",
          evidence: "AI named you in 1 of 6 answers.",
          recommended_action: "1. Add a short FAQ.\n2. Mention your city.",
        },
        {
          business_id: business.id,
          title: "Bean House has more Google reviews than you",
          impact: "high",
          category: "reviews_reputation",
          evidence: `Bean House was named in 5 of 6 AI answers. On Google, Bean House has {competitor.${rival.id}.review_count} reviews and you have {business.review_count}.`,
          description: "AI assistants lean on review counts to decide which local businesses are trusted.",
          recommended_action: "1. Ask every happy customer for a Google review.\n2. Reply to every new review.",
        },
        {
          business_id: business.id,
          title: "Your website does not show your phone number",
          impact: "medium",
          category: "service_page",
          evidence: "We read your website and did not find your phone number.",
          recommended_action: "1. Give each service its own section.\n2. Put your phone number in the footer.",
          claude_prompt: "Help me improve the services page for Sunrise Coffee Bar (sunrise-coffee.example) in Springfield. Leave a clear gap marked [fill in] for every fact I have not given you, and do not invent any details.",
        },
      ])
      .throwOnError();
  }

  await page.goto("/login?next=/opportunities");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/opportunities");
  await expect(page.getByRole("heading", { level: 1, name: "Opportunities" })).toBeVisible({ timeout: 60_000 });
  return business.id;
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("fixes are sorted by impact, with live Google values and a copy button", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await seed(page, { hasWebsite: true, opportunities: true });

  const todo = page.getByTestId("list-open").getByTestId("opportunity");
  await expect(todo.getByRole("heading", { level: 2 })).toHaveText([
    "Bean House has more Google reviews than you",
    "Your website does not show your phone number",
    "Answer common questions on your site",
  ]);
  await expect(todo.first()).toContainText("Bean House has 320 reviews and you have 12.");
  await expect(todo.first().getByRole("img", { name: "Google Maps" })).toBeVisible();
  await expect(page.getByTestId("get-found-checklist")).toHaveCount(0);
  await expect(page.getByText("Request Fix")).toHaveCount(0);

  await todo.nth(1).getByRole("button", { name: "Copy for Claude" }).click();
  await expect(todo.nth(1).getByRole("button", { name: "Copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Help me improve the services page for Sunrise Coffee Bar");
});

test("marking a fix done moves it to Done, and it stays there after a reload", async ({ page }) => {
  await seed(page, { hasWebsite: true, opportunities: true });
  const first = page.getByTestId("list-open").getByTestId("opportunity").first();
  await expect(first).toContainText("Bean House has more Google reviews than you");
  await first.getByRole("button", { name: "Mark as done" }).click();

  await expect(page.getByTestId("list-open").getByTestId("opportunity")).toHaveCount(2);
  await expect(page.getByTestId("tab-done")).toContainText("1");
  await page.getByTestId("tab-done").click();
  await expect(page.getByTestId("list-done")).toContainText("Bean House has more Google reviews than you");
  await expect(page.getByText("Marked as done.")).toBeVisible({ timeout: 30_000 });

  await page.reload();
  await expect(page.getByTestId("tab-done")).toContainText("1", { timeout: 30_000 });
  await page.getByTestId("tab-done").click();
  const done = page.getByTestId("list-done").getByTestId("opportunity");
  await done.getByRole("button", { name: "Move back to to-do" }).click();
  await expect(page.getByTestId("list-done").getByTestId("opportunity")).toHaveCount(0);

  await page.getByTestId("tab-open").click();
  await page.getByTestId("list-open").getByTestId("opportunity").last().getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByTestId("tab-dismissed")).toContainText("1");
});

test("a business with no website gets the checklist, and ticks are saved", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await seed(page, { hasWebsite: false, opportunities: false });

  const list = page.getByTestId("get-found-checklist");
  await expect(list).toContainText("We have no record of a website, a Google Business Profile and a phone number");
  await expect(list.getByRole("checkbox")).toHaveCount(6);
  await expect(page.getByTestId("checklist-progress")).toHaveText("0 of 6 done");
  await expect(page.getByTestId("no-opportunities")).toBeVisible();

  await page.getByTestId("checklist-website").getByRole("button", { name: "Copy for Claude" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Write a simple one-page website for Nowhere Plumbing");

  const profile = list.getByRole("checkbox", { name: "Create or claim your Google Business Profile" });
  await profile.check();
  await expect(page.getByTestId("checklist-progress")).toHaveText("1 of 6 done");
  // The tick shows at once; the box is enabled again when the save has finished.
  await expect(profile).toBeEnabled({ timeout: 30_000 });
  await page.reload();
  await expect(page.getByTestId("checklist-progress")).toHaveText("1 of 6 done", { timeout: 30_000 });
  await expect(list.getByRole("checkbox", { name: "Create or claim your Google Business Profile" })).toBeChecked();
  await list.getByRole("checkbox", { name: "Create or claim your Google Business Profile" }).uncheck();
  await expect(page.getByTestId("checklist-progress")).toHaveText("0 of 6 done");
});

test("the old address redirects to the new page", async ({ page }) => {
  await seed(page, { hasWebsite: true, opportunities: false });
  await page.goto("/dashboard/opportunities");
  await page.waitForURL((url) => url.pathname === "/opportunities");
  await expect(page.getByTestId("no-opportunities")).toBeVisible();
});
