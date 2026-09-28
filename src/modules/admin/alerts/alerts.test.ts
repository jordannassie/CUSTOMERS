import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { EmailClient } from "@/modules/email";
import { createAgencyWithBusiness, deleteTestUsers, service, signInAs, type TestSession } from "../admin.test-helpers";

// B-69 against the local database `npm test` rebuilds. Alerts are global and other test files write scans at the
// same time, so each test resolves the open alert of its kind first and looks only at that kind afterwards.
const session = vi.hoisted((): TestSession => ({ client: null, adminEmails: "" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, key) => (key === "ADMIN_EMAILS" ? session.adminEmails : Reflect.get(t, key)) }) };
});

const { createNotifyDeps } = await import("./dal");
const { handleAlertsRequest } = await import("./cron");
const { notifyAdmins, EMAIL_EVERY_MS } = await import("./service");
const { sendEmail } = await import("@/modules/email");

const MINUTE = 60_000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();

let fixture: { ownerId: string; agencyId: string; businessId: string };
beforeAll(async () => {
  await signInAs(session, "admin-alerts", { admin: true });
  fixture = await createAgencyWithBusiness("Alerts Test");
});
afterAll(deleteTestUsers);

async function resolveOpen(kind: string) {
  await service.from("system_alerts").update({ resolved_at: new Date().toISOString() }).eq("kind", kind).is("resolved_at", null).throwOnError();
}

async function check(args: Record<string, number> = {}): Promise<string[]> {
  const { data, error } = await service.rpc("check_system_alerts", args);
  if (error) throw error;
  return data;
}

async function openOf(kind: string) {
  const { data } = await service.from("system_alerts").select("id, severity, message").eq("kind", kind).is("resolved_at", null).throwOnError();
  return data;
}

/** The condition opens exactly one alert, and running the check again does not open a second one. */
async function expectFiresOnce(kind: string, args: Record<string, number> = {}) {
  const first = await check(args);
  const open = await openOf(kind);
  expect(open).toHaveLength(1);
  expect(first).toContain(open[0].id);

  const second = await check(args);
  expect(await openOf(kind)).toEqual([expect.objectContaining({ id: open[0].id })]);
  const reopened = await service.from("system_alerts").select("id").in("id", second).eq("kind", kind).throwOnError();
  expect(reopened.data).toEqual([]);
  return open[0];
}

async function job(fields: Record<string, unknown>) {
  const { data } = await service
    .from("scan_jobs")
    .insert({ agency_id: fixture.agencyId, business_id: fixture.businessId, priority: -1_000_000, ...fields })
    .select("id")
    .single()
    .throwOnError();
  return data.id;
}

describe("check_system_alerts (B-69, MVP_SPEC 22)", () => {
  it("failed scans in the last hour: fires once", async () => {
    await resolveOpen("failed_scans");
    await job({ status: "failed", error: "Every check failed: timeout", finished_at: ago(5) });
    // Other files finish scans at the same time, so the share is set to 0 here; the 20% default is checked below.
    const alert = await expectFiresOnce("failed_scans", { p_failed_scan_share: 0 });
    expect(alert.message).toMatch(/^\d+ of \d+ scans failed in the last hour \(\d+%\)\.$/);
  });

  it("failed scans at or under the share: no new alert", async () => {
    await resolveOpen("failed_scans");
    await check({ p_failed_scan_share: 1 });
    expect(await openOf("failed_scans")).toEqual([]);
  });

  it("stuck jobs: fires once", async () => {
    await resolveOpen("stuck_jobs");
    const other = await createAgencyWithBusiness("Alerts Stuck");
    const { error } = await service.from("scan_jobs").insert({
      agency_id: other.agencyId,
      business_id: other.businessId,
      status: "running",
      attempts: 1,
      locked_at: ago(45),
    });
    if (error) throw error;
    const alert = await expectFiresOnce("stuck_jobs");
    expect(alert.severity).toBe("critical");
  });

  it("failed Stripe webhooks: fires once", async () => {
    await resolveOpen("webhook_failures");
    await service
      .from("stripe_webhook_events")
      .insert({ stripe_event_id: `evt_${randomUUID()}`, event_type: "invoice.paid", error: "agency not found" })
      .throwOnError();
    await expectFiresOnce("webhook_failures");
  });

  it("provider error spike: fires once, naming the provider", async () => {
    await resolveOpen("provider_errors");
    await service
      .from("provider_errors")
      .insert(Array.from({ length: 5 }, () => ({ provider: "firecrawl", message: "503 Service Unavailable" })))
      .throwOnError();
    const alert = await expectFiresOnce("provider_errors");
    expect(alert.message).toMatch(/Firecrawl \(\d+\)/);
  });

  it("negative credit balance: fires once", async () => {
    await resolveOpen("negative_balances");
    const overdrawn = await createAgencyWithBusiness("Alerts Overdrawn");
    await service.from("agencies").update({ credit_overdraft: 5 }).eq("id", overdrawn.agencyId).throwOnError();
    const alert = await expectFiresOnce("negative_balances");
    expect(alert.message).toMatch(/negative credit balance\.$/);
  });

  it("daily AI cost over the limit: fires once, and not again the same day after it is resolved", async () => {
    await resolveOpen("daily_ai_cost");
    await service
      .from("usage_events")
      .insert({ account_user_id: fixture.ownerId, usage_type: "ai_visibility_check", provider: "openai", estimated_cost_usd: 2.5 })
      .throwOnError();
    // Without a limit (the pg_cron run inside the database) the cost check is off.
    await check();
    expect(await openOf("daily_ai_cost")).toEqual([]);

    const alert = await expectFiresOnce("daily_ai_cost", { p_daily_cost_limit_usd: 1 });
    expect(alert.message).toMatch(/^AI cost today is \$[\d.]+, over the \$1\.00 daily limit\.$/);
    await resolveOpen("daily_ai_cost");
    await check({ p_daily_cost_limit_usd: 1 });
    expect(await openOf("daily_ai_cost")).toEqual([]);
  });
});

describe("alert emails (B-69)", () => {
  const recipients = ["ops-one@example.test", "ops-two@example.test"];
  const settings = { from: "Customers.Direct <alerts@mail.example>", baseUrl: "https://app.example", unsubscribeSecret: null };

  function transport() {
    const sent: { to: string; subject: string }[] = [];
    const client: EmailClient = {
      send: async (email) => {
        sent.push({ to: email.to, subject: email.subject });
        return { id: `re_${randomUUID()}` };
      },
    };
    return { sent, send: (input: Parameters<typeof sendEmail>[0]) => sendEmail(input, { client, settings }) };
  }

  async function raise(message: string) {
    const { data, error } = await service.rpc("raise_system_alert", {
      p_kind: "stuck_jobs",
      p_severity: "critical",
      p_message: message,
      p_details: {},
    });
    if (error || !data) throw error ?? new Error("no alert opened");
    return data;
  }

  const emailedAt = async (id: string) =>
    (await service.from("system_alerts").select("emailed_at").eq("id", id).single().throwOnError()).data.emailed_at;

  it("emails every admin once per alert, and at most once per hour per alert kind", async () => {
    await resolveOpen("stuck_jobs");
    const first = await raise(`Test stuck alert ${randomUUID()}`);
    const mail = transport();
    const deps = (now = new Date()) => createNotifyDeps(undefined, { send: mail.send, recipients, now: () => now });
    const about = (id: string) => mail.sent.filter((e) => e.subject.includes(id));

    await notifyAdmins(deps());
    const firstMails = mail.sent.filter((e) => e.subject.startsWith("Urgent alert: Test stuck alert"));
    expect(firstMails.map((e) => e.to).sort()).toEqual(recipients);
    expect(await emailedAt(first)).not.toBeNull();

    await notifyAdmins(deps());
    expect(mail.sent.filter((e) => e.subject.startsWith("Urgent alert: Test stuck alert"))).toHaveLength(2);

    // The same kind fires again within the hour: stored, but no email yet.
    await resolveOpen("stuck_jobs");
    const secondMessage = `Test stuck again ${randomUUID()}`;
    const second = await raise(secondMessage);
    const held = await notifyAdmins(deps());
    expect(held.held).toBeGreaterThanOrEqual(1);
    expect(about(secondMessage)).toEqual([]);
    expect(await emailedAt(second)).toBeNull();

    // An hour later the still-open alert goes out.
    await notifyAdmins(deps(new Date(Date.now() + EMAIL_EVERY_MS + MINUTE)));
    expect(mail.sent.filter((e) => e.subject.includes(secondMessage))).toHaveLength(2);
    expect(await emailedAt(second)).not.toBeNull();
    await resolveOpen("stuck_jobs");
  });

  it("the cron endpoint refuses a call without the worker secret", async () => {
    const res = await handleAlertsRequest(new Request("http://localhost/api/alerts/check", { method: "POST" }));
    expect(res.status).toBe(401);
  });
});
