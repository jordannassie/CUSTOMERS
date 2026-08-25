import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

/**
 * Sets which of the signed-in user's businesses the dashboard should show
 * (the SellBop-style business switcher). Ownership is double-checked here
 * (not just left to RLS) so a bad businessId gets a clean 404 instead of a
 * silently-ignored update, and profiles' own owner-scoped RLS
 * (`auth.uid() = id`) still guards the write itself as a second layer.
 */
export async function PATCH(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const businessId = typeof body.businessId === "string" ? body.businessId : null;
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_business_id: businessId })
    .eq("id", user!.id);

  if (error) {
    console.error("Set active business failed:", error.message);
    return NextResponse.json({ error: "Could not switch business." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
