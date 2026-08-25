import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

function clean(value: unknown, max = 300): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = clean(body.name, 200);
  const domain = clean(body.domain, 300);
  const industry = clean(body.industry, 150);

  if (!name) return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  if (!industry) return NextResponse.json({ error: "Industry is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("businesses")
    .insert({
      owner_user_id: user!.id,
      name,
      domain,
      industry,
      description: clean(body.description, 1000),
      reach_type: clean(body.reach_type, 50),
      primary_country: clean(body.primary_country, 100),
      primary_region: clean(body.primary_region, 100),
      primary_city: clean(body.primary_city, 100),
      logo_url: clean(body.logo_url, 1000),
      status: "onboarding",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Create business failed:", error.message);
    return NextResponse.json({ error: "Could not create business." }, { status: 500 });
  }

  return NextResponse.json({ businessId: data.id });
}

export async function GET() {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", user!.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List businesses failed:", error.message);
    return NextResponse.json({ error: "Could not load businesses." }, { status: 500 });
  }

  return NextResponse.json({ businesses: data });
}
