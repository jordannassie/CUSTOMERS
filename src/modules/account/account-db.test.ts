import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// Runs against the local database `npm test` rebuilds, signed in as real test users. Stripe is always a fake;
// emails go through the email module with its log transport (never sent) and land in email_log.
const session = vi.hoisted(() => ({ client: null as SupabaseClient<Database> | null, adminEmails: "" }));
const stripe = vi.hoisted(() => ({ cancelNow: vi.fn<(id: string, key: string) => Promise<void>>(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3077" }) }));
vi.mock("./stripe", () => ({ accountStripeClient: () => ({ mode: "stripe", cancelNow: stripe.cancelNow }) }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  const overrides: Record<string, unknown> = {
    EMAIL_FROM: "Customers.Direct <hello@example.test>",
    NEXT_PUBLIC_APP_URL: "http://localhost:3077",
  };
  return {
    env: new Proxy(env, {
      get: (t, key) => (key === "ADMIN_EMAILS" ? session.adminEmails : key in overrides ? overrides[key as string] : Reflect.get(t, key)),
    }),
  };
});

const actions = await import("./actions");
const { runPurgeFollowUp } = await import("./purge");
const { requireAgency } = await import("@/modules/auth");
const { restoreAgency } = await import("@/modules/admin");
const { grantCredits, holdCredits } = await import("@/modules/credits");
const { env } = await import("@/lib/env");

const service = createServiceClient();
const DAY = 86_400_000;
const userIds: string[] = [];

type Owner = { id: string; email: string; password: string };

async function createUser(prefix: string): Promise<Owner> {
  const email = `vitest-${prefix}-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function signIn(user: Owner, { admin = false } = {}) {
  const client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw error;
  session.client = client;
  session.adminEmails = admin ? user.email : "";
  return client;
}

const one = <T>(r: { data: T; error: { message: string } | null }): NonNullable<T> => {
  if (r.error) throw new Error(r.error.message);
  return r.data as NonNullable<T>;
};

/** An is_test agency with one business that has questions, a result, a share link, credits and a queued scan. */
async function createAccount(name: string) {
  const owner = await createUser("account");
  const agency = one(await service.from("agencies").insert({ owner_user_id: owner.id, name, is_test: true, status: "active", stripe_subscription_id: `sub_${randomUUID()}` }).select("id").single());
  const business = one(
    await service
      .from("businesses")
      .insert({ owner_user_id: owner.id, agency_id: agency.id, name: `${name} Coffee`, domain: "coffee.example", primary_city: "Testville", primary_region: "CA", status: "active" })
      .select("id")
      .single(),
  );
  one(await service.from("tracked_prompts").insert({ business_id: business.id, prompt: "best coffee near me" }).select("id"));
  const run = one(await service.from("visibility_runs").insert({ business_id: business.id, provider: "openai" }).select("id").single());
  one(await service.from("visibility_results").insert({ business_id: business.id, provider: "openai", run_id: run.id }).select("id"));
  one(await service.from("report_shares").insert({ business_id: business.id, token: randomBytes(24).toString("hex") }).select("id"));
  await grantCredits({ agencyId: agency.id, source: "plan", sourceId: randomUUID(), amount: 100, expiresAt: new Date(Date.now() + 30 * DAY) });
  const job = one(await service.from("scan_jobs").insert({ agency_id: agency.id, business_id: business.id }).select("id").single());
  const holdId = await holdCredits(agency.id, 10, job.id);
  one(await service.from("scan_jobs").update({ hold_id: holdId }).eq("id", job.id).select("id"));
  return { owner, agencyId: agency.id, businessId: business.id, jobId: job.id, holdId };
}

async function emailsOf(key: string) {
  return one(await service.from("email_log").select("type, status, to_email, agency_id").eq("idempotency_key", key));
}

beforeEach(() => stripe.cancelNow.mockClear());

afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("delete account (B-77, MVP_SPEC 23)", () => {
  it("refuses a name that doesn't match and changes nothing", async () => {
    const a = await createAccount("Refused Agency");
    await signIn(a.owner);
    const result = await actions.deleteAccount({ confirmName: "Refused" });
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(stripe.cancelNow).not.toHaveBeenCalled();
    expect(one(await service.from("agencies").select("status").eq("id", a.agencyId).single()).status).toBe("active");
  });

  it("cancels Stripe, soft deletes, stops scans, revokes share links, emails, and blocks login", async () => {
    const a = await createAccount("Gone Agency");
    await signIn(a.owner);
    const before = Date.now();
    const result = await actions.deleteAccount({ confirmName: " Gone Agency " });
    expect(result).toEqual({ ok: true, data: { redirectTo: "/account-deleted" } });

    const agency = one(await service.from("agencies").select("status, deleted_at, purge_after, stripe_subscription_id").eq("id", a.agencyId).single());
    expect(stripe.cancelNow).toHaveBeenCalledWith(agency.stripe_subscription_id, `account-delete:${a.agencyId}`);
    expect(agency.status).toBe("deleted");
    const waitMs = new Date(agency.purge_after!).getTime() - new Date(agency.deleted_at!).getTime();
    expect(Math.round(waitMs / DAY)).toBe(30);
    expect(new Date(agency.deleted_at!).getTime()).toBeGreaterThanOrEqual(before - 5_000);

    expect(one(await service.from("report_shares").select("revoked_at").eq("business_id", a.businessId))[0].revoked_at).not.toBeNull();
    expect(one(await service.from("scan_jobs").select("id").eq("id", a.jobId))).toHaveLength(0);
    expect(one(await service.from("credit_holds").select("status").eq("id", a.holdId).single()).status).toBe("closed");
    expect(await emailsOf(`account_deleted:${a.agencyId}`)).toMatchObject([{ type: "account_deleted", status: "sent", to_email: a.owner.email }]);

    // Deleting signed the user out; logging in again is blocked.
    await expect(requireAgency()).rejects.toMatchObject({ reason: "not_signed_in" });
    await signIn(a.owner);
    await expect(requireAgency()).rejects.toMatchObject({ reason: "agency_deleted", status: 403 });
    await expect(requireAgency({ next: "/dashboard" })).rejects.toMatchObject({ digest: expect.stringContaining("/account-deleted") });
    expect(await actions.deleteAccount({ confirmName: "Gone Agency" })).toMatchObject({ ok: false, status: 403 });
  });

  it("can be restored by an admin within the waiting period", async () => {
    const a = await createAccount("Restored Agency");
    await signIn(a.owner);
    expect((await actions.deleteAccount({ confirmName: "Restored Agency" })).ok).toBe(true);

    await signIn(await createUser("admin"), { admin: true });
    expect((await restoreAgency({ agencyId: a.agencyId, reason: "Deleted by mistake" })).ok).toBe(true);
    const agency = one(await service.from("agencies").select("status, deleted_at, purge_after").eq("id", a.agencyId).single());
    expect(agency).toEqual({ status: "canceled", deleted_at: null, purge_after: null });
    const restored = one(await service.from("email_log").select("type, status").eq("agency_id", a.agencyId).eq("type", "account_restored"));
    expect(restored).toMatchObject([{ status: "sent" }]);

    await signIn(a.owner);
    expect((await requireAgency()).agency.id).toBe(a.agencyId);
  });

  it("purges after the period: data and the auth user go, the ledger is anonymised, not deleted", async () => {
    const a = await createAccount("Purged Agency");
    await service.storage.from("business-logos").upload(`agencies/${a.agencyId}/logo`, new Uint8Array([137, 80, 78, 71]), {
      contentType: "image/png",
      upsert: true,
    });
    await signIn(a.owner);
    expect((await actions.deleteAccount({ confirmName: "Purged Agency" })).ok).toBe(true);
    const ledger = one(await service.from("credit_transactions").select("id").eq("agency_id", a.agencyId));
    expect(ledger.length).toBeGreaterThan(0);

    // Still inside the period: the job leaves it alone.
    one(await service.rpc("purge_deleted_accounts"));
    expect(one(await service.from("agencies").select("id").eq("id", a.agencyId))).toHaveLength(1);

    one(await service.from("agencies").update({ purge_after: new Date(Date.now() - 1000).toISOString() }).eq("id", a.agencyId).select("id"));
    const [counts] = one(await service.rpc("purge_deleted_accounts"));
    expect(counts.accounts).toBeGreaterThanOrEqual(1);

    expect(one(await service.from("agencies").select("id").eq("id", a.agencyId))).toHaveLength(0);
    expect(one(await service.from("businesses").select("id").eq("id", a.businessId))).toHaveLength(0);
    expect(one(await service.from("tracked_prompts").select("id").eq("business_id", a.businessId))).toHaveLength(0);
    expect(one(await service.from("visibility_results").select("id").eq("business_id", a.businessId))).toHaveLength(0);
    expect((await service.auth.admin.getUserById(a.owner.id)).data.user).toBeNull();

    const kept = one(await service.from("credit_transactions").select("id, agency_id").in("id", ledger.map((l) => l.id)));
    expect(kept).toHaveLength(ledger.length);
    expect(kept.every((l) => l.agency_id === null)).toBe(true);
    expect(one(await service.from("email_log").select("to_email").eq("idempotency_key", `account_deleted:${a.agencyId}`))).toEqual([
      { to_email: "deleted" },
    ]);

    // The app follow-up removes the logo files, sends the last email and forgets the address.
    await runPurgeFollowUp();
    expect(one(await service.from("account_purges").select("agency_id").eq("agency_id", a.agencyId))).toHaveLength(0);
    expect((await service.storage.from("business-logos").list(`agencies/${a.agencyId}`)).data).toEqual([]);
    expect(await emailsOf(`account_purged:${a.agencyId}`)).toMatchObject([{ type: "account_purged", status: "sent", to_email: a.owner.email, agency_id: null }]);
  });
});

describe("delete a business (B-77)", () => {
  it("hides it, stops scans, revokes share links and emails; the purge waits for its plan to end", async () => {
    const a = await createAccount("Two Shops");
    one(await service.from("agencies").update({ stripe_subscription_id: null }).eq("id", a.agencyId).select("id"));
    const client = await signIn(a.owner);

    expect(await actions.deleteBusiness({ businessId: a.businessId, confirmName: "Two Shops" })).toMatchObject({ ok: false, status: 400 });
    const result = await actions.deleteBusiness({ businessId: a.businessId, confirmName: "Two Shops Coffee" });
    expect(result).toMatchObject({ ok: true, data: { planEndsAt: null } });

    expect(one(await client.from("businesses").select("id").eq("id", a.businessId))).toHaveLength(0);
    expect(one(await client.from("tracked_prompts").select("id").eq("business_id", a.businessId))).toHaveLength(0);
    expect(one(await service.from("report_shares").select("revoked_at").eq("business_id", a.businessId))[0].revoked_at).not.toBeNull();
    expect(one(await service.from("scan_jobs").select("id").eq("id", a.jobId))).toHaveLength(0);
    expect(await emailsOf(`business_deleted:${a.businessId}`)).toMatchObject([{ status: "sent", to_email: a.owner.email }]);
    expect((await requireAgency()).agency.status).toBe("active");
    expect(await actions.deleteBusiness({ businessId: a.businessId, confirmName: "Two Shops Coffee" })).toMatchObject({ ok: false, status: 404 });

    // Past the period but still on a plan until period end: kept, so Stripe's period-end event finds it.
    one(await service.from("businesses").update({ purge_after: new Date(Date.now() - 1000).toISOString() }).eq("id", a.businessId).select("id"));
    one(await service.from("business_subscriptions").insert({ agency_id: a.agencyId, business_id: a.businessId, plan_id: "starter", status: "active" }).select("business_id"));
    one(await service.rpc("purge_deleted_accounts"));
    expect(one(await service.from("businesses").select("id").eq("id", a.businessId))).toHaveLength(1);

    one(await service.from("business_subscriptions").update({ status: "canceled" }).eq("business_id", a.businessId).select("business_id"));
    one(await service.rpc("purge_deleted_accounts"));
    expect(one(await service.from("businesses").select("id").eq("id", a.businessId))).toHaveLength(0);
    expect(one(await service.from("agencies").select("status").eq("id", a.agencyId).single()).status).toBe("active");
  });
});

describe("change email and password (ACC-03)", () => {
  it("needs the current password, then changes it", async () => {
    const owner = await createUser("password");
    await signIn(owner);
    expect(await actions.changePassword({ password: "a new password", currentPassword: "wrong" })).toMatchObject({ ok: false, status: 400 });
    expect(await actions.changePassword({ password: "a new password", currentPassword: owner.password })).toEqual({ ok: true, data: { step: "done" } });
    await expect(signIn({ ...owner, password: "a new password" })).resolves.toBeTruthy();
  });

  it("asks Supabase to confirm a new email and keeps the old one until then", async () => {
    const owner = await createUser("email");
    await signIn(owner);
    const next = `vitest-new-${randomUUID()}@example.test`;
    expect(await actions.changeEmail({ email: next, currentPassword: "wrong" })).toMatchObject({ ok: false, status: 400 });
    expect(await actions.changeEmail({ email: next.toUpperCase(), currentPassword: owner.password })).toEqual({ ok: true, data: { pendingEmail: next } });
    const { data } = await service.auth.admin.getUserById(owner.id);
    expect(data.user).toMatchObject({ email: owner.email, new_email: next });
  });
});
