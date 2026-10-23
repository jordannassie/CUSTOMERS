import "server-only";
// The Claude outage is the open "claude_unavailable" admin alert (system_alerts, migration 037): raise_system_alert
// keeps one open alert per kind and moves last_seen_at on every new failure, so the alert is both the admin's notice
// and the window scans read. A Claude check that works again closes it.
import { createServiceClient } from "@/lib/supabase/service";
import { outageMessage, type ClaudeOutage, type OutageReason, type OutageStore } from "./outage";

export const ALERT_CLAUDE_UNAVAILABLE = "claude_unavailable";

export const liveOutageStore: OutageStore = {
  async read(): Promise<ClaudeOutage | null> {
    const { data, error } = await createServiceClient()
      .from("system_alerts")
      .select("created_at, last_seen_at, details")
      .eq("kind", ALERT_CLAUDE_UNAVAILABLE)
      .is("resolved_at", null)
      .maybeSingle();
    // Not knowing is not an outage: the scan asks Claude as usual.
    if (error) {
      console.error(`Could not read the Claude outage: ${error.message}`);
      return null;
    }
    if (!data) return null;
    const reason = (data.details as { reason?: unknown } | null)?.reason;
    return {
      since: new Date(data.created_at),
      lastSeenAt: new Date(data.last_seen_at),
      reason: reason === "auth" || reason === "credit" ? reason : null,
    };
  },

  async mark(reason: OutageReason, detail: string): Promise<void> {
    const { error } = await createServiceClient().rpc("raise_system_alert", {
      p_kind: ALERT_CLAUDE_UNAVAILABLE,
      p_severity: "warning",
      p_message: outageMessage(reason),
      p_details: { reason, error: detail.slice(0, 300) },
    });
    if (error) console.error(`Could not mark Claude unavailable: ${error.message}`);
  },

  async clear(): Promise<void> {
    const { error } = await createServiceClient()
      .from("system_alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("kind", ALERT_CLAUDE_UNAVAILABLE)
      .is("resolved_at", null);
    if (error) console.error(`Could not close the Claude outage: ${error.message}`);
  },
};
