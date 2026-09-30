import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

interface CompetitorInput {
  name?: unknown;
  domain?: unknown;
  source?: unknown;
  place_id?: unknown;
  confirmed?: unknown;
}

/** PostgreSQL undefined_column error code */
const PG_UNDEFINED_COLUMN = "42703";

function cleanStr(v: unknown, max = 300): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return v.trim().slice(0, max);
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

  // Ownership check: RLS also enforces this, but we want a clean 404.
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
      domain: cleanStr(c.domain),
      source: cleanStr(c.source) ?? "manual",
      confirmed: true,
      // Google's terms allow storing only the place id (D-73, MVP_SPEC 26); column from migration 010.
      place_id: cleanStr(c.place_id),
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
  const existingNames = new Set(
    (existing ?? []).map((e: { name: string }) => e.name.toLowerCase()),
  );
  const newRows = rows.filter((r) => !existingNames.has(r.name.toLowerCase()));

  if (newRows.length === 0) {
    return NextResponse.json({ competitors: [] });
  }

  // Attempt full insert with the place id
  const { data, error } = await supabase
    .from("business_competitors")
    .insert(newRows)
    .select();

  if (!error) {
    return NextResponse.json({ competitors: data });
  }

  // If insert failed because place_id doesn't exist yet (migration 010 not applied),
  // fall back to inserting only the columns that definitely exist.
  if (error.code === PG_UNDEFINED_COLUMN) {
    console.warn("[competitors] place_id column missing (migration 010 not applied), using basic insert");
    const basicRows = newRows.map(({ business_id, name, domain, source, confirmed }) => ({
      business_id,
      name,
      domain,
      source,
      confirmed,
    }));

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("business_competitors")
      .insert(basicRows)
      .select();

    if (fallbackError) {
      console.error("[competitors] Basic insert also failed:", fallbackError.message);
      return NextResponse.json({ error: "Could not save competitors." }, { status: 500 });
    }

    return NextResponse.json({ competitors: fallbackData, migrationPending: true });
  }

  console.error("[competitors] Save failed:", error.message);
  return NextResponse.json({ error: "Could not save competitors." }, { status: 500 });
}
