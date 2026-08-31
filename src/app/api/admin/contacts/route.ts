import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: contacts, error } = await supabase
    .from("contact_submissions")
    .select("id, created_at, name, email, company, website, phone, topic, message, status, source, page_path")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin/contacts] query error:", error.message);
    return NextResponse.json({ error: "Failed to fetch contacts." }, { status: 500 });
  }

  return NextResponse.json({ contacts });
}
