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
    for (const path of ["/dashboard", "/sources", "/competitors", "/questions", "/opportunities", "/onboarding", "/internal", "/r/", "/api/"]) {
      expect(robots).toContain(`Disallow: ${path}\n`);
    }
    expect(robots).toContain("Sitemap: https://customers.direct/sitemap.xml");
  });

  // The image itself is rendered and size-checked in src/app/metadata-images.test.ts; next dev cannot
  // serve it reliably (the image optimizer blocks sharp's SVG loader), while the build prerenders it.
  test("each public page has its own title, description and preview image", async ({ page }) => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    const images = new Set<string>();
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      const meta = (selector: string) => page.locator(selector).first().getAttribute("content", { timeout: 5_000 });
      titles.add(await page.title());
      descriptions.add((await meta('meta[name="description"]'))!);
      expect(await meta('meta[property="og:title"]'), path).toBeTruthy();
      expect(new URL((await meta('meta[property="og:url"]'))!).pathname, path).toBe(path);

      const image = new URL((await meta('meta[property="og:image"]'))!);
      expect(image.pathname, path).toBe("/opengraph-image");
      expect(await meta('meta[property="og:image:width"]'), path).toBe("1200");
      expect(await meta('meta[property="og:image:height"]'), path).toBe("630");
      expect(new URL((await meta('meta[name="twitter:image"]'))!).pathname, path).toBe("/opengraph-image");
      images.add(image.pathname);
    }
    expect(titles.size).toBe(PUBLIC_PAGES.length);
    expect(descriptions.size).toBe(PUBLIC_PAGES.length);
    expect(images.size).toBe(1);
  });

  // Once the image optimizer has run, a generated icon used to 500 in dev (BUG-028).
  test("the favicon and home screen icon load after an optimized image", async ({ page, request }) => {
    const optimized = await request.get("/_next/image?url=%2Fimages%2Flogos%2Flogo-black.png&w=256&q=75");
    expect(optimized.status()).toBe(200);
    await page.goto("/");
    for (const rel of ["icon", "apple-touch-icon"]) {
      const href = await page.locator(`link[rel="${rel}"]`).getAttribute("href");
      const response = await request.get(href!);
      expect(response.status(), rel).toBe(200);
      expect(response.headers()["content-type"], rel).toBe("image/png");
    }
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
