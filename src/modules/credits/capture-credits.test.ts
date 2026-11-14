import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";
import { captureCredit, captureCredits, grantCredits, holdCredits, releaseHold } from "./dal";
import { balanceOf, createAgency, DAY, deleteTestUsers, ledgerSum, newScanJob, service, topup, userIds } from "./credits.test-helpers";

// E2E-0929 BUG-3: capture_credits (migration 041) against the local database, including many parallel calls for
// one agency like 10 scans charging at once.
afterAll(deleteTestUsers);

const chunks = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

// 50 calls in flight: 10 scans at 5 checks each, the most the worker ran before batching. More than that fails
// in the local HTTP client before reaching the database.
async function inParallel<T>(calls: (() => Promise<T>)[], limit = 50): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  let next = 0;
  const worker = async () => {
    while (next < calls.length) {
      const i = next++;
      results[i] = await calls[i]().then(
        (value) => ({ status: "fulfilled" as const, value }),
        (reason) => ({ status: "rejected" as const, reason }),
      );
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

describe("capture_credits (E2E-0929)", () => {
  it("charges 10 scans captured in parallel for one agency exactly, with no errors", async () => {
    const agency = await createAgency(10);
    await grantCredits({ agencyId: agency.agencyId, source: "plan", sourceId: `inv-${randomUUID()}`, amount: 200, expiresAt: new Date(Date.now() + 30 * DAY) });
    await topup(agency, 500);
    const scans = await Promise.all(
      agency.businessIds.map(async (_, i) => {
        const job = await newScanJob(agency, i);
        return { job, hold: await holdCredits(agency.agencyId, 36, job), checks: Array.from({ length: 36 }, () => randomUUID()) };
      }),
    );

    // Every check is sent 3 times, in batches of 1, 6 and 4, interleaved across scans: repeats must not charge again.
    const perScan = scans.map(({ hold, checks }) =>
      [1, 6, 4].flatMap((size) => chunks(checks, size).map((ids) => () => captureCredits(hold, ids))),
    );
    const longest = Math.max(...perScan.map((l) => l.length));
    const ordered = Array.from({ length: longest }, (_, i) => perScan.map((l) => l[i])).flat().filter(Boolean);
    const results = await inParallel(ordered);

    expect(results.filter((r) => r.status === "rejected")).toEqual([]);
    const charged = results.reduce((sum, r) => sum + (r.status === "fulfilled" ? r.value : 0), 0);
    expect(charged).toBe(360);
    expect(await balanceOf(agency)).toBe(340);
    expect(await ledgerSum(agency)).toBe(700 - 360);
    const grants = await service.from("credit_grants").select("source, remaining").eq("agency_id", agency.agencyId);
    // The plan grant expires first, so it is spent first.
    expect(Object.fromEntries(grants.data!.map((g) => [g.source, g.remaining]))).toEqual({ plan: 0, topup: 340 });
    const holds = await service.from("credit_holds").select("captured").eq("agency_id", agency.agencyId);
    expect(holds.data!.map((h) => h.captured)).toEqual(Array(10).fill(36));
    const jobs = await service.from("scan_jobs").select("credits_charged").in("id", scans.map((s) => s.job));
    expect(jobs.data!.map((j) => j.credits_charged)).toEqual(Array(10).fill(36));
  });

  it("follows capture_credit: replays charge nothing, overdraft past zero, closed and used-up holds refuse", async () => {
    const agency = await createAgency();
    await topup(agency, 2);
    const hold = await holdCredits(agency.agencyId, 5, await newScanJob(agency));
    const [a, b, c] = [randomUUID(), randomUUID(), randomUUID()];

    expect(await captureCredit(hold, a)).toBe(true);
    expect(await captureCredits(hold, [a, b, b, c])).toBe(2);
    expect(await captureCredits(hold, [a, b, c])).toBe(0);
    expect(await captureCredits(hold, [])).toBe(0);
    // 3 charged against 2 credits: the third is overdraft (D-54).
    const { data: row } = await service.from("agencies").select("credit_overdraft").eq("id", agency.agencyId).single();
    expect(row!.credit_overdraft).toBe(1);
    expect(await ledgerSum(agency)).toBe(-1);

    await expect(captureCredits(hold, [randomUUID(), randomUUID(), randomUUID()])).rejects.toThrow("hold_used_up");
    expect(await releaseHold(hold)).toBe(2);
    await expect(captureCredits(hold, [randomUUID()])).rejects.toThrow("hold_closed");
    expect(await captureCredits(hold, [a])).toBe(0);
  });

  it("cannot be called by visitors or signed-in users", async () => {
    const agency = await createAgency();
    await topup(agency, 10);
    const hold = await holdCredits(agency.agencyId, 5, await newScanJob(agency));
    const client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const args = { p_hold_id: hold, p_check_ids: [randomUUID()] };
    expect((await client.rpc("capture_credits", args)).error?.code).toBe("42501");

    await service.auth.admin.updateUserById(userIds.at(-1)!, { password: "pw-owner-1234" });
    await client.auth.signInWithPassword({ email: agency.email, password: "pw-owner-1234" });
    expect((await client.rpc("capture_credits", args)).error?.code).toBe("42501");
    expect(await balanceOf(agency)).toBe(5);
  });
});
