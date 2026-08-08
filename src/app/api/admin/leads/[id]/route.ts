import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { createServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  // Auth
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate ID
  const { id } = await ctx.params;
  if (!id || typeof id !== "string" || id.length < 10) {
    return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  // Validate status
  if ("status" in body) {
    const allowed = ["new", "followed_up"];
    if (!allowed.includes(String(body.status))) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }
    update.status = body.status;
    update.followed_up_at =
      body.status === "followed_up" ? new Date().toISOString() : null;
  }

  // Validate notes
  if ("notes" in body) {
    if (typeof body.notes !== "string") {
      return NextResponse.json({ error: "Notes must be a string" }, { status: 400 });
    }
    if (body.notes.length > 5000) {
      return NextResponse.json({ error: "Notes exceed 5000 character limit" }, { status: 400 });
    }
    update.notes = body.notes;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("customers_direct_leads")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Lead update error:", error.message);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
