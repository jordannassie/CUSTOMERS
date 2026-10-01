import { describe, expect, it } from "vitest";
import { isShareToken, logoType, newShareToken, reportPeriod, storagePath, reportSummary } from "./service";
import type { LeaderRow } from "@/modules/competitors";

describe("newShareToken", () => {
  it("is 32 random bytes in URL-safe base64, different every time", () => {
    const tokens = new Set(Array.from({ length: 100 }, newShareToken));
    expect(tokens.size).toBe(100);
    for (const token of tokens) {
      expect(isShareToken(token)).toBe(true);
      expect(Buffer.from(token, "base64url")).toHaveLength(32);
    }
  });
});

describe("isShareToken", () => {
  it("refuses anything that cannot be a token before it reaches the database", () => {
    for (const bad of ["", "abc", "a".repeat(42), "a".repeat(44), `${"a".repeat(42)}=`, `${"a".repeat(42)}/`, `${"a".repeat(42)}%`]) {
      expect(isShareToken(bad)).toBe(false);
    }
  });
});

describe("reportPeriod", () => {
  it("names the 30 days the score covers", () => {
    expect(reportPeriod(new Date("2026-09-29T12:00:00Z"), 30)).toBe("Aug 31 to Sep 29, 2026");
    expect(reportPeriod(new Date("2026-01-10T12:00:00Z"), 30)).toBe("Dec 12, 2025 to Jan 10, 2026");
  });
});

describe("logoType", () => {
  it("knows PNG, JPG and WebP by their first bytes, nothing else", () => {
    expect(logoType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0]))).toBe("image/png");
    expect(logoType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(logoType(new TextEncoder().encode("RIFF1234WEBPVP8 "))).toBe("image/webp");
    expect(logoType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("storagePath", () => {
  const base = "https://abc.supabase.co";
  it("reads the path of a logo in our own bucket", () => {
    expect(storagePath(`${base}/storage/v1/object/public/business-logos/agencies/x/logo?v=1`, base, "business-logos")).toBe(
      "agencies/x/logo",
    );
  });
  it("refuses other hosts, buckets and path tricks", () => {
    for (const url of [
      "https://evil.example/storage/v1/object/public/business-logos/a",
      `${base}/storage/v1/object/public/other/a`,
      `${base}/storage/v1/object/public/business-logos/../secret`,
      `${base}/storage/v1/object/public/business-logos/%2E%2E/other/b`,
      "not a url",
    ]) {
      expect(storagePath(url, base, "business-logos")).toBeNull();
    }
  });
});

describe("reportSummary", () => {
  const row = (name: string, score: number | null, standing: LeaderRow["standing"], isYou = false): LeaderRow => ({
    name,
    isYou,
    score,
    standing,
    collecting: false,
    shade: null,
  });
  const base = { businessName: "Harbor Dental", score: 62, monthChange: null, leaderboard: [], firstFix: null };

  it("says the score, a real change, the competitor ahead and the first fix", () => {
    const summary = reportSummary({
      ...base,
      monthChange: { direction: "up", points: 9 },
      leaderboard: [row("Casco Bay", 81, "behind"), row("Harbor Dental", 62, null, true), row("Old Port", 40, "ahead")],
      firstFix: "Get listed on Yelp with full details",
    });
    expect(summary).toEqual([
      "Over the last 30 days, AI recommended Harbor Dental in about 6 of 10 customer questions, up 9 points on the 30 days before.",
      "AI recommended Casco Bay more often, in about 8 of 10 questions.",
      "First fix: Get listed on Yelp with full details.",
    ]);
  });

  it("never claims a lead inside the margin", () => {
    const summary = reportSummary({ ...base, leaderboard: [row("Casco Bay", 66, "about_same")] });
    expect(summary[1]).toBe("Casco Bay, the competitor AI recommended most, was about level with Harbor Dental.");
  });

  it("skips competitors still collecting and says nothing before a score", () => {
    expect(reportSummary({ ...base, leaderboard: [row("New Dental", 90, null)] })).toHaveLength(1);
    expect(reportSummary({ ...base, score: null })).toEqual([]);
  });
});
