import { describe, expect, it } from "vitest";
import { mergeChains, namedAs, rowName, trackedNote } from "./chain";

const row = (name: string, score: number | null, chain: string | null = null, collecting = false) => ({
  name,
  score,
  collecting,
  chain: chain ? { brand: chain, tracked: [name] } : null,
});

describe("chain labels", () => {
  it("names a chain row by the branch you track, and sentences about AI by the chain (2026-10-30)", () => {
    const bennu = row("Bennu Coffee on Congress", 25, "Bennu Coffee");
    expect(rowName(bennu)).toBe("Bennu Coffee on Congress");
    expect(namedAs(bennu)).toBe("Bennu Coffee");
    expect(trackedNote(bennu)).toBeNull();
  });

  it("leaves any other row as tracked", () => {
    const epoch = row("Epoch Coffee", 30);
    expect([rowName(epoch), namedAs(epoch), trackedNote(epoch)]).toEqual(["Epoch Coffee", "Epoch Coffee", null]);
  });
});

describe("mergeChains", () => {
  it("shows two branches of one chain once, listing both", () => {
    const merged = mergeChains([
      row("Bennu Coffee on Congress", 25, "Bennu Coffee"),
      row("Epoch Coffee", 30),
      row("Bennu Coffee East", 28, "Bennu Coffee"),
    ]);
    expect(merged.map((r) => [rowName(r), r.score, trackedNote(r)])).toEqual([
      // The row shows East's score, website and Compare link, so it carries East's name.
      ["Bennu Coffee East", 28, "Also counts Bennu Coffee on Congress"],
      ["Epoch Coffee", 30, null],
    ]);
  });

  it("joins a tracked chain with its branch, and keeps the row compared over the whole window", () => {
    const merged = mergeChains([row("Bennu Coffee on Congress", 40, "Bennu Coffee", true), row("Bennu Coffee", 25)]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ name: "Bennu Coffee", score: 25, collecting: false });
    expect(rowName(merged[0])).toBe("Bennu Coffee");
    expect(trackedNote(merged[0])).toBe("Also counts Bennu Coffee on Congress");
  });

  it("leaves rows alone when there is no chain, or no score yet", () => {
    const rows = [row("Bennu Coffee", 25), row("Bennu Coffee on Congress", null)];
    expect(mergeChains(rows)).toEqual(rows);
  });
});
