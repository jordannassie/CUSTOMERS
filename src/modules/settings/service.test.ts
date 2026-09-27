import { describe, expect, it } from "vitest";
import { checkLogo, LOGO_MAX_BYTES, normalizeWebsite, parseServices } from "./service";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (s: string) => new TextEncoder().encode(s);

describe("normalizeWebsite", () => {
  it.each([
    ["https://www.Example.com/about?x=1", "www.example.com"],
    ["northside.example", "northside.example"],
    ["http://shop.co.uk:8080/", "shop.co.uk"],
    ["  riverbend-dental.com.  ", "riverbend-dental.com"],
  ])("%s becomes %s", (input, domain) => {
    expect(normalizeWebsite(input)).toEqual({ ok: true, domain });
  });

  it("treats empty as no website", () => {
    expect(normalizeWebsite("   ")).toEqual({ ok: true, domain: null });
  });

  it.each(["not a website", "localhost", "-bad.com", "a..com", "javascript:alert(1)"])("rejects %s", (input) => {
    expect(normalizeWebsite(input).ok).toBe(false);
  });
});

describe("parseServices", () => {
  it("splits on commas and new lines, drops blanks and repeats", () => {
    expect(parseServices("Drain cleaning, Water heaters\nleak repair,, drain Cleaning ,")).toEqual([
      "Drain cleaning",
      "Water heaters",
      "leak repair",
    ]);
  });
});

describe("checkLogo", () => {
  it.each([
    ["PNG", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a), "image/png"],
    ["JPEG", bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg"],
    ["WebP", text("RIFF\0\0\0\0WEBPVP8 "), "image/webp"],
  ])("accepts %s by its bytes", (_, head, contentType) => {
    expect(checkLogo(1000, head)).toEqual({ ok: true, contentType });
  });

  it("rejects SVG and other files whatever their name says", () => {
    expect(checkLogo(1000, text("<svg xmlns=")).ok).toBe(false);
    expect(checkLogo(1000, text("GIF89a")).ok).toBe(false);
  });

  it("rejects empty and oversized files", () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47);
    expect(checkLogo(0, png)).toMatchObject({ ok: false, error: expect.stringContaining("Choose an image") });
    expect(checkLogo(LOGO_MAX_BYTES + 1, png)).toMatchObject({ ok: false, error: expect.stringContaining("too big") });
    expect(checkLogo(LOGO_MAX_BYTES, png).ok).toBe(true);
  });
});
