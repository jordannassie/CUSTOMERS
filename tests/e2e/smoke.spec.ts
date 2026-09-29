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

// The streamed page used to hold a second, placeholder form until the real one arrived (BUG-029).
test("login and sign up send one form", async ({ request }) => {
  for (const path of ["/login", "/signup"]) {
    const html = await (await request.get(path)).text();
    expect(html.match(/id="email"/g), path).toHaveLength(1);
    expect(html.match(/id="password"/g), path).toHaveLength(1);
  }
});
