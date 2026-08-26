import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

/** PostgreSQL undefined_column error code */
const PG_UNDEFINED_COLUMN = "42703";

type CompetitorWithBusiness = { id: string; businesses: { owner_user_id: string } };

async function verifyOwnership(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], id: string, userId: string) {
  const { data } = await supabase
    .from("business_competitors")
    .select("id, businesses!inner(owner_user_id)")
    .eq("id", id)
    .single();
  if (!data) return null;
  const typed = data as unknown as CompetitorWithBusiness;
  if (typed.businesses.owner_user_id !== userId) return null;
  return typed;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const record = await verifyOwnership(supabase, id, user!.id);
  if (!record) return NextResponse.json({ error: "Competitor not found." }, { status: 404 });

  const { error } = await supabase.from("business_competitors").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete competitor." }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const record = await verifyOwnership(supabase, id, user!.id);
  if (!record) return NextResponse.json({ error: "Competitor not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Only allow updating specific fields — never trust arbitrary client data
  const updates: Record<string, unknown> = {};

  if (typeof body.domain === "string") {
    const raw = body.domain.trim().toLowerCase();
    // Normalize: strip protocol and www
    const normalized = raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");
    updates.domain = normalized || null;
    updates.enrichment_status = normalized ? "partial" : "none";
  }

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim().slice(0, 200);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("business_competitors")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (!error) return NextResponse.json({ competitor: data });

  // If enrichment_status column doesn't exist yet (migration 010 not applied),
  // retry without it so domain saves still work.
  if (error.code === PG_UNDEFINED_COLUMN) {
    console.warn("[competitors/patch] Enrichment columns missing — retrying without enrichment_status");
    const { enrichment_status: _dropped, ...basicUpdates } = updates;
    void _dropped;
    if (Object.keys(basicUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("business_competitors")
      .update(basicUpdates)
      .eq("id", id)
      .select()
      .single();
    if (fallbackError) return NextResponse.json({ error: "Could not update competitor." }, { status: 500 });
    return NextResponse.json({ competitor: fallbackData });
  }

  console.error("[competitors/patch] Update failed:", error.message);
  return NextResponse.json({ error: "Could not update competitor." }, { status: 500 });
}
