import { describe, expect, it } from "vitest";
import { apiQuery, EMPTY_VIEW, isFiltered, leadIdFromParams, viewFromParams, viewQuery } from "./lead-query";
import { filterOptions, interestLabel, sourceLabel, stageLabel } from "./lead-types";

const id = "6f1c2b9e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";

describe("Leads view in the address (admin audit 2026-11-12)", () => {
  it("reads the filters, the page and the open lead, with safe defaults", () => {
    const params = new URLSearchParams(`q=bloom&status=opened&replied=yes&handler=Ann@Example.com&unread=1&page=3&lead=${id}`);
    expect(viewFromParams(params)).toEqual({
      page: 3,
      search: "bloom",
      interest: "",
      source: "",
      status: "opened",
      unread: true,
      replied: "yes",
      handler: "ann@example.com",
    });
    expect(leadIdFromParams(params)).toBe(id);
    expect(viewFromParams({ page: "-2", replied: "maybe", handler: "not an email" })).toEqual(EMPTY_VIEW);
    expect(viewFromParams({ handler: ["none", "x"] }).handler).toBe("none");
    expect(leadIdFromParams({ lead: "abc" })).toBeNull();
  });

  it("writes back only what differs from the plain list, so a link round-trips", () => {
    expect(viewQuery(EMPTY_VIEW, null)).toBe("");
    const view = { ...EMPTY_VIEW, search: "a b", replied: "no" as const, handler: "none", page: 2 };
    const qs = viewQuery(view, id);
    expect(qs).toBe(`?q=a+b&replied=no&handler=none&page=2&lead=${id}`);
    expect(viewFromParams(new URLSearchParams(qs))).toEqual(view);
    expect(apiQuery(view)).toBe("page=2&search=a+b&interest=&source=&status=&replied=no&handler=none");
    expect(isFiltered(EMPTY_VIEW)).toBe(false);
    expect(isFiltered({ ...EMPTY_VIEW, replied: "yes" })).toBe(true);
  });
});

describe("Leads filter wording", () => {
  it("lists today's values first and older ones still in use as Older", () => {
    const options = filterOptions({ topics: ["support"], sources: ["ads_page"], statuses: ["resolved"] });
    expect(options.interest.map(([, label]) => label)).toEqual([
      "AI visibility",
      "Join as agency",
      "Book demo call",
      "Video ad order",
      "Other",
      "Older: Support",
    ]);
    expect(options.source.at(-1)).toEqual(["ads_page", "Older: Ads page"]);
    expect(options.status.at(-1)).toEqual(["resolved", "Older: Resolved"]);
    expect(filterOptions({ topics: [], sources: [], statuses: [] }).interest.some(([v]) => v === "chatgpt_ads")).toBe(false);
  });

  it("names video ad briefs and every older value in plain words", () => {
    expect(interestLabel("sales")).toBe("Video ad order");
    expect(interestLabel("chatgpt_ads")).toBe("ChatGPT ads");
    expect(sourceLabel("video_ad")).toBe("AI video ads page");
    expect(sourceLabel(null)).toBe("Not recorded");
    expect(stageLabel("opened")).toBe("Opened");
    expect(stageLabel("in_progress")).toBe("In progress");
  });
});
