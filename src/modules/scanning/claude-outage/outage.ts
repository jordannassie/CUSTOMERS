// Claude out of service for scans. A rejected API key or an empty Anthropic account fails every Claude check the same
// way, so after one such failure scans leave Claude out for a while instead of sending, holding and logging a check
// per question that cannot work. Rate limits, timeouts and server errors pass on their own and never count. Pure.
import { CLAUDE_OUTAGE_MINUTES as AI_CLAUDE_OUTAGE_MINUTES, claudeOutageMessage } from "@/modules/ai";
import { ProviderError } from "../providers/request";

/** How long scans leave Claude out after its last auth or credit failure; the next scan then tries it once. */
export const CLAUDE_OUTAGE_MINUTES = AI_CLAUDE_OUTAGE_MINUTES;

export type OutageReason = "auth" | "credit";

/** The open outage: when it started, and when a Claude check last failed for that reason. */
export type ClaudeOutage = { since: Date; lastSeenAt: Date; reason: OutageReason | null };

/** use: ask Claude as usual. skip: leave it out of the scan. probe: the window is over, try one Claude check first. */
export type ClaudeMode = "use" | "skip" | "probe";

/** Where the outage is kept between scans (an open admin alert); tests pass one in memory. */
export type OutageStore = {
  read(): Promise<ClaudeOutage | null>;
  mark(reason: OutageReason, detail: string): Promise<void>;
  clear(): Promise<void>;
};

// Anthropic answers 400 "Your credit balance is too low ... Plans & Billing" for an empty account.
const CREDIT = /credit balance|plans\s*&\s*billing|billing/i;

/** "auth" for a rejected or unpermitted key (401, 403), "credit" for an empty account, null for anything else. */
export function outageReason(err: unknown): OutageReason | null {
  if (!(err instanceof ProviderError) || err.provider !== "anthropic" || err.kind !== "client") return null;
  if (err.status === 401 || err.status === 403) return "auth";
  if ((err.status === 400 || err.status === 402) && CREDIT.test(err.message)) return "credit";
  return null;
}

export function claudeMode(outage: ClaudeOutage | null, now: Date): ClaudeMode {
  if (!outage) return "use";
  return now.getTime() - outage.lastSeenAt.getTime() < CLAUDE_OUTAGE_MINUTES * 60_000 ? "skip" : "probe";
}

/** The admin alert text: what is wrong, what scans do meanwhile, and what fixes it. Shared with background jobs. */
export const outageMessage = (reason: OutageReason): string => claudeOutageMessage(reason);

/** Why a scan left Claude out, as the job and run record it. */
export const CLAUDE_SKIPPED = "Claude unavailable, skipped";
