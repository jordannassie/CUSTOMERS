import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/modules/admin";
import { authErrorResponse, requireAdmin } from "@/modules/auth";
import { featureStatusInput, setFeatureRequestStatus } from "@/modules/feedback";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    return authErrorResponse(error);
  }

  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const parsed = featureStatusInput.safeParse({ id: (await params).id, status: body?.status });
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const { id, status } = parsed.data;
  if (!(await setFeatureRequestStatus(id, status)).ok) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  await logAdminAction("feature_request.update", { type: "feature_request", id }, { status });
  return NextResponse.json({ ok: true });
}
