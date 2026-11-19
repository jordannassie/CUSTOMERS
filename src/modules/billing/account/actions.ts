"use server";

import { redirect } from "next/navigation";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { BILLING_HREF } from "@/modules/workspace";
import { appOrigin } from "../origin";
import { portalClient } from "./access";
import { agencyCustomerId } from "./dal";
import { portalUrl } from "./service";

/** "Manage card and invoices": opens Stripe's customer portal for the agency's own customer. */
export async function openBillingPortal(): Promise<ActionResult<never>> {
  let agencyId: string;
  try {
    agencyId = (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
  const result = await portalUrl({
    client: portalClient(),
    customerId: await agencyCustomerId(agencyId),
    returnUrl: `${await appOrigin()}${BILLING_HREF}`,
  });
  if (!result.ok) return result;
  redirect(result.data.url);
}
