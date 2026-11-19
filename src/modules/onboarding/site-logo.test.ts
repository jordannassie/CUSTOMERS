import { describe, expect, it } from "vitest";
import { logoFromHtml } from "./site-logo";

const page = (head: string, body = "") => `<html><head>${head}</head><body>${body}</body></html>`;

describe("logoFromHtml", () => {
  it("prefers the touch icon, made square for small marks", () => {
    const html = page(
      `<link rel="icon" href="/favicon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
      `<img src="/img/logo-wide.png" alt="Bennu Coffee">`,
    );
    expect(logoFromHtml(html, "bennucoffee.com")).toBe("https://bennucoffee.com/apple-touch-icon.png");
  });

  it("uses the JSON-LD logo, as a string or an ImageObject, inside @graph", () => {
    const ld = { "@context": "https://schema.org", "@graph": [{ "@type": "WebSite" }, { "@type": "Organization", logo: { "@type": "ImageObject", url: "https://cdn.example.com/logo.png" } }] };
    const html = page(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
    expect(logoFromHtml(html, "example.com")).toBe("https://cdn.example.com/logo.png");
    const plain = page(`<script type="application/ld+json">{"@type":"LocalBusiness","logo":"/brand.svg"}</script>`);
    expect(logoFromHtml(plain, "example.com")).toBe("https://example.com/brand.svg");
  });

  it("falls back to the header image named logo, then the largest favicon", () => {
    const html = page(`<link rel="icon" href="/fav.ico">`, `<img src="/hero.jpg"><img class="site-logo" src="assets/brand.png">`);
    expect(logoFromHtml(html, "example.com")).toBe("https://example.com/assets/brand.png");
    const icons = page(`<link rel="icon" href="/16.png" sizes="16x16"><link rel="icon" href="/192.png" sizes="192x192">`);
    expect(logoFromHtml(icons, "example.com")).toBe("https://example.com/192.png");
  });

  it("keeps a tiny favicon as the last choice, and returns https only", () => {
    expect(logoFromHtml(page(`<link rel="shortcut icon" href="http://example.com/f.ico" sizes="16x16">`), "example.com")).toBe("https://example.com/f.ico");
    expect(logoFromHtml(page(`<link rel="apple-touch-icon" href="data:image/png;base64,AAAA">`), "example.com")).toBeNull();
    expect(logoFromHtml(page(`<link rel="apple-touch-icon" href="javascript:alert(1)">`), "example.com")).toBeNull();
  });

  it("skips broken JSON-LD and returns null when the page names no logo", () => {
    expect(logoFromHtml(page(`<script type="application/ld+json">{not json</script>`, `<img src="/team.jpg">`), "example.com")).toBeNull();
    expect(logoFromHtml(null, "example.com")).toBeNull();
  });

  it("decodes entities in addresses", () => {
    expect(logoFromHtml(page(`<link rel="apple-touch-icon" href="/icon.png?v=2&amp;s=180">`), "example.com")).toBe("https://example.com/icon.png?v=2&s=180");
    // WordPress writes & as &#038; (seen on epochcoffee.com).
    expect(logoFromHtml(page(`<link rel="apple-touch-icon" href="https://i0.wp.com/a.jpg?fit=180%2C180&#038;ssl=1">`), "x.com")).toBe("https://i0.wp.com/a.jpg?fit=180%2C180&ssl=1");
  });
});
