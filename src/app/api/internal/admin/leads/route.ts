import { NextRequest, NextResponse } from "next/server";
import { auditedChange, changed, unchanged } from "@/modules/admin";
import { adminEmails, AuthError, authErrorResponse, requireAdmin } from "@/modules/auth";
import { countUnreadLeads, getLead, leadsQuery, leadUpdateInput, listLeads, updateLead } from "@/modules/feedback";

// GET /api/internal/admin/leads?page&search&interest&source&status&unread=1&replied=yes|no&handler&count=1, or ?id= for one lead
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
  if (q.id) {
    const lead = await getLead(q.id);
    return lead ? NextResponse.json({ lead }) : NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  // A page past the end answers with the last page (readPage), not an error.
  const page = await listLeads({ ...q, unread: q.unread === "1" });
  if (!page) return NextResponse.json({ error: "Failed to load leads." }, { status: 500 });
  return NextResponse.json(page);
}

type LeadUpdate = Awaited<ReturnType<typeof updateLead>>;

// PATCH /api/internal/admin/leads with { id, status?, mark_read?, mark_unread?, admin_notes?, handled_by?, replied? }
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    return authErrorResponse(error);
  }

  const parsed = leadUpdateInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "id required." }, { status: 400 });
  const { id, status, mark_read: markRead, mark_unread: markUnread, admin_notes: adminNotes, handled_by: handledBy, replied } = parsed.data;
  // Only an admin can handle a lead: ADMIN_EMAILS is the list, as everywhere in the admin.
  if (handledBy && !adminEmails().includes(handledBy.toLowerCase())) {
    return NextResponse.json({ error: "Pick one of the admins." }, { status: 400 });
  }
  const followUp = adminNotes !== undefined || handledBy !== undefined || replied !== undefined;

  // Checked here too, so a request with nothing to change writes no history row.
  if (!status && !markRead && !markUnread && !followUp) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  try {
    // The history row is written before the change (BUG-278); it ends with the fields that were saved.
    // The note's text stays on the lead; the history only records that it changed.
    const requested = {
      ...(status && { status }),
      ...(markRead && { mark_read: true }),
      ...(markUnread && { mark_unread: true }),
      ...(adminNotes !== undefined && { notes_changed: true }),
      ...(handledBy !== undefined && { handled_by: handledBy || null }),
      ...(replied !== undefined && { replied }),
    };
    const result = await auditedChange<LeadUpdate>("lead.update", { type: "lead", id }, requested, async () => {
      const updated = await updateLead(id, { status, markRead, markUnread, adminNotes, handledBy, replied });
      // The note's text stays on the lead only; the history keeps that it changed (notes_changed above).
      if (!updated.ok) return unchanged(updated, updated.reason);
      const saved = { ...updated.updates };
      delete saved.admin_notes;
      return changed(updated, saved);
    });
    if (!result.ok) {
      return result.reason === "nothing"
        ? NextResponse.json({ error: "Nothing to update." }, { status: 400 })
        : NextResponse.json({ error: "Update failed." }, { status: 500 });
    }
    // The status the lead has now: marking as replied may have moved it from New to Contacted.
    return NextResponse.json({ success: true, status: result.updates.status ?? null });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    console.error("[admin/leads] audited update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
