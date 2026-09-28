import "server-only";
import { loadPlanChangeData } from "../plan-change/dal";
import { billingAccess } from "./access";
import { loadBillingRows } from "./dal";
import { billingView } from "./service";
import type { BillingView } from "./summary";

/** Everything the billing page shows for one agency. Pass the agency from requireAgency(). */
export async function loadBillingPage(agencyId: string): Promise<BillingView> {
  const [rows, data] = await Promise.all([loadBillingRows(agencyId), loadPlanChangeData(agencyId)]);
  return billingView({ rows, access: rows.agency.subscriptionId ? await billingAccess(data) : null });
}
