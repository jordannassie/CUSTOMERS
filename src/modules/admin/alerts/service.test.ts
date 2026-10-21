import { describe, expect, it, vi } from "vitest";
import { alertWording, isServiceCheckKind, notifyAdmins, serviceAlertChanges, type NotifyDeps } from "./service";

// Before email is set up (no EMAIL_FROM or Resend key), sending throws. The alerts check must still finish.
describe("notifyAdmins when email can't be sent", () => {
  it("counts the alert as failed, keeps it unemailed and does not throw", async () => {
    const markEmailed = vi.fn(async () => {});
    const deps: NotifyDeps = {
      unemailed: async () => [
        { id: "a1", kind: "stuck_jobs", severity: "warning", message: "2 scans are stuck.", createdAt: "2026-10-21T07:00:00Z", lastSeenAt: "2026-10-21T07:00:00Z" },
      ],
      emailedSince: async () => false,
      markEmailed,
      send: async () => {
        throw new Error("Email is not configured. Set EMAIL_FROM.");
      },
      recipients: ["admin@example.com"],
      now: () => new Date("2026-10-21T07:00:00Z"),
    };
    await expect(notifyAdmins(deps)).resolves.toEqual({ emailed: 0, held: 0, failed: 1 });
    expect(markEmailed).not.toHaveBeenCalled();
  });
});

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

describe("serviceAlertChanges (Settings checks open and close alerts)", () => {
  const svc = (id: string, group: string, state: string, detail = "Connected. The key works.") => ({ id, name: id, group, state, detail });

  it("opens an alert for each broken service, urgent unless it is a data service", () => {
    const { raise } = serviceAlertChanges([
      svc("anthropic", "ai", "error", "The key was rejected (401)."),
      svc("job_settings", "jobs", "error", "Scheduled and retried scans can't start"),
      svc("firecrawl", "data", "error", "Unexpected answer (418)."),
    ]);
    expect(raise).toEqual([
      { kind: "service_check:anthropic", severity: "critical", serviceId: "anthropic", message: "anthropic is not working. The key was rejected (401). Found by the Settings check." },
      { kind: "service_check:job_settings", severity: "critical", serviceId: "job_settings", message: "job_settings is not working. Scheduled and retried scans can't start. Found by the Settings check." },
      expect.objectContaining({ kind: "service_check:firecrawl", severity: "warning" }),
    ]);
  });

  it("closes the alert of a working service and leaves unknown or not set up ones alone", () => {
    const changes = serviceAlertChanges([svc("openai", "ai", "ok"), svc("perplexity", "ai", "unknown"), svc("resend", "data", "not_configured")]);
    expect(changes).toEqual({ raise: [], resolve: ["service_check:openai"] });
    expect(isServiceCheckKind("service_check:openai")).toBe(true);
    expect(isServiceCheckKind("failed_scans")).toBe(false);
  });
});
