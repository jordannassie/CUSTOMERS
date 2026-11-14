import { describe, expect, it } from "vitest";
import { isShareToken, newShareToken, PDF_LINK_MAX_AGE_MS, shareLinkOpens, storagePath } from "./service";

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

describe("shareLinkOpens", () => {
  const now = new Date("2026-10-28T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it("closes a PDF export's link after a few minutes, in case the export never turned it off", () => {
    expect(shareLinkOpens({ for_pdf: true, created_at: ago(30_000) }, now)).toBe(true);
    expect(shareLinkOpens({ for_pdf: true, created_at: ago(PDF_LINK_MAX_AGE_MS) }, now)).toBe(false);
    expect(shareLinkOpens({ for_pdf: true, created_at: ago(86_400_000) }, now)).toBe(false);
    expect(shareLinkOpens({ for_pdf: true, created_at: "not a date" }, now)).toBe(false);
  });

  it("never closes the agency's own link by age", () => {
    expect(shareLinkOpens({ for_pdf: false, created_at: ago(365 * 86_400_000) }, now)).toBe(true);
  });
});
