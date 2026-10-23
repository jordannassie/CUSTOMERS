import { expect, test } from "@playwright/test";

test("app detail shows an empty Customers.Direct rating and a review form gate", async ({ page }) => {
  const response = await page.goto("/apps/chatgpt");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { name: "ChatGPT" })).toBeVisible();
  await expect(page.getByText("Not yet rated").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Write a Review" }).first()).toBeVisible();
  // The first "Get Started" is the app's own button; the related app cards below have one each.
  await expect(page.getByRole("link", { name: "Get Started" }).first()).toHaveAttribute("href", "/apps/go/chatgpt/detail");
  const json = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(json ?? "").not.toContain("aggregateRating");

  await page.getByRole("link", { name: "Write a Review" }).first().click();
  await expect(page.getByRole("heading", { name: "Write a Review" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to write a review" })).toBeVisible();
});
