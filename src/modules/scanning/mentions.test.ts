import { describe, expect, it } from "vitest";
import { brandName, coreName, domainBrand, domainOf, isGenericName, normaliseWithOffsets } from "./mention-text";
import { detectMention, detectMentions } from "./mentions";

const austin = { city: "Austin", hasWebsite: true };

describe("detectMention: word boundaries", () => {
  it("does not find Ace inside space, race or Acer", () => {
    const answer = "There is plenty of space. The race was close. Acer laptops are cheap in Austin.";
    expect(detectMention(answer, { name: "Ace", ...austin }).mentioned).toBe(false);
  });

  it("finds a distinctive name in any case and with punctuation", () => {
    const answer = "Try RAPID-ROOTER drain cleaning for blocked pipes.";
    expect(detectMention(answer, { name: "Rapid Rooter Drain Cleaning" }).mentioned).toBe(true);
  });

  it("ignores legal suffixes on either side", () => {
    expect(detectMention("Call Hernandez Roofing today.", { name: "Hernandez Roofing, LLC" }).mentioned).toBe(true);
    expect(detectMention("Hernandez Roofing Inc. is rated well.", { name: "Hernandez Roofing" }).mentioned).toBe(true);
  });

  it("treats apostrophes, accents and & consistently", () => {
    expect(detectMention("Joes Garage fixed it.", { name: "Joe's Garage" }).mentioned).toBe(true);
    expect(detectMention("José’s Café Bakery is open late.", { name: "Jose's Cafe Bakery" }).mentioned).toBe(true);
    expect(detectMention("Smith and Sons Heating is fast.", { name: "Smith & Sons Heating" }).mentioned).toBe(true);
  });

  it("does not match a longer name that only contains the words out of order", () => {
    expect(detectMention("Plumbing by Martinez is great.", { name: "Martinez Plumbing" }).mentioned).toBe(false);
  });
});

describe("detectMention: generic and short names need a second signal", () => {
  it("rejects Best Plumbing used as ordinary words", () => {
    const answer = "For the best plumbing in Austin, compare three quotes.";
    expect(detectMention(answer, { name: "Best Plumbing", ...austin }).mentioned).toBe(false);
  });

  it("accepts Best Plumbing as a name with the city nearby", () => {
    const answer = "1. **Best Plumbing** (Austin, TX): 24 hour service.";
    expect(detectMention(answer, { name: "Best Plumbing", ...austin })).toMatchObject({ mentioned: true, position: 1 });
  });

  it("rejects a generic name with no city, domain or phone nearby", () => {
    const answer = "Prime is a popular choice.\n\n" + "x ".repeat(300) + "\nWe looked at options in Austin.";
    expect(detectMention(answer, { name: "Prime", ...austin }).mentioned).toBe(false);
  });

  it("accepts a generic name when the phone or domain is nearby", () => {
    const phone = "Prime (512) 555-0100 does emergency work.";
    expect(detectMention(phone, { name: "Prime", phone: "+1 512-555-0100" }).mentioned).toBe(true);
    const domain = "Prime, see primeplumbingtx.com, does emergency work.";
    expect(detectMention(domain, { name: "Prime", website: "https://primeplumbingtx.com" }).mentioned).toBe(true);
  });

  it("classifies names", () => {
    expect(isGenericName(coreName("Ace"))).toBe(true);
    expect(isGenericName(coreName("Best Plumbing LLC"))).toBe(true);
    expect(isGenericName(coreName("Top Pro Roofing"))).toBe(true);
    expect(isGenericName(coreName("Hernandez Roofing"))).toBe(false);
    expect(isGenericName(coreName("Khaadi"))).toBe(false);
    expect(isGenericName(coreName("Starbucks"))).toBe(false);
    expect(isGenericName(coreName("Plumbing"))).toBe(true);
    expect(isGenericName(coreName("Gap"))).toBe(true);
    expect(isGenericName(coreName("Nike"))).toBe(false);
  });
});

// BUG-076: excerpts of real Perplexity answers from 2026-10-07 (Khaadi, Islamabad). Each names Khaadi as a brand,
// and none has the city within 200 characters, so the old one-word rule missed them.
describe("detectMention: distinctive one-word names", () => {
  const khaadi = { name: "Khaadi", website: "khaadi.com", city: "Islamabad", hasWebsite: true };

  it.each([
    "For **Pakistani ready-to-wear and fabrics**, look at brands such as Khaadi, Sapphire, Nishat Linen, Gul Ahmed, or Bareeze.",
    "| Retailer | Best for |\n|---|---|\n| **Khaadi** | Everyday and semi-formal Pakistani wear |",
    "For a specific store, **Khaadi** is a solid choice for contemporary Pakistani styles and ready-to-wear.",
  ])("counts a brand named in passing: %s", (answer) => {
    expect(detectMention(answer, khaadi).mentioned).toBe(true);
  });

  it("counts other one-word brands without a city nearby", () => {
    expect(detectMention("Nike and Adidas both have outlet stores.", { name: "Nike", city: "Austin" }).mentioned).toBe(true);
    expect(detectMention("1. **Starbucks**: open early.", { name: "Starbucks", city: "Austin" }).mentioned).toBe(true);
  });

  it("does not count the word used as an ordinary word", () => {
    const sapphire = { name: "Sapphire", city: "Islamabad", hasWebsite: true };
    expect(detectMention("Jewellers here sell sapphire rings and gold sets.", sapphire).mentioned).toBe(false);
    expect(detectMention("Sapphire stocks lawn suits for summer.", sapphire).mentioned).toBe(true);
  });

  it("still needs the city or phone for a business without a website (D-08)", () => {
    const noSite = { name: "Khaadi", city: "Islamabad", hasWebsite: false };
    expect(detectMention("Brands such as Khaadi are popular.", noSite).mentioned).toBe(false);
    expect(detectMention("Khaadi in Islamabad is popular.", noSite).mentioned).toBe(true);
  });
});

describe("detectMention: domains and aliases", () => {
  it("matches the domain alone", () => {
    const result = detectMention("Source: https://www.aceplumbing.com/reviews", { name: "Ace", website: "aceplumbing.com" });
    expect(result).toMatchObject({ mentioned: true, matchedBy: "domain" });
  });

  it("does not match a domain inside a longer host", () => {
    expect(detectMention("See space.com and ace.com.au", { name: "Zzq", website: "ace.com" }).mentioned).toBe(false);
  });

  it("matches a known alias", () => {
    const result = detectMention("Many people use HRS for roof repair.", { name: "Hernandez Roofing", aliases: ["HRS Roof Services"] });
    expect(result.mentioned).toBe(false);
    const alias = detectMention("HRS Roof Services is quick.", { name: "Hernandez Roofing", aliases: ["HRS Roof Services"] });
    expect(alias).toMatchObject({ mentioned: true, matchedBy: "alias" });
  });

  it("reads the domain from a website URL", () => {
    expect(domainOf("https://www.AcePlumbing.com/about")).toBe("aceplumbing.com");
    expect(domainOf("aceplumbing.com")).toBe("aceplumbing.com");
    expect(domainOf("")).toBeNull();
  });
});

describe("detectMention: businesses without a website (D-08)", () => {
  const noSite = { name: "Hernandez Roofing", city: "Austin", phone: "512-555-0199", hasWebsite: false };

  it("needs the city or phone near the name", () => {
    expect(detectMention("Hernandez Roofing is well reviewed.", noSite).mentioned).toBe(false);
    expect(detectMention("Hernandez Roofing in Austin is well reviewed.", noSite).mentioned).toBe(true);
    expect(detectMention("Hernandez Roofing, 512 555 0199.", noSite).mentioned).toBe(true);
  });
});

describe("detectMention: list position", () => {
  const answer = [
    "Here are some plumbers in Austin:",
    "",
    "1. **Rapid Rooter**: fast and friendly.",
    "   - Phone: 512-555-0100",
    "2. **Hernandez Plumbing Co**: family run.",
    "3. **Radiant Plumbing**: good reviews.",
    "",
    "Hernandez Plumbing also offers financing.",
  ].join("\n");

  it("records the 1-based list item", () => {
    expect(detectMention(answer, { name: "Hernandez Plumbing" }).position).toBe(2);
    expect(detectMention(answer, { name: "Radiant Plumbing" }).position).toBe(3);
  });

  it("uses the first list mention even when prose mentions it too", () => {
    const intro = "Hernandez Plumbing is popular.\n\n" + answer;
    expect(detectMention(intro, { name: "Hernandez Plumbing" })).toMatchObject({ mentioned: true, position: 2 });
  });

  it("returns null position outside a list", () => {
    expect(detectMention("Radiant Plumbing is the one to call.", { name: "Radiant Plumbing" })).toMatchObject({
      mentioned: true,
      position: null,
    });
  });

  it("counts bullet lists and markdown headings", () => {
    const bullets = "- Rapid Rooter\n- Radiant Plumbing\n";
    expect(detectMention(bullets, { name: "Radiant Plumbing" }).position).toBe(2);
    const headings = "### 1. Rapid Rooter\nGood.\n### 2. Radiant Plumbing\nAlso good.";
    expect(detectMention(headings, { name: "Radiant Plumbing" }).position).toBe(2);
  });
});

describe("long Google titles (BUG-097)", () => {
  it("finds the brand before the services or branch", () => {
    expect(brandName("Radiant Plumbing, Air Conditioning, & Electrical")).toBe("Radiant Plumbing");
    expect(brandName("Reliant Plumbing - Austin")).toBe("Reliant Plumbing");
    expect(brandName("Abacus Plumbing, Air Conditioning & Electrical")).toBe("Abacus Plumbing");
    expect(brandName("Mr. Rooter Plumbing of Austin", "Austin")).toBe("Mr. Rooter Plumbing");
    expect(brandName("Khaadi | Dolmen Mall Clifton")).toBe("Khaadi");
  });

  it("keeps names with no shorter brand, and never cuts to a generic word", () => {
    expect(brandName("Clarke Kent Plumbing", "Austin")).toBeNull();
    expect(brandName("Roto-Rooter Plumbing & Water Cleanup")).toBeNull();
    expect(brandName("Plumbing - Austin")).toBeNull();
    expect(brandName("Best Plumbing, Heating & Air")).toBeNull();
    expect(brandName("Mr. Rooter Plumbing of Austin")).toBeNull();
  });

  it("counts an answer that writes only the brand", () => {
    const answer = "1. **Radiant Plumbing** - full service, fast response.\n2. **Reliant Plumbing** handles drains.";
    expect(detectMention(answer, { name: "Radiant Plumbing, Air Conditioning, & Electrical", ...austin }).mentioned).toBe(true);
    expect(detectMention(answer, { name: "Reliant Plumbing - Austin", ...austin })).toMatchObject({ mentioned: true, position: 2 });
    expect(detectMention("Mr. Rooter Plumbing is open 24/7.", { name: "Mr. Rooter Plumbing of Austin", ...austin }).mentioned).toBe(true);
  });

  it("finds the brand the website spells, for a branch title with no separator", () => {
    expect(domainBrand("Cheezious Golra Mor Branch", "cheezious.com")).toBe("Cheezious");
    expect(domainBrand("Beyond Wow Plumbing & Drains", "https://www.beyondwow.com")).toBe("Beyond Wow");
    expect(domainBrand("Clarke Kent Plumbing", "clarkekentplumbing.com")).toBeNull();
    expect(domainBrand("Best Plumbing Austin", "best.com")).toBeNull();
    expect(domainBrand("Cheezious", "cheezious.com")).toBeNull();
    const cheezious = { name: "Cheezious Golra Mor Branch", website: "cheezious.com", city: "Islamabad", hasWebsite: true };
    expect(detectMention("For pizza, Cheezious is the local favourite.", cheezious).mentioned).toBe(true);
  });

  it("still needs a one-word brand to read as a name", () => {
    const khaadi = { name: "Khaadi - Dolmen Mall", city: "Karachi", hasWebsite: true };
    expect(detectMention("Khaadi has new lawn prints.", khaadi).mentioned).toBe(true);
    expect(detectMention("a khaadi fabric kurta", khaadi).mentioned).toBe(false);
  });
});

describe("detectMentions", () => {
  it("applies the same rules to competitors", () => {
    const answer = "1. Rapid Rooter\n2. Ace Plumbing (Austin)\nNo mention of aces in space.";
    const result = detectMentions(answer, { name: "Radiant Plumbing" }, [
      { name: "Rapid Rooter" },
      { name: "Ace Plumbing", city: "Austin" },
      { name: "Ace", city: "Dallas" },
    ]);
    expect(result.business.mentioned).toBe(false);
    expect(result.competitors.map((c) => [c.name, c.mentioned, c.position])).toEqual([
      ["Rapid Rooter", true, 1],
      ["Ace Plumbing", true, 2],
      ["Ace", false, null],
    ]);
  });
});

describe("normaliseWithOffsets", () => {
  it("maps normalised characters back to the original text", () => {
    const { norm, offsets } = normaliseWithOffsets("Joe's  Café & Co.");
    expect(norm).toBe("joes cafe and co");
    expect(offsets[norm.indexOf("cafe")]).toBe(7);
  });
});
