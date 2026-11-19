import { describe, expect, it } from "vitest";
import { SCAN_FIX_COUNTING, fixCounting, fromOlderCount } from "./fix-counting";

describe("fix counting", () => {
  it("treats a fix written before versions as version 1", () => {
    expect(fixCounting({ rank: 2 })).toBe(1);
    expect(fixCounting(null)).toBe(1);
    expect(fixCounting({ counting: SCAN_FIX_COUNTING })).toBe(SCAN_FIX_COUNTING);
  });

  it("flags only open scan fixes from older counting rules", () => {
    expect(fromOlderCount({ source: "scan", status: "open", evidence_data: {} })).toBe(true);
    expect(fromOlderCount({ source: "scan", status: "open", evidence_data: { counting: SCAN_FIX_COUNTING } })).toBe(false);
    expect(fromOlderCount({ source: "scan", status: "done", evidence_data: {} })).toBe(false);
    expect(fromOlderCount({ source: "report", status: "open", evidence_data: {} })).toBe(false);
    expect(fromOlderCount({ source: "manual", status: "open", evidence_data: {} })).toBe(false);
  });
});
