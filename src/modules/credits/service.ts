import "server-only";
import { readBalance, readPeriodGrants, type CreditBalance } from "./dal";

export { estimateMonthlyCredits, type ScanFrequency } from "./estimate";

/** Balance for the usage widget and page. Callers check the user may see this agency first. */
export function getBalance(agencyId: string): Promise<CreditBalance> {
  return readBalance(agencyId);
}

export type CreditUsage = {
  balance: number;
  topupRemaining: number;
  /** Plan and trial credits granted for the current period. */
  periodCredits: number;
  periodUsed: number;
};

/** Numbers for the usage widget. Callers check the user may see this agency first. */
export async function getUsage(agencyId: string): Promise<CreditUsage> {
  const [balance, period] = await Promise.all([readBalance(agencyId), readPeriodGrants(agencyId)]);
  return {
    balance: balance.balance ?? 0,
    topupRemaining: balance.topup_remaining ?? 0,
    periodCredits: period.amount,
    periodUsed: period.amount - period.remaining,
  };
}
