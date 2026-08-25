import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { generateBuyerIntentPrompts } from "@/lib/geo/prompt-engine";

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
    .select("industry, primary_city, primary_region")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const prompts = generateBuyerIntentPrompts({
    industry: business.industry ?? "business",
    city: business.primary_city,
    region: business.primary_region,
  });

  return NextResponse.json({ prompts });
}
