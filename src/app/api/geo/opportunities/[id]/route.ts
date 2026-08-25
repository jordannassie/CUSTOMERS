import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

const VALID_STATUSES = ["open", "in_progress", "resolved", "dismissed"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = typeof body.status === "string" ? body.status : "";
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  // Ownership enforced via the businesses join (RLS also protects this).
  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("id, business_id, businesses!inner(owner_user_id)")
    .eq("id", id)
    .single();

  if (!opportunity || (opportunity as unknown as { businesses: { owner_user_id: string } }).businesses.owner_user_id !== user!.id) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Update opportunity failed:", error.message);
    return NextResponse.json({ error: "Could not update opportunity." }, { status: 500 });
  }

  return NextResponse.json({ opportunity: data });
}
