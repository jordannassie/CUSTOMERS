import { describe, expect, it } from "vitest";
import { duplicateFixes, isLocalUrl, type Business } from "./dedupe-businesses";

// The local de-duplication's rules (2026-10-16). No database: the script itself refuses anything but a local URL.
let n = 0;
const biz = (over: Partial<Business>): Business => ({
  id: `b${++n}`,
  agencyId: "a1",
  name: "Sunrise Coffee",
  domain: null,
  placesId: null,
  status: "active",
  onboardingStep: null,
  isChain: false,
  createdAt: `2026-10-${String(10 + n).padStart(2, "0")}T10:00:00Z`,
  hasScans: false,
  onPlan: false,
  ...over,
});

describe("dedupe-businesses", () => {
  it("only ever runs against a local Supabase", () => {
    expect(isLocalUrl("http://127.0.0.1:54621")).toBe(true);
    expect(isLocalUrl("https://whjdcjoojylajtyjywhx.supabase.co")).toBe(false);
    expect(isLocalUrl("")).toBe(false);
  });

  it("keeps the oldest of each copy and removes newer ones with no scans", () => {
    const first = biz({ domain: "Sunrise.example" });
    const copy = biz({ domain: "sunrise.example" });
    const listing = [biz({ placesId: "ChIJ-1" }), biz({ placesId: "ChIJ-1" })];
    const drafts = [biz({ status: "onboarding", onboardingStep: 4 }), biz({ status: "onboarding", onboardingStep: 6 })];
    // Seeds insert with the default status and no step: not wizard drafts.
    const seeded = [biz({ status: "onboarding" }), biz({ status: "onboarding" })];
    const fixes = duplicateFixes([copy, first, ...listing, ...drafts, ...seeded]);
    expect(fixes).toEqual([
      { id: copy.id, name: copy.name, agencyId: "a1", keptId: first.id, why: "website", action: "remove" },
      { id: listing[1].id, name: listing[1].name, agencyId: "a1", keptId: listing[0].id, why: "listing", action: "remove" },
      { id: drafts[1].id, name: drafts[1].name, agencyId: "a1", keptId: drafts[0].id, why: "draft", action: "remove" },
    ]);
  });

  it("never removes a copy with scans or on a plan, and leaves other agencies and chains alone", () => {
    const kept = biz({ domain: "dental.example" });
    const scanned = biz({ domain: "dental.example", hasScans: true });
    const paid = biz({ domain: "dental.example", onPlan: true, hasScans: true });
    const otherAgency = biz({ domain: "dental.example", agencyId: "a2" });
    const chain = [biz({ domain: "kfc.example", isChain: true, placesId: "ChIJ-f7" }), biz({ domain: "kfc.example", placesId: "ChIJ-g9" })];
    const fixes = duplicateFixes([kept, scanned, paid, otherAgency, ...chain]);
    expect(fixes.map((f) => [f.id, f.action])).toEqual([
      [scanned.id, "keep_has_scans"],
      [paid.id, "keep_on_plan"],
    ]);
  });

  it("lists a business once even when it copies another in two ways", () => {
    const a = biz({ domain: "x.example", placesId: "ChIJ-x" });
    const b = biz({ domain: "x.example", placesId: "ChIJ-x" });
    expect(duplicateFixes([a, b])).toHaveLength(1);
  });
});
