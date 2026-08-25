import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

interface CompetitorInput {
  name?: unknown;
  domain?: unknown;
  source?: unknown;
}

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { business_id?: unknown; competitors?: CompetitorInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const businessId = typeof body.business_id === "string" ? body.business_id : "";
  if (!businessId) return NextResponse.json({ error: "business_id is required." }, { status: 400 });

  // Ownership check — RLS also enforces this, but we want a clean 404.
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .single();
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const rows = (Array.isArray(body.competitors) ? body.competitors : [])
    .map((c) => ({
      business_id: businessId,
      name: typeof c.name === "string" ? c.name.trim().slice(0, 200) : "",
      domain: typeof c.domain === "string" && c.domain.trim() ? c.domain.trim().slice(0, 300) : null,
      source: typeof c.source === "string" ? c.source.trim().slice(0, 100) : "manual",
      confirmed: true,
    }))
    .filter((c) => c.name);

  if (rows.length === 0) {
    return NextResponse.json({ competitors: [] });
  }

  const { data, error } = await supabase.from("business_competitors").insert(rows).select();

  if (error) {
    console.error("Save competitors failed:", error.message);
    return NextResponse.json({ error: "Could not save competitors." }, { status: 500 });
  }

  return NextResponse.json({ competitors: data });
}
