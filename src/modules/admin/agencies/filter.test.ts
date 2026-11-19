import { describe, expect, it } from "vitest";
import { filterCondition } from "./dal";
import { AGENCY_FILTERS } from "./schema";

// QA round 2, item 7: the Agencies "Customers" tab counts exactly what the admin Overview calls customer agencies.
describe("agency filter tabs", () => {
  it("Customers is every agency that is neither a test agency nor deleted, the Overview's number", () => {
    expect(filterCondition("customers", "2026-11-13T00:00:00.000Z")).toBe("and(is_test.is.false,status.neq.deleted)");
  });

  it("offers the Customers tab first, right after All", () => {
    expect(AGENCY_FILTERS[0]).toBe("customers");
  });
});
