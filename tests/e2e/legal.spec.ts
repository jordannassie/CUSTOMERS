import { expect, test } from "@playwright/test";

// B-78: both pages stay marked as drafts, and the numbers come from the same settings the product uses.
for (const path of ["/terms", "/privacy"]) {
  test(`${path} is marked as a draft pending legal review`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("note")).toContainText("Draft, pending legal review.");
    await expect(page.getByText("Effective date: to be set after legal review")).toBeVisible();
  });
}

test("terms state the trial, renewal and cancel rules", async ({ page }) => {
  await page.goto("/terms#trial");
  const trial = page.locator("#trial");
  await expect(trial).toContainText("The trial lasts 7 days.");
  await expect(trial).toContainText("up to 2 businesses and includes 100 trial credits");
  await expect(page.locator("#plans")).toContainText("renews automatically every month");
  await expect(page.locator("#cancel")).toContainText("open Settings, then Billing, and choose Cancel plan");
  await expect(page.locator("#credits")).toContainText("Credits have no cash value.");
});

test("privacy lists every company that processes data and the deletion wait", async ({ page }) => {
  await page.goto("/privacy");
  const table = page.locator("#subprocessors table");
  for (const name of ["Supabase", "Netlify", "Stripe", "Resend", "OpenAI", "Anthropic", "Perplexity", "Google", "Firecrawl", "Browserless"]) {
    await expect(table.locator("tbody th").getByText(name, { exact: true })).toBeVisible();
  }
  await expect(page.locator("#deletion")).toContainText("30 days later we permanently delete");
});
