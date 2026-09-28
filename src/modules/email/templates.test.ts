import { createElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { renderEmail } from "./render";
import LowCreditsEmail, { type LowCreditsEmailProps } from "./templates/low-credits";
import PaymentFailedEmail from "./templates/payment-failed";
import TrialEndingEmail from "./templates/trial-ending";
import WeeklyReportEmail from "./templates/weekly-report";
import WelcomeEmail from "./templates/welcome";

// The five B-62 emails (MVP_SPEC 10): each renders HTML plus text, links back to the app and follows WRITING.md.
const BASE = "https://app.example";
const BANNED = /unlock|unleash|elevate|empower|seamless|robust|leverage|cutting-edge|game-changer|revolutioni[sz]e|supercharge|delve|harness|streamline|effortless|world-class/i;

async function render(element: ReactElement) {
  const { html, text } = await renderEmail(element);
  expect(html).not.toMatch(/[\u2013\u2014]/);
  expect(text).not.toMatch(/[\u2013\u2014]/);
  expect(text).not.toMatch(BANNED);
  expect(html).toContain(`href="${BASE}/settings"`);
  return { html, text };
}

const lowProps = (level: LowCreditsEmailProps["level"], balance: number): LowCreditsEmailProps => ({
  level,
  used: 960,
  total: 1200,
  balance,
  renewsOn: "October 2",
  baseUrl: BASE,
});

describe("B-62 email templates", () => {
  it("welcome", async () => {
    const { html, text } = await render(createElement(WelcomeEmail, { baseUrl: BASE }));
    expect(text).toContain("WELCOME TO CUSTOMERS.DIRECT");
    expect(html).toContain(`href="${BASE}/dashboard"`);
    expect(html).not.toContain("Unsubscribe");
  });

  it("trial ending, with the charge date and amount", async () => {
    const { html, text } = await render(createElement(TrialEndingEmail, { date: "October 2", amount: "$298", baseUrl: BASE }));
    expect(text).toContain("On October 2 we'll charge $298 to your card");
    expect(html).toContain(`href="${BASE}/settings/billing"`);
    const noAmount = await render(createElement(TrialEndingEmail, { date: "October 2", amount: null, baseUrl: BASE }));
    expect(noAmount.text).toContain("On October 2 we'll charge your card");
  });

  it("payment failed, with a button to fix the card", async () => {
    const { html, text } = await render(createElement(PaymentFailedEmail, { amount: "$149", baseUrl: BASE }));
    expect(text).toContain("We couldn't charge your card $149");
    expect(text).toContain("Update your card");
    expect(html).toContain(`href="${BASE}/settings/billing"`);
  });

  it("low credits at 80%, at 0 and below 0", async () => {
    const low = await render(createElement(LowCreditsEmail, lowProps("low", 240)));
    expect(low.text).toContain("You've used 960 of your 1,200 credits");
    expect(low.text).toContain("new credits on October 2");
    expect(low.html).toContain(`href="${BASE}/settings/credits"`);
    expect((await render(createElement(LowCreditsEmail, lowProps("empty", 0)))).text).toContain("YOU'RE OUT OF CREDITS");
    expect((await render(createElement(LowCreditsEmail, lowProps("negative", -12)))).text).toContain("your balance is now -12");
  });

  it("weekly report: scores, real changes, new fixes, share links and an unsubscribe link", async () => {
    const { html, text } = await render(createElement(WeeklyReportEmail, { ...WeeklyReportEmail.PreviewProps, baseUrl: BASE }));
    expect(text).toContain("Bean There Coffee");
    expect(text).toContain("Up 8 points on last week");
    expect(text).toContain("No real change on last week.");
    expect(text).toContain("Add your opening hours to Google");
    expect(text).toContain("and 1 more");
    expect(html).toContain('href="https://customers.direct/r/preview-one"');
    expect(html).toContain("Unsubscribe from weekly reports");
    expect(html).not.toMatch(/\.pdf/i);
  });
});
