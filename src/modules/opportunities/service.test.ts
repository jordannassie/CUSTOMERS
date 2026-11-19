import { describe, expect, it } from "vitest";
import { fromDbStatus, splitSteps, toDbStatus } from "./service";

describe("opportunities service", () => {
  it("maps the table's legacy statuses to open, done and dismissed", () => {
    expect(["open", "in_progress", "resolved", "dismissed"].map(fromDbStatus)).toEqual(["open", "open", "done", "dismissed"]);
    expect(toDbStatus("done")).toBe("resolved");
    expect(toDbStatus("open")).toBe("open");
  });

  it("splits numbered steps and keeps an old paragraph as one step", () => {
    expect(splitSteps("1. Ask for reviews.\n2. Reply to them.\n")).toEqual(["Ask for reviews.", "Reply to them."]);
    expect(splitSteps("Publish a services page.")).toEqual(["Publish a services page."]);
    expect(splitSteps(null)).toEqual([]);
  });
});
