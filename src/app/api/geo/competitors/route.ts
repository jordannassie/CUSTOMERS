import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

interface CompetitorInput {
  name?: unknown;
  domain?: unknown;
  source?: unknown;
  place_id?: unknown;
  formatted_address?: unknown;
  city?: unknown;
  region?: unknown;
  country?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  category?: unknown;
  phone?: unknown;
  enrichment_status?: unknown;
  confirmed?: unknown;
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

  function cleanStr(v: unknown, max = 300): string | null {
    if (typeof v !== "string" || !v.trim()) return null;
    return v.trim().slice(0, max);
  }
  function cleanNum(v: unknown): number | null {
    if (typeof v !== "number" || !isFinite(v)) return null;
    return v;
  }

  const rows = (Array.isArray(body.competitors) ? body.competitors : [])
    .map((c) => ({
      business_id: businessId,
      name: typeof c.name === "string" ? c.name.trim().slice(0, 200) : "",
      domain: cleanStr(c.domain),
      source: cleanStr(c.source) ?? "manual",
      confirmed: true,
      // Google Places enrichment fields
      place_id: cleanStr(c.place_id),
      formatted_address: cleanStr(c.formatted_address),
      city: cleanStr(c.city, 100),
      region: cleanStr(c.region, 100),
      country: cleanStr(c.country, 100),
      latitude: cleanNum(c.latitude),
      longitude: cleanNum(c.longitude),
      category: cleanStr(c.category, 150),
      phone: cleanStr(c.phone, 50),
      enrichment_status: cleanStr(c.enrichment_status, 50) ?? "none",
    }))
    .filter((c) => c.name);

  if (rows.length === 0) {
    return NextResponse.json({ competitors: [] });
  }

  // De-duplicate against existing competitors (case-insensitive name match)
  const { data: existing } = await supabase
    .from("business_competitors")
    .select("name")
    .eq("business_id", businessId);
  const existingNames = new Set((existing ?? []).map((e: { name: string }) => e.name.toLowerCase()));
  const newRows = rows.filter((r) => !existingNames.has(r.name.toLowerCase()));

  if (newRows.length === 0) {
    return NextResponse.json({ competitors: [] });
  }

  const { data, error } = await supabase
    .from("business_competitors")
    .insert(newRows)
    .select();

  if (error) {
    console.error("Save competitors failed:", error.message);
    return NextResponse.json({ error: "Could not save competitors." }, { status: 500 });
  }

  return NextResponse.json({ competitors: data });
}
