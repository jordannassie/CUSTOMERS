import { describe, expect, it } from "vitest";
import { answerNames } from "./names";

const YOU = "Bean There Coffee";

describe("answerNames", () => {
  it("reads extracted names, under the names we know the business and competitors by", () => {
    const extracted = {
      promptVersion: "v3",
      names: [
        { name: "Bean There", position: 1, matches: "business", competitorName: null },
        { name: "The Daily Grind Cafe", position: 2, matches: "competitor", competitorName: "Daily Grind" },
        { name: " Slice Theory ", position: 3, matches: null, competitorName: null },
        { name: 4 },
        null,
      ],
    };
    expect(answerNames(extracted, [], true, YOU)).toEqual([YOU, "Daily Grind", "Slice Theory"]);
  });

  it("falls back to the competitors it named and the business when there are no extracted names", () => {
    expect(answerNames(null, [{ name: "Daily Grind", position: 2 }, { nope: 1 }], true, YOU)).toEqual([YOU, "Daily Grind"]);
    expect(answerNames(undefined, "bad", false, YOU)).toEqual([]);
  });

  it("counts the business when it was named but missing from the extraction", () => {
    expect(answerNames({ names: [{ name: "Slice Theory", matches: null }] }, [], true, YOU)).toEqual([YOU, "Slice Theory"]);
  });
});
