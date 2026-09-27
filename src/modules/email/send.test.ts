import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { EmailLogRow, EmailStore } from "./dal";
import type { EmailClient } from "./resend";
import { sendEmail, type SendEmailDeps, type SendEmailInput } from "./send";
import { verifyUnsubscribeToken } from "./service";
import NoticeEmail from "./templates/notice";

// Every test passes a fake client, so nothing here reaches Resend (B-61: no real email before B-01 and F-12).
const SECRET = "test-secret-that-is-at-least-32-characters";
const AGENCY = "7f3c2a9e-2d4b-4c1a-9a6e-1b2c3d4e5f60";

function setup({ fail, optedOut }: { fail?: string; optedOut?: boolean } = {}) {
  const rows: EmailLogRow[] = [];
  const client: EmailClient = {
    send: vi.fn(async () => {
      if (fail) throw new Error(fail);
      return { id: `re_${rows.length + 1}` };
    }),
  };
  const store: EmailStore = {
    hasSent: async (key) => rows.some((r) => r.idempotencyKey === key && r.status === "sent"),
    record: async (row) => void rows.push(row),
    wantsEmail: async () => !optedOut,
  };
  const deps: SendEmailDeps = {
    client,
    store,
    settings: { from: "Customers.Direct <hello@mail.example>", baseUrl: "https://app.example", unsubscribeSecret: SECRET },
  };
  return { rows, client, deps, send: vi.mocked(client.send) };
}

function input(overrides: Partial<SendEmailInput> = {}): SendEmailInput {
  return {
    type: "welcome",
    to: "owner@example.test",
    subject: "Welcome to Customers.Direct",
    agencyId: AGENCY,
    template: ({ baseUrl, unsubscribeUrl }) =>
      createElement(NoticeEmail, { preview: "Welcome", heading: "Welcome", paragraphs: ["Hello there."], baseUrl, unsubscribeUrl }),
    ...overrides,
  };
}

describe("sendEmail", () => {
  it("sends HTML plus a text version and logs the provider id", async () => {
    const { rows, deps, send } = setup();
    const result = await sendEmail(input(), deps);

    expect(result).toEqual({ status: "sent", providerId: "re_1" });
    const [email, options] = send.mock.calls[0];
    expect(email).toMatchObject({ from: "Customers.Direct <hello@mail.example>", to: "owner@example.test", subject: "Welcome to Customers.Direct" });
    expect(email.html).toContain("Hello there.");
    expect(email.text).toContain("Hello there.");
    expect(email.headers).toBeUndefined();
    expect(email.html).not.toContain("Unsubscribe");
    expect(options).toEqual({ idempotencyKey: undefined });
    expect(rows).toEqual([{ type: "welcome", agencyId: AGENCY, to: "owner@example.test", status: "sent", providerId: "re_1", idempotencyKey: undefined }]);
  });

  it("sends once per idempotency key and passes the key to the provider", async () => {
    const { rows, deps, send } = setup();
    const first = await sendEmail(input({ idempotencyKey: "trial_ending:sub_1" }), deps);
    const repeat = await sendEmail(input({ idempotencyKey: "trial_ending:sub_1" }), deps);

    expect(first.status).toBe("sent");
    expect(repeat).toEqual({ status: "skipped", reason: "duplicate" });
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: "trial_ending:sub_1" });
    expect(rows).toHaveLength(1);
  });

  it("logs a provider failure without throwing, and a retry can still send", async () => {
    const failing = setup({ fail: "Resend: domain not verified" });
    const result = await sendEmail(input({ idempotencyKey: "k1" }), failing.deps);
    expect(result).toEqual({ status: "failed", error: "Resend: domain not verified" });
    expect(failing.rows[0]).toMatchObject({ status: "failed", error: "Resend: domain not verified", idempotencyKey: "k1" });
    expect(await failing.deps.store.hasSent("k1")).toBe(false);
  });

  it("adds a signed unsubscribe link and one-click headers to the weekly report", async () => {
    const { deps, send } = setup();
    await sendEmail(input({ type: "weekly_report" }), deps);

    const [email] = send.mock.calls[0];
    const oneClick = email.headers?.["List-Unsubscribe"] ?? "";
    expect(oneClick).toMatch(/^<https:\/\/app\.example\/api\/email\/unsubscribe\?token=v1\..+>$/);
    expect(email.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

    const token = decodeURIComponent(oneClick.slice(oneClick.indexOf("token=") + 6, -1));
    expect(verifyUnsubscribeToken(token, SECRET)).toEqual({ agencyId: AGENCY, topic: "weekly_report" });
    expect(email.html).toContain(`https://app.example/email/unsubscribe?token=${encodeURIComponent(token)}`);
    expect(email.text).toContain("https://app.example/email/unsubscribe?token=");
  });

  it("skips the weekly report for an agency that turned it off", async () => {
    const { rows, deps, send } = setup({ optedOut: true });
    const result = await sendEmail(input({ type: "weekly_report" }), deps);
    expect(result).toEqual({ status: "skipped", reason: "unsubscribed" });
    expect(send).not.toHaveBeenCalled();
    expect(rows[0]).toMatchObject({ type: "weekly_report", status: "skipped" });
  });

  it("refuses to send the weekly report without an agency or a signing secret", async () => {
    const { deps, send } = setup();
    await expect(sendEmail(input({ type: "weekly_report", agencyId: null }), deps)).rejects.toThrow(/needs an agency/);
    const noSecret = { ...deps, settings: { ...deps.settings, unsubscribeSecret: null } };
    await expect(sendEmail(input({ type: "weekly_report" }), noSecret)).rejects.toThrow(/EMAIL_UNSUBSCRIBE_SECRET/);
    expect(send).not.toHaveBeenCalled();
  });
});
