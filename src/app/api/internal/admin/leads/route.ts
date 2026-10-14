import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/modules/admin";
import { authErrorResponse, requireAdmin } from "@/modules/auth";
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

  const result = await updateLead(id, { status, markRead, markUnread });
  if (!result.ok) {
    return result.reason === "nothing"
      ? NextResponse.json({ error: "Nothing to update." }, { status: 400 })
      : NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
  await logAdminAction("lead.update", { type: "lead", id }, result.updates);
  return NextResponse.json({ success: true });
}
