import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";

const VALID_STATUSES = ["new", "reviewing", "planned", "shipped", "declined"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (error) {
    return authErrorResponse(error);
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { status } = body as { status?: string };
  if (!status || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const svc = createServiceClient();
  const { error } = await svc
    .from("feature_requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
