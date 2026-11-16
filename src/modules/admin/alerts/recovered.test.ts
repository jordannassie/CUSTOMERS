import { describe, expect, it } from "vitest";
import { recoveredAlertIds } from "./recovered";

const now = new Date("2026-11-16T12:00:00Z");
const alert = (id: string, kind: string, lastSeen: string) => ({ id, kind, last_seen_at: lastSeen });

describe("recoveredAlertIds", () => {
  it("closes the Claude backup alert once a Claude check worked after it was last seen", () => {
    const open = [alert("a", "ai_fallback", "2026-10-23T09:45:00Z"), alert("b", "claude_unavailable", "2026-11-16T11:00:00Z")];
    expect(recoveredAlertIds(open, "2026-11-16T10:00:00Z", now)).toEqual(["a"]);
    expect(recoveredAlertIds(open, null, now)).toEqual([]);
  });

  it("closes an hourly spike after a day with nothing new, not before", () => {
    const open = [alert("old", "provider_errors", "2026-11-01T13:52:00Z"), alert("new", "provider_errors", "2026-11-16T02:00:00Z")];
    expect(recoveredAlertIds(open, null, now)).toEqual(["old"]);
  });

  it("leaves every other kind for an admin", () => {
    expect(recoveredAlertIds([alert("x", "negative_balances", "2026-01-01T00:00:00Z"), alert("y", "service_perplexity", "2026-01-01T00:00:00Z")], "2026-11-16T10:00:00Z", now)).toEqual([]);
  });
});
