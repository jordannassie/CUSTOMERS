import { expect, test } from "@playwright/test";

// B-74: sitemap, robots, one title and link preview per public page, and the contact form's spam trap.
const PUBLIC_PAGES = ["/", "/pricing", "/agency", "/compare", "/contact", "/privacy", "/terms"];

test.describe("desktop only", () => {
  test.skip(({ isMobile }) => isMobile, "Same output on every screen size.");

  test("sitemap lists the public pages and robots blocks the app", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
    expect(urls).toEqual(PUBLIC_PAGES);

    const robots = await (await request.get("/robots.txt")).text();
    for (const path of ["/dashboard", "/sources", "/competitors", "/onboarding", "/internal", "/r/", "/api/"]) {
      expect(robots).toContain(`Disallow: ${path}\n`);
    }
    expect(robots).toContain("Sitemap: https://customers.direct/sitemap.xml");
  });

  test("each public page has its own title, description and preview image", async ({ page, request }) => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      const meta = (selector: string) => page.locator(selector).first().getAttribute("content", { timeout: 5_000 });
      titles.add(await page.title());
      descriptions.add((await meta('meta[name="description"]'))!);
      expect(await meta('meta[property="og:title"]'), path).toBeTruthy();
      expect(new URL((await meta('meta[property="og:url"]'))!).pathname, path).toBe(path);

      const image = new URL((await meta('meta[property="og:image"]'))!);
      const response = await request.get(image.pathname + image.search);
      expect(response.headers()["content-type"], path).toBe("image/png");
      expect(await meta('meta[name="twitter:image"]'), path).toBeTruthy();
    }
    expect(titles.size).toBe(PUBLIC_PAGES.length);
    expect(descriptions.size).toBe(PUBLIC_PAGES.length);
  });
});

test("contact form sends the hidden spam field to the server", async ({ page }) => {
  let sent: Record<string, unknown> | null = null;
  await page.route("/api/contact", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { success: true } });
  });

  await page.goto("/contact");
  await page.getByLabel("Name", { exact: true }).fill("Spam bot");
  await page.getByLabel("Email").fill("bot@example.com");
  await page.getByLabel("Message").fill("Buy links");
  // The field is display:none, so type into it the way a bot script would.
  await page.locator('input[name="_honey"]').evaluate((input: HTMLInputElement) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "http://spam.example");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("Thanks, we have your message")).toBeVisible();
  expect(sent).toMatchObject({ _honey: "http://spam.example" });
});
