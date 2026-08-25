import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { runVisibilityForBusiness } from "@/lib/geo/run-visibility";

const RUN_COOLDOWN_MS = 2 * 60 * 1000; // basic duplicate-run protection

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

  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, domain, primary_city, primary_region")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: recentRun } = await supabase
    .from("visibility_runs")
    .select("id, started_at")
    .eq("business_id", businessId)
    .in("status", ["pending", "running"])
    .gte("started_at", new Date(Date.now() - RUN_COOLDOWN_MS).toISOString())
    .limit(1)
    .maybeSingle();

  if (recentRun) {
    return NextResponse.json(
      { error: "A visibility run for this business was just started. Please wait a moment." },
      { status: 429 },
    );
  }

  const result = await runVisibilityForBusiness(supabase, business);

  if (result.error && result.promptsSucceeded === 0) {
    return NextResponse.json({ error: result.error, result }, { status: 502 });
  }

  return NextResponse.json({ result });
}
