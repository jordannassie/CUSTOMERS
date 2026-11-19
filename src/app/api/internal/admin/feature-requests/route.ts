import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/modules/auth";
import { countNewFeatureRequests } from "@/modules/feedback";

/** GET /api/internal/admin/feature-requests: how many are New, for the admin menu's badge (owner, 2026-11-17). */
export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    return authErrorResponse(error);
  }
  const count = await countNewFeatureRequests();
  if (count === null) return NextResponse.json({ error: "Failed to count feature requests." }, { status: 500 });
  return NextResponse.json({ count });
}
