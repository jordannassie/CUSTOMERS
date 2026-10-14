import { describe, expect, it } from "vitest";
import { alertWording } from "./service";

// BUG-161: "36 Stripe webhook events failed in the last hour" still showed three days later.
describe("alertWording", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  const webhook = { kind: "webhook_failures", message: "36 Stripe webhook events failed in the last hour. Customers may not get their credits or plan changes." };

  it("keeps an alert seen in the last hour as it is", () => {
    expect(alertWording({ ...webhook, lastSeenAt: "2026-10-14T11:30:00Z" }, now)).toEqual({ message: webhook.message, stale: false });
  });

  it("stops saying 'in the last hour' once the events stopped, and says nothing new since", () => {
    expect(alertWording({ ...webhook, lastSeenAt: "2026-10-11T18:30:00Z" }, now)).toEqual({
      message: "36 Stripe webhook events failed in one hour. Customers may not get their credits or plan changes.",
      stale: true,
    });
    expect(alertWording({ kind: "provider_errors", message: "Errors in the last hour from Anthropic.", lastSeenAt: "2026-10-14T07:45:00Z" }, now).message).toBe(
      "Errors in one hour from Anthropic.",
    );
  });

  it("leaves alerts that are not about the last hour alone, however old", () => {
    const negative = { kind: "negative_balances", message: "2 agencies have a negative credit balance.", lastSeenAt: "2026-10-01T00:00:00Z" };
    expect(alertWording(negative, now)).toEqual({ message: negative.message, stale: false });
  });
});
