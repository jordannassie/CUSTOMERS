import { describe, expect, it } from "vitest";
import type { ServiceStatus } from "./schema";
import { statusSummary } from "./summary";

const service = (id: string, state: ServiceStatus["state"], name = id): ServiceStatus => ({ id, name, group: "ai", state, detail: "" });
const nine = Array.from({ length: 9 }, (_, i) => service(`s${i}`, "ok"));

describe("System status headline (admin audit 2026-11-12)", () => {
  it("does not count a service that is off on purpose as not working", () => {
    expect(statusSummary([...nine, service("job_settings", "off", "Automatic scans")])).toEqual({
      title: "All services working",
      offNote: "Automatic scans are off until launch.",
    });
  });

  it("still counts real failures, leaving the off service out of the total", () => {
    const broken = [...nine.slice(1), service("stripe", "error"), service("job_settings", "off", "Automatic scans")];
    expect(statusSummary(broken).title).toBe("1 of 9 services is not working");
    expect(statusSummary([...nine.slice(2), service("a", "error"), service("b", "error")]).title).toBe("2 of 9 services are not working");
  });

  it("counts unknown and not set up services as not working yet, without calling them broken", () => {
    expect(statusSummary([...nine.slice(1), service("x", "unknown")])).toEqual({ title: "8 of 9 services working", offNote: null });
  });
});
