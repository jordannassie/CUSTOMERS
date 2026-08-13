import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const [{ data: folders, error }, { data: assignments }] = await Promise.all([
    supabase.from("prospecting_folders").select("*").order("created_at", { ascending: false }),
    supabase.from("prospecting_leads").select("folder_id").not("folder_id", "is", null),
  ]);
  if (error) {
    console.error("Prospecting folders query error:", error.message);
    return NextResponse.json({ error: "Failed to load folders." }, { status: 500 });
  }

  const counts = new Map<string, number>();
  for (const row of assignments ?? []) {
    if (row.folder_id) counts.set(row.folder_id, (counts.get(row.folder_id) ?? 0) + 1);
  }
  return NextResponse.json({
    folders: (folders ?? []).map((folder) => ({
      ...folder,
      lead_count: counts.get(folder.id) ?? 0,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: unknown; searchQuery?: unknown };
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
    .insert({
      name: body.name.trim().slice(0, 120),
      search_query:
        typeof body.searchQuery === "string" ? body.searchQuery.trim().slice(0, 200) || null : null,
    })
    .select()
    .single();
  if (error) {
    console.error("Prospecting folder create error:", error.message);
    return NextResponse.json({ error: "Failed to create folder." }, { status: 500 });
  }
  return NextResponse.json({ folder: { ...data, lead_count: 0 } }, { status: 201 });
}
