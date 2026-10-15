import { describe, expect, it } from "vitest";
import { service } from "../admin.test-helpers";

const QUIET_KINDS = ["stuck_jobs", "failed_scans", "ai_fallback", "provider_errors", "negative_balances", "paid_not_active"];
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

async function resolveOpen(kind: string) {
  await service.from("system_alerts").update({ resolved_at: new Date().toISOString() }).eq("kind", kind).is("resolved_at", null).throwOnError();
}

async function openOf(kind: string) {
  const { data } = await service.from("system_alerts").select("id").eq("kind", kind).is("resolved_at", null).throwOnError();
  return data;
}

// 2026-10-15: alerts stayed open for days after their check was clean (stuck_jobs, failed_scans, ai_fallback,
// provider_errors, negative_balances). resolve_quiet_system_alerts (migration 063) closes one not seen for an hour.
// Migration 065 adds paid_not_active, which the app's 15 minute check raises while it is still true.
describe("alerts close once their check has been clean for an hour", () => {
  async function openSeen(kind: string, minutesAgo: number) {
    await resolveOpen(kind);
    await service.rpc("raise_system_alert", { p_kind: kind, p_severity: "warning", p_message: `${kind} test`, p_details: {} }).throwOnError();
    await service.from("system_alerts").update({ last_seen_at: ago(minutesAgo) }).eq("kind", kind).is("resolved_at", null).throwOnError();
  }

  it("closes each listed kind not seen for an hour", async () => {
    for (const kind of QUIET_KINDS) await openSeen(kind, 61);
    await service.rpc("resolve_quiet_system_alerts", {}).throwOnError();
    for (const kind of QUIET_KINDS) {
      expect(await openOf(kind), kind).toEqual([]);
    }
  });

  it("keeps one seen in the last hour, and kinds that wait for an admin", async () => {
    await openSeen("stuck_jobs", 30);
    await openSeen("paid_not_active", 30);
    await openSeen("webhook_failures", 180);
    await service.rpc("resolve_quiet_system_alerts", {}).throwOnError();
    expect(await openOf("stuck_jobs")).toHaveLength(1);
    expect(await openOf("paid_not_active")).toHaveLength(1);
    expect(await openOf("webhook_failures")).toHaveLength(1);
    await resolveOpen("stuck_jobs");
    await resolveOpen("paid_not_active");
    await resolveOpen("webhook_failures");
  });
});
