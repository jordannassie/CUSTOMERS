import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

// B-72 against the local Supabase stack, with the dev server on .env.test.local values: every price shown
// on /pricing, the homepage and /agency is the plans or topup_packs row (D-21, D-22 are still pending).
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const count = (n: number) => n.toLocaleString("en-US");

async function rows() {
  const [plans, packs] = await Promise.all([
    db.from("plans").select("id, price_cents, monthly_credits").eq("active", true).not("price_cents", "is", null),
    db.from("topup_packs").select("id, credits, price_cents").eq("active", true),
  ]);
  if (plans.error || packs.error) throw plans.error ?? packs.error;
  return { plans: plans.data, packs: packs.data };
}

test("pricing page shows the plans and top-up table prices", async ({ page }) => {
  const { plans, packs } = await rows();
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  for (const plan of plans) {
    const card = page.locator(`[data-plan-id="${plan.id}"]`);
    await expect(card.getByTestId("plan-price")).toHaveText(usd(plan.price_cents!));
    await expect(card.getByTestId("plan-credits")).toHaveText(count(plan.monthly_credits!));
    await expect(card.getByRole("link", { name: /^Choose / })).toHaveAttribute("href", `/signup?plan=${plan.id}`);
  }
  for (const pack of packs) {
    const card = page.locator(`[data-pack-id="${pack.id}"]`);
    await expect(card.getByTestId("pack-price")).toHaveText(usd(pack.price_cents));
    await expect(card.getByTestId("pack-credits")).toHaveText(count(pack.credits));
  }
  await expect(page.getByText("7 days free, then your plan starts")).toBeVisible();
});

test("homepage and agency page show the same plan prices", async ({ page }) => {
  const { plans } = await rows();
  for (const path of ["/", "/agency"]) {
    await page.goto(path);
    for (const plan of plans) {
      await expect(page.locator(`[data-plan-id="${plan.id}"]`).getByTestId("plan-price")).toHaveText(usd(plan.price_cents!));
    }
  }
});

test("marketing pages make no removed claims", async ({ page }) => {
  for (const path of ["/pricing", "/agency", "/contact"]) {
    await page.goto(path);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/Gemini|Google AI|ChatGPT Ads|14-day|[\u2013\u2014]/);
  }
  await expect(page.getByLabel("What is it about?").locator("option")).toHaveText([
    "Checking my business in AI answers",
    "Using it for my agency's clients",
    "Booking a demo call",
    "Something else",
  ]);
});
