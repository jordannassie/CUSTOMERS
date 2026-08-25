import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const { data } = await supabase
    .from("business_competitors")
    .select("id, businesses!inner(owner_user_id)")
    .eq("id", id)
    .single();

  if (!data || (data as unknown as { businesses: { owner_user_id: string } }).businesses.owner_user_id !== user!.id) {
    return NextResponse.json({ error: "Competitor not found." }, { status: 404 });
  }

  const { error } = await supabase.from("business_competitors").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete competitor." }, { status: 500 });
  return NextResponse.json({ success: true });
}
