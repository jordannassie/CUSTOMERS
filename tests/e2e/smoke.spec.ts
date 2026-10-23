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

// BUG-001, BUG-015 (step 9f): the homepage never scrolls sideways, and nothing fixed covers the hint under the free
// check's button. Runs at 1440 (desktop) and 390 (mobile).
test("homepage fits the screen and keeps the free check hint uncovered", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const hint = page.getByText("No account needed.", { exact: false }).first();
  await hint.scrollIntoViewIfNeeded();
  const covered = await hint.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const points: [number, number][] = [[r.left + 4, r.top + r.height / 2], [r.right - 4, r.top + r.height / 2], [r.left + r.width / 2, r.top + r.height / 2]];
    return points.some(([x, y]) => {
      const top = document.elementFromPoint(x, y);
      return !!top && top !== el && !el.contains(top);
    });
  });
  expect(covered).toBe(false);
});

// BUG-067: an unknown onboarding step matches no route, so it is a real 404, not a "not found" page sent with 200.
test("an unknown onboarding step answers 404", async ({ request }) => {
  const res = await request.get("/onboarding/no-such-step", { maxRedirects: 0, failOnStatusCode: false });
  expect(res.status()).toBe(404);
});
