import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { createServiceClient } from "@/lib/supabase/service";
import { PROSPECT_STATUSES } from "@/types/prospecting";

type RouteContext = { params: Promise<{ id: string }> };

const TEXT_LIMITS: Record<string, number> = {
  contact_name: 200,
  contact_title: 200,
  contact_email: 320,
  contact_phone: 100,
  notes: 10000,
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("status" in body) {
    if (!PROSPECT_STATUSES.includes(body.status as (typeof PROSPECT_STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = body.status;
    if (body.status !== "New") update.last_contacted_at = new Date().toISOString();
  }

  for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value !== null && typeof value !== "string") {
      return NextResponse.json({ error: `Invalid ${field}.` }, { status: 400 });
    }
    if (typeof value === "string" && value.length > limit) {
      return NextResponse.json({ error: `${field} is too long.` }, { status: 400 });
    }
    update[field] = typeof value === "string" ? value.trim() || null : null;
  }

  for (const field of ["folder_id", "next_follow_up_at"] as const) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value !== null && typeof value !== "string") {
      return NextResponse.json({ error: `Invalid ${field}.` }, { status: 400 });
    }
    update[field] = value || null;
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("prospecting_leads")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Prospect update error:", error.message);
    return NextResponse.json({ error: "Failed to update prospect." }, { status: 500 });
  }
  return NextResponse.json({ prospect: data });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("prospecting_leads").delete().eq("id", id);
  if (error) {
    console.error("Prospect delete error:", error.message);
    return NextResponse.json({ error: "Failed to delete prospect." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
