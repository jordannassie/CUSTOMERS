import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { captureCredit, grantCredits, releaseHold } from "@/modules/credits";
import { addBusiness, createAgency, deleteTestUsers, fakeMail, grantPlan, service, spend } from "./notifications.test-helpers";

// B-62 against the local database `npm test` rebuilds: low credits, the weekly report and the welcome email,
// each sent once however often its trigger runs. Other test files create agencies at the same time, so every
// job here only looks at this file's agencies.
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
  it("sends at 80% used and when the credits run out, each once per period (BUG-280)", async () => {
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

    // The scan finishes past the end of the balance (D-54): already told it ran out, so no second email.
    for (let i = 0; i < 5; i++) await captureCredit(hold, randomUUID());
    await releaseHold(hold);
    expect(await run()).toMatchObject({ sent: 0 });
    expect(mail.sent).toHaveLength(2);

    const { data: log } = await service
      .from("email_log")
      .select("idempotency_key")
      .eq("agency_id", a.agencyId)
      .eq("type", "low_credits")
      .order("sent_at")
      .throwOnError();
    const period = periodEnd.toISOString();
    expect(log.map((r) => r.idempotency_key)).toEqual(
      ["low", "zero"].map((level) => `low_credits:${a.agencyId}:${period}:${level}`),
    );
  });

  it("sends the below-zero wording when the balance goes straight past zero, and keeps the key when the renewal date moves", async () => {
    const a = await createAgency();
    const business = await addBusiness(a, "Overdrawn Plumbing");
    const periodKey = await grantPlan(a.agencyId, 10);
    // One scan holds 12 with 10 left and finishes past the end of the balance (D-54).
    await spend(a, business, 12, 12);
    const mail = fakeMail();
    expect(await runLowCredits(deps([a.agencyId], mail.send))).toMatchObject({ sent: 1 });
    expect(mail.sent[0].subject).toBe("Your credit balance is below zero");
    // The webhook sets a renewal date that differs from the grant's expiry: same period, same key, no new email.
    await service.from("agencies").update({ current_period_end: new Date(periodKey.getTime() + 86_400_000).toISOString() }).eq("id", a.agencyId).throwOnError();
    const [listed] = (await listLowCreditAgencies()).filter((r) => r.agencyId === a.agencyId);
    expect(listed.periodKey?.toISOString()).toBe(periodKey.toISOString());
    expect(listed.periodEnd?.toISOString()).not.toBe(periodKey.toISOString());
    expect(await runLowCredits(deps([a.agencyId], mail.send))).toMatchObject({ sent: 0 });
  });

  it("stays quiet when the period's plan credits are used but plenty is still left (step 9d)", async () => {
    const a = await createAgency();
    const business = await addBusiness(a, "Plenty Left Plumbing");
    await grantPlan(a.agencyId, 100);
    await spend(a, business, 85, 85);
    // 85 of 100 plan credits used, but a 500 credit top-up is still there: 515 to spend.
    await grantCredits({ agencyId: a.agencyId, source: "topup", sourceId: `ch_${randomUUID()}`, amount: 500, expiresAt: null });
    const mail = fakeMail();
    expect(await runLowCredits(deps([a.agencyId], mail.send))).toMatchObject({ sent: 0 });
    expect(await listLowCreditAgencies().then((rows) => rows.filter((r) => r.agencyId === a.agencyId))).toEqual([]);
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
  it("sends each agency one summary a week with each business's report numbers and a link to its PDF", async () => {
    const a = await createAgency({ isTest: false });
    const scored = await addBusiness(a, "Sunrise Coffee Bar", { scored: true });
    await addBusiness(a, "Brand New Bakery");
    const mail = fakeMail();
    const run = () => runWeeklyReport(deps([a.agencyId], mail.send));

    expect(await run()).toMatchObject({ sent: 1, failed: 0 });
    expect(await run()).toMatchObject({ sent: 0 });

    const [email] = mail.sent;
    expect(email.subject).toBe("Your weekly report: 2 businesses, no big moves");
    // The text part is the report summary (D-90): the same numbers as the PDF the link opens.
    expect(email.text).toContain("Sunrise Coffee Bar: AI visibility report");
    expect(email.text).toContain("Visibility score: 67/100, 2 of 3 answers named Sunrise Coffee Bar.");
    expect(email.text).toContain("No score yet");
    expect(email.html).toContain("67");
    const { data: shares } = await service.from("report_shares").select("token").eq("business_id", scored).is("revoked_at", null).throwOnError();
    expect(shares).toHaveLength(1);
    expect(email.html).toContain(`href="https://app.example/r/${shares[0].token}"`);
    expect(email.text).toContain(`Full report (PDF): https://app.example/r/${shares[0].token}`);
    expect(email.html).toContain("Unsubscribe from weekly reports");
    expect(email.text).toContain("Unsubscribe from weekly reports: ");
    // The report was saved once, and its fixes are in Actions.
    const { data: reports } = await service.from("reports").select("id").eq("business_id", scored).throwOnError();
    expect(reports).toHaveLength(1);
  });

  it("never turns a share link back on, skips agencies with no scores, and respects unsubscribes", async () => {
    const revoked = await createAgency({ isTest: false });
    const business = await addBusiness(revoked, "Closed Link Dental", { scored: true });
    await service.from("report_shares").insert({ business_id: business, token: randomBytes(32).toString("base64url"), revoked_at: new Date().toISOString() }).throwOnError();
    const empty = await createAgency({ isTest: false });
    await addBusiness(empty, "No Scans Yet Roofing");
    const unsubscribed = await createAgency({ weeklyReport: false, isTest: false });
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

describe("weekly report in test mode (D-61)", () => {
  it("is never sent to a test agency, whose scores are sample data", async () => {
    const test = await createAgency({ isTest: true });
    await addBusiness(test, "Sample Coffee", { scored: true });
    const mail = fakeMail();
    expect((await listWeeklyReportAgencies()).some((a) => a.id === test.agencyId)).toBe(false);
    expect(await runWeeklyReport(deps([test.agencyId], mail.send))).toMatchObject({ sent: 0 });
  });
});
