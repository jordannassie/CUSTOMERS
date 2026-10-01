import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicPlan } from "@/modules/billing/format";
import { PlanCards } from "./PlanCards";

const STARTER: PublicPlan = { id: "starter", name: "Starter", priceCents: 14900, monthlyCredits: 1200, maxCompetitors: 5, maxQuestions: 25 };
const PRO: PublicPlan = { id: "pro", name: "Pro", priceCents: 24900, monthlyCredits: 2500, maxCompetitors: 10, maxQuestions: 25 };

function card(html: string, id: string): string {
  const start = html.indexOf(`data-plan-id="${id}"`);
  return html.slice(start, html.indexOf("</article>", start));
}

describe("PlanCards (DB-007)", () => {
  const html = renderToStaticMarkup(createElement(PlanCards, { plans: [STARTER, PRO] }));

  it("lists everything on the first plan", () => {
    const starter = card(html, "starter");
    expect(starter).toContain("Up to 25 customer questions per business");
    expect(starter).toContain("Fix steps, PDF reports and share links");
  });

  it("lists only what the bigger plan adds", () => {
    const pro = card(html, "pro");
    expect(pro).toContain("Everything in Starter, plus");
    expect(pro).toContain("Up to 10 competitors per business (5 on Starter)");
    expect(pro).toContain("2,500 credits each month (1,200 on Starter)");
    expect(pro).not.toContain("customer questions");
    expect(pro).not.toContain("Fix steps");
  });

  it("says when to pick the bigger plan", () => {
    expect(html).toContain("Pick Pro to compare up to 10 competitors or to check more questions every day.");
  });

  it("leaves the line out for a single plan", () => {
    expect(renderToStaticMarkup(createElement(PlanCards, { plans: [STARTER] }))).not.toContain("Pick ");
  });
});
