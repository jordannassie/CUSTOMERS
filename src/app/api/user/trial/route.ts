/**
 * GET /api/user/trial
 *
 * Returns the current user's trial status. Clients (dashboard components)
 * call this to display trial indicators without duplicating the logic.
 * All state is server-authoritative.
 */
import "server-only";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { getTrialStatus } from "@/lib/trial";

export async function GET() {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const status = await getTrialStatus();

  return NextResponse.json({
    isInTrial: status.isInTrial,
    isExpired: status.isExpired,
    daysLeft: status.daysLeft,
    trialEndsAt: status.trialEndsAt?.toISOString() ?? null,
    isAdmin: status.isAdmin,
  });
}
