// The only file other modules and pages may import from (eslint-plugin-boundaries).
import "server-only";
import { readCreditHistory } from "./dal";
import { buildHistory, historyPage } from "./service";

export { HISTORY_PAGE_SIZE, type HistoryEntry, type HistoryKind } from "./service";

/** One page of the agency's credit history, newest first. Callers pass the signed-in user's own agency. */
export async function getCreditHistory(agencyId: string, page: number) {
  const { ledger, holds } = await readCreditHistory(agencyId);
  return historyPage(buildHistory(ledger, holds), page);
}
