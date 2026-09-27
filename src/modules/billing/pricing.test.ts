import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { PlanCards } from "@/components/marketing/pricing/PlanCards";
import { Credits } from "@/components/marketing/pricing/Credits";
import { PricingSummary } from "@/components/marketing/home/PricingSummary";
import { formatCount, formatUsd } from "./format";
import { getPublicPricing } from "./pricing";

// cacheLife only works inside a Next.js build; outside it the function runs uncached.
vi.mock("next/cache", () => ({ cacheLife: () => {} }));

// B-72: the prices on /pricing and the homepage are the plans and topup_packs rows, never numbers in code.
const db = createServiceClient();

async function tableRows() {
  const [plans, packs] = await Promise.all([
    db.from("plans").select("id, name, price_cents, monthly_credits").eq("active", true).not("price_cents", "is", null),
    db.from("topup_packs").select("id, credits, price_cents").eq("active", true),
  ]);
  if (plans.error || packs.error) throw plans.error ?? packs.error;
  return { plans: plans.data, packs: packs.data };
}

/** The text inside the element carrying the given data attribute value and test id. */
function textIn(html: string, attr: string, id: string, testId: string): string | undefined {
  const start = html.indexOf(`${attr}="${id}"`);
  if (start < 0) return undefined;
  const match = html.slice(start).match(new RegExp(`data-testid="${testId}"[^>]*>([^<]*)<`));
  return match?.[1];
}

describe("public pricing", () => {
  it("returns exactly the active plan and top-up rows", async () => {
    const { plans, packs } = await getPublicPricing();
    const rows = await tableRows();
    expect(plans.map((p) => [p.id, p.priceCents, p.monthlyCredits]).sort()).toEqual(
      rows.plans.map((p) => [p.id, p.price_cents, p.monthly_credits]).sort(),
    );
    expect(packs.map((p) => [p.id, p.priceCents, p.credits]).sort()).toEqual(
      rows.packs.map((p) => [p.id, p.price_cents, p.credits]).sort(),
    );
    expect(plans.length).toBeGreaterThan(0);
  });

  it("shows each plan's table price and credits on the pricing page and homepage", async () => {
    const pricing = await getPublicPricing();
    const rows = await tableRows();
    const pages = [
      renderToStaticMarkup(createElement(PlanCards, { plans: pricing.plans })),
      renderToStaticMarkup(createElement(PricingSummary, { plans: pricing.plans })),
    ];
    for (const html of pages) {
      for (const row of rows.plans) {
        expect(textIn(html, "data-plan-id", row.id, "plan-price")).toBe(formatUsd(row.price_cents!));
        expect(textIn(html, "data-plan-id", row.id, "plan-credits")).toBe(formatCount(row.monthly_credits!));
      }
    }
  });

  it("shows each top-up pack's table price and credits", async () => {
    const pricing = await getPublicPricing();
    const rows = await tableRows();
    const html = renderToStaticMarkup(createElement(Credits, pricing));
    for (const row of rows.packs) {
      expect(textIn(html, "data-pack-id", row.id, "pack-price")).toBe(formatUsd(row.price_cents));
      expect(textIn(html, "data-pack-id", row.id, "pack-credits")).toBe(formatCount(row.credits));
    }
  });

  it("follows a price change in the table", async () => {
    const { data: before } = await db.from("plans").select("price_cents").eq("id", "starter").single();
    await db.from("plans").update({ price_cents: 15900 }).eq("id", "starter");
    try {
      const html = renderToStaticMarkup(createElement(PlanCards, { plans: (await getPublicPricing()).plans }));
      expect(textIn(html, "data-plan-id", "starter", "plan-price")).toBe("$159");
      expect(html).toContain('href="/signup?plan=starter"');
    } finally {
      await db.from("plans").update({ price_cents: before!.price_cents }).eq("id", "starter");
    }
  });
});
