import { describe, expect, it } from "vitest";
import { inlineParts, namedBusinesses, shortLine, withoutUrls } from "./answer-parse";

const MAPS = "https://www.google.com/maps/place/Slice+Theory/@33.6,73.0,17z/data=!3m1!4b1?utm_source=openai";

describe("inlineParts", () => {
  it("turns raw web addresses into sources and never keeps the address as text", () => {
    const parts = inlineParts(`Slice Theory is good (${MAPS}). See also https://yelp.com/biz/a.`);
    expect(parts).toEqual([
      { kind: "text", text: "Slice Theory is good " },
      { kind: "source", host: "google.com", url: MAPS },
      { kind: "text", text: ". See also " },
      { kind: "source", host: "yelp.com", url: "https://yelp.com/biz/a" },
      { kind: "text", text: "." },
    ]);
    expect(parts.filter((p) => p.kind === "text").map((p) => (p as { text: string }).text).join("")).not.toContain("http");
  });

  it("leaves text with no address alone", () => {
    expect(inlineParts("Try Bean House.")).toEqual([{ kind: "text", text: "Try Bean House." }]);
  });

  it("gives the words without the addresses for a short line", () => {
    expect(withoutUrls(`Great pizza (${MAPS}) and fast delivery.`)).toBe("Great pizza and fast delivery.");
    expect(shortLine("First sentence here. Second one.")).toBe("First sentence here.");
    expect(shortLine("word ".repeat(60), 40).endsWith("…")).toBe(true);
  });
});

describe("namedBusinesses", () => {
  it("lists the businesses in the answer's order, with the line after each name", () => {
    const text = [
      "Here are good options:",
      "",
      `1. Slice Theory - Handmade pizzas, delivered in 30 to 45 minutes (${MAPS}).`,
      "2. Sunrise Pizza: Cheesy pizzas at fair prices. Open late.",
      "3. Something else entirely",
      "",
      "You could also try Pizza Hut for deals.",
    ].join("\n");
    expect(namedBusinesses(text, "Sunrise Pizza", ["Pizza Hut", "Slice Theory", "Not There"])).toEqual([
      { name: "Slice Theory", you: false, line: "Handmade pizzas, delivered in 30 to 45 minutes." },
      { name: "Sunrise Pizza", you: true, line: "Cheesy pizzas at fair prices." },
      { name: "Pizza Hut", you: false, line: "You could also try Pizza Hut for deals." },
    ]);
  });

  it("gives nothing when no name is in the text", () => {
    expect(namedBusinesses("Ask around.", "Sunrise Pizza", ["Pizza Hut"])).toEqual([]);
  });
});
