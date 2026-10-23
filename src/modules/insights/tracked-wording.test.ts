import { describe, expect, it } from "vitest";
import { trackedWording } from "./tracked-wording";

// 2026-10-16: "Terra Toys was named in all 6 of the sample questions we tracked."
describe("trackedWording", () => {
  it("calls tracked questions what they are", () => {
    expect(trackedWording("Terra Toys was named in all 6 of the sample questions we tracked.")).toBe(
      "Terra Toys was named in all 6 of the questions we track.",
    );
    expect(trackedWording("Sample questions show you behind.")).toBe("Questions we track show you behind.");
    expect(trackedWording("In 1 sample question you were named.")).toBe("In 1 question we track you were named.");
  });

  it("leaves other text alone", () => {
    expect(trackedWording("Add a sample menu to your site.")).toBe("Add a sample menu to your site.");
    expect(trackedWording("Named in 4 of the questions we track.")).toBe("Named in 4 of the questions we track.");
  });
});
