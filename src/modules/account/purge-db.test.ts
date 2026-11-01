import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";

// Runs against the local database `npm test` rebuilds. Emails go through the email module with its log
// transport (never sent) and land in email_log.
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  const overrides: Record<string, unknown> = { EMAIL_FROM: "Customers.Direct <hello@example.test>", NEXT_PUBLIC_APP_URL: "http://localhost:3077" };
  return { env: new Proxy(env, { get: (t, key) => (key in overrides ? overrides[key as string] : Reflect.get(t, key)) }) };
});

const { runPurgeFollowUp } = await import("./purge");

const service = createServiceClient();
const DAY = 86_400_000;
const agencyIds: string[] = [];

afterAll(async () => {
  if (agencyIds.length) await service.from("account_purges").delete().in("agency_id", agencyIds).throwOnError();
});

// A follow-up that kept failing for 7 days used to lose the row, so the logo files were never removed (migration 065).
describe("purge follow-up that failed for a week", () => {
  it("drops the address after 7 days but keeps the row until the logo files are gone", async () => {
    const agencyId = randomUUID();
    agencyIds.push(agencyId);
    await service
      .from("account_purges")
      .insert({ agency_id: agencyId, owner_email: `vitest-purge-${agencyId}@example.test`, agency_name: "Late Agency", purged_at: new Date(Date.now() - 8 * DAY).toISOString() })
      .throwOnError();
    const upload = await service.storage.from("business-logos").upload(`agencies/${agencyId}/logo`, new Uint8Array([137, 80, 78, 71]), {
      contentType: "image/png",
      upsert: true,
    });
    if (upload.error) throw upload.error;

    await service.rpc("purge_deleted_accounts").throwOnError();
    const { data: kept } = await service.from("account_purges").select("owner_email, agency_name").eq("agency_id", agencyId).throwOnError();
    expect(kept).toEqual([{ owner_email: null, agency_name: "" }]);

    await runPurgeFollowUp();
    const { data: left } = await service.from("account_purges").select("agency_id").eq("agency_id", agencyId).throwOnError();
    expect(left).toEqual([]);
    expect((await service.storage.from("business-logos").list(`agencies/${agencyId}`)).data).toEqual([]);
    const { data: emails } = await service.from("email_log").select("id").eq("idempotency_key", `account_purged:${agencyId}`).throwOnError();
    expect(emails).toEqual([]);
  });
});
