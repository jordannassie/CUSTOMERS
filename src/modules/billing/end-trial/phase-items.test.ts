import { describe, expect, it } from "vitest";
import { itemsToMatchPhase, type LiveItem } from "./phase-items";

const live = (id: string, business: string, price = "price_starter", quantity = 1): LiveItem => ({
  id,
  spec: { price, quantity, metadata: { business_id: business } },
});
const spec = (business: string, price = "price_starter", quantity = 1) => ({ price, quantity, metadata: { business_id: business } });

describe("itemsToMatchPhase", () => {
  it("leaves matching items out and deletes a business that is not in the phase", () => {
    expect(itemsToMatchPhase([live("si_a", "a"), live("si_b", "b")], [spec("a")])).toEqual([{ id: "si_b", deleted: true }]);
  });

  it("changes a business's price in place, keeping its item", () => {
    expect(itemsToMatchPhase([live("si_a", "a", "price_pro")], [spec("a", "price_starter")])).toEqual([
      { id: "si_a", price: "price_starter", quantity: 1, metadata: { business_id: "a" } },
    ]);
  });

  it("adds a business that is only in the phase", () => {
    expect(itemsToMatchPhase([live("si_a", "a")], [spec("a"), spec("c", "price_pro")])).toEqual([spec("c", "price_pro")]);
  });

  it("deletes an item with no business, and changes nothing when the phase already matches", () => {
    const unlinked: LiveItem = { id: "si_x", spec: { price: "p", quantity: 1, metadata: {} } };
    expect(itemsToMatchPhase([live("si_a", "a"), unlinked], [spec("a")])).toEqual([{ id: "si_x", deleted: true }]);
    expect(itemsToMatchPhase([live("si_a", "a")], [spec("a")])).toEqual([]);
  });
});
