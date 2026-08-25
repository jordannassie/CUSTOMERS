import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { generateOpportunities } from "@/lib/geo/opportunity-engine";

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { business_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const businessId = typeof body.business_id === "string" ? body.business_id : "";
  if (!businessId) return NextResponse.json({ error: "business_id is required." }, { status: 400 });

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, domain, description, primary_city")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .single();

  if (businessError || !business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: latestRun } = await supabase
    .from("visibility_runs")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRun) {
    return NextResponse.json({ error: "No completed visibility run yet." }, { status: 400 });
  }

  const { data: results } = await supabase
    .from("visibility_results")
    .select("business_mentioned, competitors_mentioned, cited_sources")
    .eq("run_id", latestRun.id);

  const drafts = generateOpportunities({
    businessName: business.name,
    domain: business.domain,
    description: business.description,
    primaryCity: business.primary_city,
    results: results ?? [],
  });

  // Replace previously-generated "open" opportunities with the fresh set —
  // anything the user already moved to in_progress/resolved/dismissed is left alone.
  await supabase.from("opportunities").delete().eq("business_id", businessId).eq("status", "open");

  if (drafts.length === 0) {
    return NextResponse.json({ opportunities: [] });
  }

  const rows = drafts.map((d) => ({ business_id: businessId, status: "open" as const, ...d }));
  const { data: inserted, error } = await supabase.from("opportunities").insert(rows).select();

  if (error) {
    console.error("Save opportunities failed:", error.message);
    return NextResponse.json({ error: "Could not save opportunities." }, { status: 500 });
  }

  return NextResponse.json({ opportunities: inserted });
}
