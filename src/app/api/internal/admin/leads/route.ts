import { NextRequest, NextResponse } from "next/server";
import { auditedChange, changed, unchanged } from "@/modules/admin";
import { AuthError, authErrorResponse, requireAdmin } from "@/modules/auth";
import { countUnreadLeads, leadsQuery, leadUpdateInput, listLeads, updateLead } from "@/modules/feedback";

// GET /api/internal/admin/leads?page&search&interest&source&status&unread=1&count=1
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    return authErrorResponse(error);
  }

  const q = leadsQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  if (q.count) {
    const count = await countUnreadLeads();
    if (count === null) return NextResponse.json({ error: "Failed to load leads." }, { status: 500 });
    return NextResponse.json({ count });
  }
  const page = await listLeads({ ...q, unread: q.unread === "1" });
  if (!page) return NextResponse.json({ error: "Failed to load leads." }, { status: 500 });
  return NextResponse.json(page);
}

type LeadUpdate = Awaited<ReturnType<typeof updateLead>>;

// PATCH /api/internal/admin/leads with { id, status?, mark_read?, mark_unread? }
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    return authErrorResponse(error);
  }

  const parsed = leadUpdateInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "id required." }, { status: 400 });
  const { id, status, mark_read: markRead, mark_unread: markUnread } = parsed.data;

  // Checked here too, so a request with nothing to change writes no history row.
  if (!status && !markRead && !markUnread) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  try {
    // The history row is written before the change (BUG-278); it ends with the fields that were saved.
    const requested = { ...(status && { status }), ...(markRead && { mark_read: true }), ...(markUnread && { mark_unread: true }) };
    const result = await auditedChange<LeadUpdate>("lead.update", { type: "lead", id }, requested, async () => {
      const updated = await updateLead(id, { status, markRead, markUnread });
      return updated.ok ? changed(updated, updated.updates) : unchanged(updated, updated.reason);
    });
    if (!result.ok) {
      return result.reason === "nothing"
        ? NextResponse.json({ error: "Nothing to update." }, { status: 400 })
        : NextResponse.json({ error: "Update failed." }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    console.error("[admin/leads] audited update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
