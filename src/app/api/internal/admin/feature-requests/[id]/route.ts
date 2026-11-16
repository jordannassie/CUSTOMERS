import { NextRequest, NextResponse } from "next/server";
import { auditedChange, changed, unchanged } from "@/modules/admin";
import { AuthError, authErrorResponse, requireAdmin } from "@/modules/auth";
import { z } from "zod";
import { deleteFeatureRequest, featureStatusInput, setFeatureRequestStatus } from "@/modules/feedback";

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

/** Deletes a feature request for good (owner, 2026-11-16). The admin history keeps that it was deleted, not its text. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    return authErrorResponse(error);
  }
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const id = parsed.data;
  try {
    const gone = await auditedChange("feature_request.delete", { type: "feature_request", id }, {}, async () => {
      const result = await deleteFeatureRequest(id);
      return result.ok && result.found ? changed(true) : unchanged(false, result.ok ? "not found" : "delete failed");
    });
    if (!gone) return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  } catch (error) {
    return failure(error);
  }
  return NextResponse.json({ ok: true });
}
