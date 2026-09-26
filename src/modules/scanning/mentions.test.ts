import { describe, expect, it } from "vitest";
import { coreName, domainOf, isGenericName, normaliseWithOffsets } from "./mention-text";
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
