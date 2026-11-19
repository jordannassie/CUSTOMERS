import { describe, expect, it } from "vitest";
import { answerBlocks, markNames } from "./answer-format";

describe("answerBlocks", () => {
  it("turns numbered and bulleted lines into lists, and the rest into paragraphs", () => {
    const text = "Here are good options:\n\n1. Bean House - great espresso\n2. Blue Door\ncarries on\n\n- Open late\n- Parking\n\nEnjoy.";
    expect(answerBlocks(text)).toEqual([
      { kind: "p", text: "Here are good options:" },
      { kind: "list", ordered: true, items: ["Bean House - great espresso", "Blue Door carries on"] },
      { kind: "list", ordered: false, items: ["Open late", "Parking"] },
      { kind: "p", text: "Enjoy." },
    ]);
  });

  it("keeps a plain answer as one paragraph", () => {
    expect(answerBlocks("Try a few local plumbers.")).toEqual([{ kind: "p", text: "Try a few local plumbers." }]);
  });
});

describe("markNames", () => {
  it("marks you and other businesses, longest name first, any case", () => {
    expect(markNames("Sunrise Coffee Bar and bean house beat Bean.", "Sunrise Coffee Bar", ["Bean House", "Bean"])).toEqual([
      { text: "Sunrise Coffee Bar", mark: "you" },
      { text: " and ", mark: null },
      { text: "bean house", mark: "other" },
      { text: " beat ", mark: null },
      { text: "Bean", mark: "other" },
      { text: ".", mark: null },
    ]);
  });

  it("leaves text alone with no names", () => {
    expect(markNames("Nothing here.", null, [])).toEqual([{ text: "Nothing here.", mark: null }]);
  });
});
