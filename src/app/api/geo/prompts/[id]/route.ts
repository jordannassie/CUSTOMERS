import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";

async function ownedPrompt(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string, id: string) {
  const { data } = await supabase
    .from("tracked_prompts")
    .select("id, business_id, businesses!inner(owner_user_id)")
    .eq("id", id)
    .single();
  if (!data || (data as unknown as { businesses: { owner_user_id: string } }).businesses.owner_user_id !== userId) {
    return null;
  }
  return data;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  if (!(await ownedPrompt(supabase, user!.id, id))) {
    return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  }

  let body: { active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tracked_prompts")
    .update({ active: Boolean(body.active) })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Could not update prompt." }, { status: 500 });
  return NextResponse.json({ prompt: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  if (!(await ownedPrompt(supabase, user!.id, id))) {
    return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  }

  const { error } = await supabase.from("tracked_prompts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete prompt." }, { status: 500 });
  return NextResponse.json({ success: true });
}
