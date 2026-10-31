import { describe, expect, it } from "vitest";
import { BEAN_HOUSE_ID, COFFEE_SIGNALS } from "./fixtures";
import { fillPlaceholders, formatSignal, toStored, type Lookup } from "./placeholders";

const keys = { c1: BEAN_HOUSE_ID };
const lookup: Lookup = (subject, field) =>
  formatSignal(
    COFFEE_SIGNALS.get("business" in subject ? "ChIJ-fixture-sunrise-coffee" : subject.competitorId === BEAN_HOUSE_ID ? "ChIJ-fixture-bean-house" : ""),
    field,
  );

describe("placeholders", () => {
  it("stores competitor keys as ids, and refuses a key it was not given", () => {
    expect(toStored("{c1.review_count} against {you.review_count}", keys)).toBe(
      `{competitor.${BEAN_HOUSE_ID}.review_count} against {business.review_count}`,
    );
    expect(toStored("{c9.rating}", keys)).toBeNull();
  });

  it("fills live values at display time", () => {
    const stored = toStored("Bean House has {c1.review_count} Google reviews at {c1.rating}. You have {you.review_count}.", keys)!;
    expect(fillPlaceholders(stored, lookup)).toBe("Bean House has 320 Google reviews at 4.7. You have 12.");
    expect(fillPlaceholders(toStored("Open {c1.open_days} days, {c1.category}.", keys)!, lookup)).toBe("Open 7 days, coffee shop.");
  });

  it("leaves out a sentence Google cannot fill right now, and keeps the rest", () => {
    const stored = toStored("AI named Bean House in 5 answers. It has {c1.review_count} reviews.\n1. Ask for reviews.", keys)!;
    expect(fillPlaceholders(stored, () => null)).toBe("AI named Bean House in 5 answers.\n1. Ask for reviews.");
  });
});
