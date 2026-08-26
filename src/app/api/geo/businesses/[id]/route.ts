import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

function clean(value: unknown, max = 300): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  for (const key of ["name", "industry", "description", "primary_city", "primary_region", "primary_country", "domain", "logo_url"]) {
    if (key in body) updates[key] = clean(body[key], key === "description" ? 1000 : 2000);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", id)
    .eq("owner_user_id", user!.id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not update business." }, { status: 500 });
  return NextResponse.json({ business: data });
}
