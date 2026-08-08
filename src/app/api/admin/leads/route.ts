import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: leads, error } = await supabase
    .from("customers_direct_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase query error:", error.message);
    return NextResponse.json({ error: "Failed to fetch leads." }, { status: 500 });
  }

  return NextResponse.json({ leads });
}
