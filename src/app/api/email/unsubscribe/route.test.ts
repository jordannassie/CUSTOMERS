import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";

const SECRET = await vi.hoisted(async () => (await import("@/modules/email/email.test-helpers")).testSecret());
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, k) => (k === "EMAIL_UNSUBSCRIBE_SECRET" ? SECRET : Reflect.get(t, k)) }) };
});

const { POST } = await import("./route");
const { signUnsubscribeToken } = await import("@/modules/email/service");
const { testSecret } = await import("@/modules/email/email.test-helpers");

// B-61: the public unsubscribe route, against the local database `npm test` rebuilds.
const service = createServiceClient();
let agencyId = "";
let ownerId = "";

beforeAll(async () => {
  const { data, error } = await service.auth.admin.createUser({ email: `vitest-unsub-${randomUUID()}@example.test`, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  ownerId = data.user.id;
  const agency = await service.from("agencies").insert({ owner_user_id: ownerId, name: "Unsub Test", is_test: true }).select("id").single();
  if (agency.error) throw agency.error;
  agencyId = agency.data.id;
});

afterAll(async () => {
  if (ownerId) await service.auth.admin.deleteUser(ownerId);
});

async function weeklyOn() {
  const { data } = await service.from("agencies").select("weekly_report_emails").eq("id", agencyId).single();
  return data?.weekly_report_emails;
}

function form(fields: Record<string, string>) {
  return new URLSearchParams(fields).toString();
}

const formHeaders = { "content-type": "application/x-www-form-urlencoded" };

describe("POST /api/email/unsubscribe", () => {
  it("the confirm button turns the weekly report off and goes back to the page", async () => {
    await service.from("agencies").update({ weekly_report_emails: true }).eq("id", agencyId);
    const token = signUnsubscribeToken(agencyId, "weekly_report", SECRET);
    const res = await POST(new Request("http://app.test/api/email/unsubscribe", { method: "POST", headers: formHeaders, body: form({ token }) }));

    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/email/unsubscribe");
    expect(location.searchParams.get("done")).toBe("1");
    expect(location.searchParams.get("token")).toBe(token);
    expect(await weeklyOn()).toBe(false);
  });

  it("mail apps' one-click POST works with the token in the URL", async () => {
    await service.from("agencies").update({ weekly_report_emails: true }).eq("id", agencyId);
    const token = signUnsubscribeToken(agencyId, "weekly_report", SECRET);
    const res = await POST(
      new Request(`http://app.test/api/email/unsubscribe?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: formHeaders,
        body: form({ "List-Unsubscribe": "One-Click" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await weeklyOn()).toBe(false);
  });

  it.each([
    ["a forged token", () => signUnsubscribeToken(agencyId, "weekly_report", testSecret())],
    ["garbage", () => "<script>"],
    ["no token", () => ""],
  ])("rejects %s and changes nothing", async (_, makeToken) => {
    await service.from("agencies").update({ weekly_report_emails: true }).eq("id", agencyId);
    const res = await POST(new Request("http://app.test/api/email/unsubscribe", { method: "POST", headers: formHeaders, body: form({ token: makeToken() }) }));
    expect(res.status).toBe(400);
    expect(await weeklyOn()).toBe(true);
  });
});
