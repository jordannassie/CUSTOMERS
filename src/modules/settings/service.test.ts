import { describe, expect, it } from "vitest";
import { businessProfileInput } from "./schema";
import {
  aliasesProblem,
  aliasExample,
  checkLogo,
  LOGO_MAX_BYTES,
  matchingChanged,
  normalizeWebsite,
  parseServices,
  phoneProblem,
  profileFieldError,
  refusesOtherLabel,
  servicesProblem,
} from "./service";

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

describe("other names", () => {
  it("allows up to 10, each 2 to 120 characters", () => {
    expect(aliasesProblem([])).toBeUndefined();
    expect(aliasesProblem(Array.from({ length: 10 }, (_, i) => `Name ${i}`))).toBeUndefined();
    expect(aliasesProblem(Array.from({ length: 11 }, (_, i) => `Name ${i}`))).toBe("Add up to 10 other names.");
    expect(aliasesProblem(["KFC", "K"])).toBe("Each other name needs at least 2 characters.");
    expect(aliasesProblem(["x".repeat(121)])).toBe("Keep each other name under 120 characters.");
  });

  const before = { name: "Book Woman", aliases: ["BookWoman", "Old Name"], domain: "ebookwoman.com", phone: "(512) 472-2785", city: "Austin", area: null };

  it("sees a change to the name or the list, not to its order or case", () => {
    expect(matchingChanged(before, { ...before, aliases: ["old name", "BookWoman"] })).toBe(false);
    expect(matchingChanged(before, { ...before, aliases: ["BookWoman"] })).toBe(true);
    expect(matchingChanged(before, { ...before, name: "BookWoman Austin" })).toBe(true);
  });

  it("sees a new website, phone, city or area, not the same ones written another way", () => {
    expect(matchingChanged(before, { ...before, domain: "bookwoman.com" })).toBe(true);
    expect(matchingChanged(before, { ...before, domain: null })).toBe(true);
    expect(matchingChanged(before, { ...before, phone: "512-555-0100" })).toBe(true);
    expect(matchingChanged(before, { ...before, city: "Round Rock" })).toBe(true);
    expect(matchingChanged(before, { ...before, area: "North Loop" })).toBe(true);
    expect(matchingChanged(before, { ...before, phone: "512.472.2785", city: "austin ", domain: "EBOOKWOMAN.com" })).toBe(false);
  });
});

describe("aliasExample", () => {
  it("takes the first letter of each word of the business's name", () => {
    expect(aliasExample("Kentucky Fried Chicken")).toBe("For example: KFC");
    expect(aliasExample("Book Woman")).toBe("For example: BW");
    expect(aliasExample("Magic Plumbing Heating & Cooling")).toBe("For example: MPHC");
    expect(aliasExample("Mr. Rooter Plumbing")).toBe("For example: MRP");
    expect(aliasExample("Sunrise Coffee Co. LLC")).toBe("For example: SC");
    expect(aliasExample("  advanced  plumbing-drain ")).toBe("For example: APD");
  });

  it("suggests an old name when there is no short form", () => {
    expect(aliasExample("Cheezious")).toBe("For example: an old name or another spelling");
    expect(aliasExample("")).toBe("For example: an old name or another spelling");
  });
});


// 2026-10-16: questions are written from an "Other" label, so a vague new one is refused; an old one can stay.
describe("refusesOtherLabel", () => {
  it("refuses a change to a vague label only", () => {
    expect(refusesOtherLabel("Plumber", "Consultant")).toBe(true);
    expect(refusesOtherLabel(null, "Store")).toBe(true);
    expect(refusesOtherLabel("Plumber", "IT consultant")).toBe(false);
    expect(refusesOtherLabel("Store", "Store")).toBe(false);
    expect(refusesOtherLabel("Plumber", "plumber")).toBe(false);
  });
});

// The form checks what the server's schema checks, so a save is never refused with nothing marked.
describe("profile field checks match the server", () => {
  const base = {
    businessId: "7b0c4b4e-8a59-4a4f-9a8e-2f1d1b2c3d4e",
    name: "Blue Door",
    industry: "dentist",
    services: ["Cleaning"],
    city: "Austin",
    region: "TX",
    phone: "",
    website: "",
  };
  const serverField = (input: object) => {
    const parsed = businessProfileInput.safeParse({ ...base, ...input });
    return parsed.success ? null : profileFieldError(parsed.error.issues)?.field;
  };

  it.each(["(512) 555-0100", "+1 512.555.0100", ""])("accepts the phone %s", (phone) => {
    expect(phoneProblem(phone)).toBeUndefined();
    expect(serverField({ phone })).toBeNull();
  });

  it.each(["call 555", "555#100", "5".repeat(31)])("refuses the phone %s on both sides", (phone) => {
    expect(phoneProblem(phone)).toBeDefined();
    expect(serverField({ phone })).toBe("phone");
  });

  it("refuses more than 20 services, or one over 60 characters, on both sides", () => {
    const many = Array.from({ length: 21 }, (_, i) => `Service ${i}`);
    expect(servicesProblem(many)).toBe("Add up to 20 services.");
    expect(serverField({ services: many })).toBe("services");
    const long = ["x".repeat(61)];
    expect(servicesProblem(long)).toBe("Keep each service to 60 characters or fewer.");
    expect(serverField({ services: long })).toBe("services");
    expect(servicesProblem(many.slice(0, 20))).toBeUndefined();
    expect(serverField({ services: many.slice(0, 20) })).toBeNull();
  });

  it("is null for a problem that is not one field's", () => {
    expect(profileFieldError([{ path: ["businessId"] }])).toBeNull();
  });
});
