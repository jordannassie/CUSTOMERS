import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { captureCredit, releaseHold } from "@/modules/credits";
import { addBusiness, createAgency, deleteTestUsers, fakeMail, grantPlan, service, spend } from "./notifications.test-helpers";

// B-62 against the local database `npm test` rebuilds: low credits, the weekly report and the welcome email,
// each sent once however often its trigger runs. Other test files create agencies at the same time, so every
// job here only looks at this file's agencies.
vi.setConfig({ testTimeout: 30_000 });
const workerSecret = vi.hoisted(() => ({ value: "" }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, key) => (key === "WORKER_SECRET" ? workerSecret.value : Reflect.get(t, key)) }) };
});

const { listLowCreditAgencies, listWeeklyReportAgencies } = await import("./dal");
const { handleEmailJobRequest, liveJobDeps, runLowCredits, runWeeklyReport } = await import("./jobs");
const { sendWelcomeEmail } = await import("./welcome");

afterAll(deleteTestUsers);

function deps(mine: string[], send: ReturnType<typeof fakeMail>["send"]) {
  const ours = new Set(mine);
  return liveJobDeps({
    lowCreditAgencies: async () => (await listLowCreditAgencies()).filter((a) => ours.has(a.agencyId)),
    reportAgencies: async () => (await listWeeklyReportAgencies()).filter((a) => ours.has(a.id)),
    send,
  });
}

describe("low credits", () => {
  it("sends at 80% used, at 0 and below 0, each once per period", async () => {
    const a = await createAgency();
    const business = await addBusiness(a, "Low Credit Plumbing");
    const periodEnd = await grantPlan(a.agencyId, 100);
    const mail = fakeMail();
    const run = () => runLowCredits(deps([a.agencyId], mail.send));

    await spend(a, business, 79, 79);
    expect(await run()).toMatchObject({ sent: 0 });

    await spend(a, business, 6, 6);
    expect(await run()).toMatchObject({ sent: 1 });
    expect(await run()).toMatchObject({ sent: 0 });
    expect(mail.sent[0]).toMatchObject({ to: a.email, subject: "You've used 80% of your credits" });
    expect(mail.sent[0].text).toContain("You've used 85 of your 100 credits");

    // A running scan's hold is not spent yet: 15 left, 20 held, 15 captured so far.
    const hold = await spend(a, business, 20, 15, false);
    expect(await run()).toMatchObject({ sent: 1 });
    expect(mail.sent[1].subject).toBe("You're out of credits");

    // The scan finishes past the end of the balance (D-54).
    for (let i = 0; i < 5; i++) await captureCredit(hold, randomUUID());
    await releaseHold(hold);
    expect(await run()).toMatchObject({ sent: 1 });
    expect(await run()).toMatchObject({ sent: 0 });
    expect(mail.sent[2].subject).toBe("Your credit balance is below zero");
    expect(mail.sent[2].text).toContain("your balance is now -5");

    const { data: log } = await service
      .from("email_log")
      .select("idempotency_key")
      .eq("agency_id", a.agencyId)
      .eq("type", "low_credits")
      .order("sent_at")
      .throwOnError();
    const period = periodEnd.toISOString();
    expect(log.map((r) => r.idempotency_key)).toEqual(
      ["low", "empty", "negative"].map((level) => `low_credits:${a.agencyId}:${period}:${level}`),
    );
  });

  it("leaves out agencies that never had credits and agencies that are not paying", async () => {
    const setup = await createAgency({ status: "trialing" });
    const pastDue = await createAgency({ status: "past_due" });
    await grantPlan(pastDue.agencyId, 1);
    await spend(pastDue, await addBusiness(pastDue, "Past Due Cafe"), 1, 1);
    const listed = (await listLowCreditAgencies()).map((a) => a.agencyId);
    expect(listed).not.toContain(setup.agencyId);
    expect(listed).not.toContain(pastDue.agencyId);
  });
});

describe("weekly report", () => {
  it("sends each agency one summary a week with scores, new fixes and a share link", async () => {
    const a = await createAgency();
    const scored = await addBusiness(a, "Sunrise Coffee Bar", { scored: true });
    await addBusiness(a, "Brand New Bakery");
    const mail = fakeMail();
    const run = () => runWeeklyReport(deps([a.agencyId], mail.send));

    expect(await run()).toMatchObject({ sent: 1, failed: 0 });
    expect(await run()).toMatchObject({ sent: 0 });

    const [email] = mail.sent;
    expect(email.subject).toBe("Your weekly report: 2 businesses, no big moves");
    expect(email.text).toContain("Sunrise Coffee Bar");
    expect(email.text).toContain("67 out of 100");
    expect(email.text).toContain("Add your opening hours to your website");
    expect(email.text).toContain("No score yet");
    const { data: shares } = await service.from("report_shares").select("token").eq("business_id", scored).is("revoked_at", null).throwOnError();
    expect(shares).toHaveLength(1);
    expect(email.html).toContain(`href="https://app.example/r/${shares[0].token}"`);
    expect(email.html).toContain("Unsubscribe from weekly reports");
  });

  it("never turns a share link back on, skips agencies with no scores, and respects unsubscribes", async () => {
    const revoked = await createAgency();
    const business = await addBusiness(revoked, "Closed Link Dental", { scored: true });
    await service.from("report_shares").insert({ business_id: business, token: randomBytes(32).toString("base64url"), revoked_at: new Date().toISOString() }).throwOnError();
    const empty = await createAgency();
    await addBusiness(empty, "No Scans Yet Roofing");
    const unsubscribed = await createAgency({ weeklyReport: false });
    await addBusiness(unsubscribed, "Quiet Florist", { scored: true });
    const mail = fakeMail();

    const summary = await runWeeklyReport(deps([revoked.agencyId, empty.agencyId, unsubscribed.agencyId], mail.send));

    expect(summary).toMatchObject({ sent: 1, skipped: 1, failed: 0 });
    expect(mail.sent.map((m) => m.to)).toEqual([revoked.email]);
    expect(mail.sent[0].html).toContain('href="https://app.example/dashboard"');
    const { data: live } = await service.from("report_shares").select("id").eq("business_id", business).is("revoked_at", null).throwOnError();
    expect(live).toEqual([]);
  });
});

describe("welcome", () => {
  it("sends once per agency", async () => {
    const a = await createAgency({ status: "trialing" });
    const mail = fakeMail();
    expect(await sendWelcomeEmail({ to: a.email, agencyId: a.agencyId }, mail.send)).toMatchObject({ status: "sent" });
    expect(await sendWelcomeEmail({ to: a.email, agencyId: a.agencyId }, mail.send)).toEqual({ status: "skipped", reason: "duplicate" });
    expect(mail.sent.map((m) => m.subject)).toEqual(["Welcome to Customers.Direct"]);
  });
});

describe("email job route", () => {
  const post = (body: unknown, secret?: string) =>
    new Request("http://app.test/api/email/jobs", {
      method: "POST",
      headers: secret ? { "x-worker-secret": secret } : {},
      body: JSON.stringify(body),
    });

  it("needs the worker secret and a known job", async () => {
    workerSecret.value = randomBytes(16).toString("hex");
    expect((await handleEmailJobRequest(post({ job: "weekly_report" }))).status).toBe(401);
    expect((await handleEmailJobRequest(post({ job: "weekly_report" }, "wrong"))).status).toBe(401);
    expect((await handleEmailJobRequest(post({ job: "spam" }, workerSecret.value))).status).toBe(400);
    const none = liveJobDeps({ lowCreditAgencies: async () => [] });
    const ok = await handleEmailJobRequest(post({ job: "low_credits" }, workerSecret.value), none);
    expect(await ok.json()).toEqual({ job: "low_credits", sent: 0, skipped: 0, failed: 0, remaining: 0 });
  });
});
