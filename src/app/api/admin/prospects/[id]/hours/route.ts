import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { getGooglePlaceHours } from "@/lib/google-places";
import { createServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServiceClient();
  const { data: prospect, error } = await supabase
    .from("prospecting_leads")
    .select("google_place_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !prospect?.google_place_id) {
    return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  }

  try {
    const hours = await getGooglePlaceHours(prospect.google_place_id);
    return NextResponse.json({ hours });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Business hours are unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
