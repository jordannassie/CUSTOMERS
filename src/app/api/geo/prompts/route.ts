import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

interface PromptInput {
  prompt?: unknown;
  category?: unknown;
  buyer_intent?: unknown;
  location?: unknown;
}

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { business_id?: unknown; prompts?: PromptInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const businessId = typeof body.business_id === "string" ? body.business_id : "";
  if (!businessId) return NextResponse.json({ error: "business_id is required." }, { status: 400 });

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .single();
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const rows = (Array.isArray(body.prompts) ? body.prompts : [])
    .map((p) => ({
      business_id: businessId,
      prompt: typeof p.prompt === "string" ? p.prompt.trim().slice(0, 500) : "",
      category: typeof p.category === "string" ? p.category.trim().slice(0, 100) : null,
      buyer_intent: typeof p.buyer_intent === "string" ? p.buyer_intent.trim().slice(0, 50) : null,
      location: typeof p.location === "string" && p.location.trim() ? p.location.trim().slice(0, 200) : null,
      active: true,
    }))
    .filter((p) => p.prompt);

  if (rows.length === 0) {
    return NextResponse.json({ error: "At least one prompt is required." }, { status: 400 });
  }

  const { data: inserted, error } = await supabase.from("tracked_prompts").insert(rows).select();

  if (error) {
    console.error("Save prompts failed:", error.message);
    return NextResponse.json({ error: "Could not save prompts." }, { status: 500 });
  }

  // Onboarding is now complete — flip the business to active so it's picked
  // up by monitoring and the dashboard stops showing the onboarding gate.
  await supabase.from("businesses").update({ status: "active" }).eq("id", businessId);

  return NextResponse.json({ prompts: inserted });
}
