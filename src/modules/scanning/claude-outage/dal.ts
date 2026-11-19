import "server-only";
// The Claude outage scans read and write: the open "claude_unavailable" admin alert, shared with the background AI
// jobs (modules/ai): raise_system_alert keeps one open alert per kind and moves last_seen_at on every new failure, so
// the alert is both the admin's notice and the window scans read. A Claude check that works again closes it.
import { clearClaudeOutage, markClaudeOutage, readClaudeOutage } from "@/modules/ai/server";
import type { OutageStore } from "./outage";

export const liveOutageStore: OutageStore = {
  // One fresh read per scan: a few seconds old would still be fine, but a scan is rare enough to always ask.
  read: () => readClaudeOutage(true),
  mark: (reason, detail) => markClaudeOutage(reason, detail),
  clear: () => clearClaudeOutage(),
};
