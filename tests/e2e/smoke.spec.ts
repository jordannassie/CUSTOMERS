import { expect, test } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/Customers\.Direct/);
  await expect(page.locator("h1").first()).toBeVisible();
  expect(errors).toEqual([]);
});
