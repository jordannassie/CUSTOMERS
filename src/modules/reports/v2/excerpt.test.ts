import { describe, expect, it } from "vitest";
import { excerptAround, plainAnswer } from "./excerpt";

describe("excerptAround", () => {
  const answer = [
    "Here are some good options in Rawalpindi:",
    "",
    "1. **Pizza Hut** on Murree Road is a reliable choice with fast delivery [1].",
    "2. **Cheezious** is popular with students for its deals and generous cheese ([source](https://example.com)).",
    "3. Domino's has many branches.",
  ].join("\n");

  it("takes the sentence that names the business, without markdown or citation marks", () => {
    expect(excerptAround(answer, ["Cheezious"])).toBe("Cheezious is popular with students for its deals and generous cheese.");
    expect(excerptAround(answer, ["Pizza Hut"])).toBe("Pizza Hut on Murree Road is a reliable choice with fast delivery.");
  });

  it("adds the next sentence of the same paragraph when the first is short", () => {
    expect(excerptAround("Cheezious is cheap. It has 12 branches across the city.\nPizza Hut is fast.", ["Cheezious"])).toBe(
      "Cheezious is cheap. It has 12 branches across the city.",
    );
  });

  it("finds a shortened name and returns null when none is named", () => {
    expect(excerptAround("Try Cheezious for value.", ["Cheezious Pizza"])).toBe("Try Cheezious for value.");
    expect(excerptAround("Try somewhere else.", ["Cheezious"])).toBeNull();
  });

  it("keeps a long sentence short, cut on a word", () => {
    const long = `${"Many places are good and ".repeat(20)}Cheezious stands out for value.`;
    const text = excerptAround(long, ["Cheezious"], 120)!;
    expect(text.length).toBeLessThanOrEqual(120);
    expect(text).toContain("Cheezious");
  });

  it("drops long dashes", () => {
    const dash = String.fromCharCode(0x2014);
    expect(plainAnswer(`Cheezious ${dash} a value pick.`)).toBe("Cheezious, a value pick.");
  });
});
