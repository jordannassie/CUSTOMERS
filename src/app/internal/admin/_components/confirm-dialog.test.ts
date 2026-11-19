import { describe, expect, it } from "vitest";
import { scanCostMessage } from "./confirm-dialog";

describe("scanCostMessage (Run scan now and Retry)", () => {
  it("says roughly what the scan costs and whose credits it uses", () => {
    expect(scanCostMessage(36, "Acme Agency")).toBe("This uses about 36 credits from Acme Agency. Run it?");
    expect(scanCostMessage(1, "Acme Agency")).toBe("This uses about 1 credit from Acme Agency. Run it?");
    expect(scanCostMessage(1200, "")).toBe("This uses about 1,200 credits from the agency. Run it?");
  });
});
