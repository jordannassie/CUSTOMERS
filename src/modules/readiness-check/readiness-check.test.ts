import { describe, expect, it } from "vitest";
import { readinessCheckInput } from "./schema";
import { compareSites } from "./service";
import { extractSignals, readinessScore } from "./signals";
import { extractDomain, isSafePublicUrl } from "./url";

const STRONG = `<html><head><title>Westlake Dental, family dentist in Austin</title>
<meta name="description" content="Family and cosmetic dentistry in Westlake, Austin. Same-week appointments, most insurance accepted.">
<script type="application/ld+json">{"@type":"Dentist","name":"Westlake Dental"}</script></head>
<body><h1>Westlake Dental</h1><h2>Services</h2><h2>Reviews</h2>
<address>123 Main St</address><p>Call (512) 555-0100</p>
<form>Request an appointment</form>${"<p>Gentle cleanings fillings crowns implants</p>".repeat(90)}</body></html>`;
const BARE = "<html><head><title>Home</title></head><body><p>Welcome</p></body></html>";

describe("readiness signals", () => {
  it("scores a complete site high and a bare page low", () => {
    expect(readinessScore(extractSignals(STRONG))).toBe(100);
    expect(readinessScore(extractSignals(BARE))).toBe(0);
  });
});

describe("compareSites", () => {
  it("returns scores, checks and a top finding", () => {
    const result = compareSites(
      { domain: "mine.com", signals: extractSignals(BARE) },
      { domain: "them.com", signals: extractSignals(STRONG) },
    );
    expect(result.mine).toEqual({ domain: "mine.com", reached: true, score: 0 });
    expect(result.them.score).toBe(100);
    expect(result.checks.every((c) => !c.mine && c.them)).toBe(true);
    expect(result.findings[0]).toMatchObject({ level: "High impact", title: "Add business details for AI" });
  });

  it("marks an unreachable site and gives no findings for it", () => {
    const result = compareSites({ domain: "down.com", signals: null }, { domain: "them.com", signals: null });
    expect(result.mine).toEqual({ domain: "down.com", reached: false, score: 0 });
    expect(result.findings).toEqual([]);
  });

  it("never names AI apps we do not check", () => {
    const text = JSON.stringify(
      compareSites({ domain: "a.com", signals: extractSignals(STRONG) }, { domain: "b.com", signals: null }),
    );
    expect(text).not.toMatch(/Gemini|Google AI/i);
  });
});

describe("input", () => {
  it("gives plain messages for bad input", () => {
    const first = (v: unknown) => readinessCheckInput.safeParse(v).error?.issues[0]?.message;
    expect(first(null)).toBe("Enter both websites.");
    expect(first({ myUrl: " ", competitorUrl: "b.com" })).toBe("Enter your website.");
    expect(first({ myUrl: "a.com" })).toBe("Enter a competitor's website.");
    expect(first({ myUrl: `${"a".repeat(300)}.com`, competitorUrl: "b.com" })).toBe("That web address is too long.");
  });
});

describe("urls", () => {
  it("normalises domains", () => {
    expect(extractDomain("https://www.Example.com/page")).toBe("example.com");
  });

  it("blocks private and non-web addresses", () => {
    for (const bad of ["localhost", "127.0.0.1", "10.0.0.2", "192.168.1.1", "169.254.169.254", "metadata.google.internal", "ftp://x.com", "[::1]"]) {
      expect(isSafePublicUrl(bad), bad).toBe(false);
    }
    expect(isSafePublicUrl("example.com")).toBe(true);
  });
});
