import { NextRequest, NextResponse } from "next/server";
import { auditedChange, changed, unchanged } from "@/modules/admin";
import { AuthError, authErrorResponse, requireAdmin } from "@/modules/auth";
import { featureStatusInput, setFeatureRequestStatus } from "@/modules/feedback";

// An admin check that fails now is a 401 or 403; a history row that cannot be written is "Update failed.".
function failure(error: unknown): Response {
  if (error instanceof AuthError) return authErrorResponse(error);
  console.error("[feature-requests] audited update failed:", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Update failed." }, { status: 500 });
}

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
  try {
    // The history row is written before the change (BUG-278).
    const saved = await auditedChange("feature_request.update", { type: "feature_request", id }, { status }, async () =>
      (await setFeatureRequestStatus(id, status)).ok ? changed(true) : unchanged(false, "update failed"),
    );
    if (!saved) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  } catch (error) {
    return failure(error);
  }
  return NextResponse.json({ ok: true });
}
