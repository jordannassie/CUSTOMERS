import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { business_id?: unknown; opportunity_id?: unknown; notes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const businessId = typeof body.business_id === "string" ? body.business_id : "";
  if (!businessId) return NextResponse.json({ error: "business_id is required." }, { status: 400 });

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .single();
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const opportunityId = typeof body.opportunity_id === "string" ? body.opportunity_id : null;
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : null;

  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      business_id: businessId,
      opportunity_id: opportunityId,
      requested_by: user!.id,
      notes,
      status: "requested",
    })
    .select()
    .single();

  if (error) {
    console.error("Create service request failed:", error.message);
    return NextResponse.json({ error: "Could not submit request." }, { status: 500 });
  }

  if (opportunityId) {
    await supabase.from("opportunities").update({ status: "in_progress" }).eq("id", opportunityId);
  }

  return NextResponse.json({ serviceRequest: data });
}
