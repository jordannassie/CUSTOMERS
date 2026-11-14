import type { ActionResult } from "@/modules/auth";
import type { RecentScanNeeded } from "./recent-scan";
import type { ScanStatus } from "./service";

// Run scan's credit check before a scan starts (D-54). Pure, so the three outcomes are unit tested.
// A scan may start whenever the balance is above 0 and may overdraw by at most its own cost, so a scan that
// costs more than the balance still runs, but only after the user has been told and confirmed.

export type ScanCreditCheck =
  | { kind: "ok" }
  /** The scan costs more than the balance: it still runs, and `extra` comes out of the next grant. */
  | { kind: "warn"; cost: number; balance: number; extra: number }
  /** At 0 or below no new scan starts. */
  | { kind: "refuse" };

export function scanCreditCheck(balance: number, cost: number): ScanCreditCheck {
  if (balance <= 0) return { kind: "refuse" };
  if (cost <= balance) return { kind: "ok" };
  return { kind: "warn", cost, balance, extra: cost - balance };
}

const credits = (n: number) => `${n} ${n === 1 ? "credit" : "credits"}`;

/** What the user reads before confirming a scan that overdraws. */
export function overdraftWarning({ cost, balance, extra }: { cost: number; balance: number; extra: number }): string {
  const rest = extra === 1 ? "the 1 extra credit comes" : `the ${extra} extra credits come`;
  return `This scan uses ${credits(cost)} and you have ${balance}. It will still finish, and ${rest} out of your next renewal or top-up.`;
}

/** startScan's answer when the scan would overdraw and the user has not confirmed yet. Nothing was queued. */
export type OverdraftNeeded = {
  ok: false;
  status: 402;
  error: string;
  overdraft: { cost: number; balance: number };
};

export type StartScanResult = ActionResult<ScanStatus> | OverdraftNeeded | RecentScanNeeded;

export function overdraftNeeded(check: Extract<ScanCreditCheck, { kind: "warn" }>): OverdraftNeeded {
  return { ok: false, status: 402, error: overdraftWarning(check), overdraft: { cost: check.cost, balance: check.balance } };
}

/** True when startScan stopped to ask for confirmation instead of starting the scan. */
export function needsOverdraftConfirm(result: StartScanResult): result is OverdraftNeeded {
  return !result.ok && "overdraft" in result;
}

/** True when startScan stopped to ask whether to scan again so soon after the last scan. */
export function needsRecentScanConfirm(result: StartScanResult): result is RecentScanNeeded {
  return !result.ok && "recentScan" in result;
}
