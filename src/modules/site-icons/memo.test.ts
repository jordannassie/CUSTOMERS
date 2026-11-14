import { beforeEach, describe, expect, it } from "vitest";
import { MEMO_ICON_MS, MEMO_MAX, MEMO_MAX_BYTES, MEMO_NONE_MS, clearKeptIcons, keepIcon, keptIcon } from "./memo";

const icon = (bytes = 100) => ({ kind: "icon" as const, body: new ArrayBuffer(bytes), type: "image/png" });

beforeEach(() => clearKeptIcons());

describe("kept site icons", () => {
  it("returns a kept icon until it is a week old", () => {
    keepIcon("yelp.com", icon(), 0);
    expect(keptIcon("yelp.com", MEMO_ICON_MS - 1)?.kind).toBe("icon");
    expect(keptIcon("yelp.com", MEMO_ICON_MS)).toBeNull();
  });

  it("keeps 'this site has no icon' for a day only", () => {
    keepIcon("no-icon.example", { kind: "none" }, 0);
    expect(keptIcon("no-icon.example", MEMO_NONE_MS - 1)).toEqual({ kind: "none" });
    expect(keptIcon("no-icon.example", MEMO_NONE_MS)).toBeNull();
  });

  it("never keeps a failed ask or an oversized image", () => {
    keepIcon("down.example", { kind: "failed" }, 0);
    keepIcon("huge.example", icon(MEMO_MAX_BYTES + 1), 0);
    expect(keptIcon("down.example", 1)).toBeNull();
    expect(keptIcon("huge.example", 1)).toBeNull();
  });

  it("drops the least recently used host past the limit", () => {
    for (let i = 0; i < MEMO_MAX; i++) keepIcon(`site${i}.example`, icon(), 0);
    expect(keptIcon("site0.example", 1)).not.toBeNull(); // used again, so site1 is now the oldest
    keepIcon("new.example", icon(), 0);
    expect(keptIcon("site1.example", 1)).toBeNull();
    expect(keptIcon("site0.example", 1)).not.toBeNull();
    expect(keptIcon("new.example", 1)).not.toBeNull();
  });
});
