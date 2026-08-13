import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { createServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Folder name is required." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("prospecting_folders")
    .update({ name: body.name.trim().slice(0, 120), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Prospecting folder update error:", error.message);
    return NextResponse.json({ error: "Failed to rename folder." }, { status: 500 });
  }
  return NextResponse.json({ folder: data });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const supabase = createServiceClient();
  const { count: deletedProspects, error: prospectError } = await supabase
    .from("prospecting_leads")
    .delete({ count: "exact" })
    .eq("folder_id", id);
  if (prospectError) {
    console.error("Folder prospect delete error:", prospectError.message);
    return NextResponse.json({ error: "Failed to delete the folder's prospects." }, { status: 500 });
  }

  const { error } = await supabase.from("prospecting_folders").delete().eq("id", id);
  if (error) {
    console.error("Prospecting folder delete error:", error.message);
    return NextResponse.json({ error: "Failed to delete folder." }, { status: 500 });
  }
  return NextResponse.json({ success: true, deletedProspects: deletedProspects ?? 0 });
}
