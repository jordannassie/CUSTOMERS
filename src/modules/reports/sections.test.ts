import { describe, expect, it } from "vitest";
import { createShareLinkInput, reportParam, saveReportSectionsInput } from "./schema";
import { canHide, parseReportSettings, sectionNumbers, SECTIONS, visibleSections } from "./sections";

describe("report sections", () => {
  it("are always in the fixed order, whatever order they are hidden in", () => {
    expect(SECTIONS).toEqual(["summary", "models", "competitors", "questions", "sources", "actions", "method"]);
    expect(visibleSections(["method", "competitors"])).toEqual(["summary", "models", "questions", "sources", "actions"]);
    expect(visibleSections([])).toEqual([...SECTIONS]);
  });

  it("are numbered by their place among the ones shown", () => {
    expect(sectionNumbers(["models"])).toEqual({ summary: 1, competitors: 2, questions: 3, sources: 4, actions: 5, method: 6 });
  });

  it("keep at least one section on", () => {
    const allButMethod = SECTIONS.filter((s) => s !== "method");
    expect(canHide(allButMethod, "method")).toBe(false);
    expect(canHide(allButMethod, "summary")).toBe(true);
    expect(canHide([], "summary")).toBe(true);
    expect(saveReportSectionsInput.safeParse({ businessId: crypto.randomUUID(), hidden: [...SECTIONS] }).success).toBe(false);
  });

  it("save the hidden list in the fixed order and refuse unknown sections", () => {
    const id = crypto.randomUUID();
    expect(saveReportSectionsInput.parse({ businessId: id, hidden: ["method", "summary"] }).hidden).toEqual(["summary", "method"]);
    expect(saveReportSectionsInput.safeParse({ businessId: id, hidden: ["google"] }).success).toBe(false);
  });

  it("read a stored setting safely: anything broken hides nothing", () => {
    expect(parseReportSettings({ hidden: ["questions", "nope", 3], schedule: "monthly" })).toEqual({ hidden: ["questions"] });
    expect(parseReportSettings({})).toEqual({ hidden: [] });
    expect(parseReportSettings(null)).toEqual({ hidden: [] });
    expect(parseReportSettings("x")).toEqual({ hidden: [] });
  });
});

describe("report inputs", () => {
  it("treat a missing or empty report id as the live report", () => {
    const businessId = crypto.randomUUID();
    expect(createShareLinkInput.parse({ businessId }).reportId).toBeNull();
    expect(createShareLinkInput.parse({ businessId, reportId: null }).reportId).toBeNull();
    expect(createShareLinkInput.safeParse({ businessId, reportId: "x" }).success).toBe(false);
  });

  it("read ?report= as a snapshot id only when it is a uuid", () => {
    const id = crypto.randomUUID();
    expect(reportParam.parse(id)).toBe(id);
    expect(reportParam.parse(undefined)).toBeNull();
    expect(reportParam.parse("../../etc")).toBeNull();
    expect(reportParam.parse([id, id])).toBeNull();
  });
});
