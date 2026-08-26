import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { runSeoAnalysisForBusiness } from "@/lib/seo/run-seo-analysis";

// Same duplicate-run protection window as /api/geo/visibility/run — a
// second click while a run is already in flight is a no-op, not a second
// (billable) DataForSEO call.
const RUN_COOLDOWN_MS = 2 * 60 * 1000;

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { business_id?: unknown; force?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const businessId = typeof body.business_id === "string" ? body.business_id : "";
  if (!businessId) return NextResponse.json({ error: "business_id is required." }, { status: 400 });

  // Ownership check — same pattern as every other GEO API route: look the
  // business up scoped to the authenticated user, never trust the id alone.
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, domain, primary_city, primary_region, primary_country")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: recentRun } = await supabase
    .from("seo_runs")
    .select("id, started_at")
    .eq("business_id", businessId)
    .in("status", ["pending", "running"])
    .gte("started_at", new Date(Date.now() - RUN_COOLDOWN_MS).toISOString())
    .limit(1)
    .maybeSingle();

  if (recentRun) {
    return NextResponse.json(
      { error: "An SEO analysis run for this business was just started. Please wait a moment." },
      { status: 429 },
    );
  }

  const { data: competitors } = await supabase
    .from("business_competitors")
    .select("id, name, domain")
    .eq("business_id", businessId);

  const force = body.force === true;

  const result = await runSeoAnalysisForBusiness(supabase, business, competitors ?? [], { force });

  if (result.status === "skipped") {
    return NextResponse.json({ error: result.errors[0] ?? "SEO analysis could not run.", result }, { status: 422 });
  }
  if (result.status === "failed") {
    return NextResponse.json({ error: result.errors[0] ?? "SEO analysis failed.", result }, { status: 502 });
  }

  return NextResponse.json({ result });
}
