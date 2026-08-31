import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require";
import { createServiceClient } from "@/lib/supabase/service";

const PAGE_SIZE = 30;

// ─── GET /api/internal/admin/leads ────────────────────────────────────────────
// Query params: page, search, interest, source, status, unread
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const search   = searchParams.get("search")?.trim() ?? "";
  const interest = searchParams.get("interest") ?? "";
  const source   = searchParams.get("source") ?? "";
  const status   = searchParams.get("status") ?? "";
  const unread   = searchParams.get("unread") === "1";
  const countOnly = searchParams.get("count") === "1";

  const supabase = createServiceClient();

  if (countOnly) {
    const { count, error } = await supabase
      .from("contact_submissions")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: count ?? 0 });
  }

  let query = supabase
    .from("contact_submissions")
    .select(
      "id, created_at, read_at, name, email, company, website, phone, topic, message, status, source, page_path",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
    );
  }
  if (interest) query = query.eq("topic", interest);
  if (source)   query = query.eq("source", source);
  if (status)   query = query.eq("status", status);
  if (unread)   query = query.is("read_at", null);

  const { data: leads, count, error } = await query;

  if (error) {
    console.error("[admin/leads] query error:", error.message);
    return NextResponse.json({ error: "Failed to load leads." }, { status: 500 });
  }

  return NextResponse.json({
    leads: leads ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    pages: Math.ceil((count ?? 0) / PAGE_SIZE),
  });
}

// ─── PATCH /api/internal/admin/leads ──────────────────────────────────────────
// Body: { id, status?, mark_read? }
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const VALID_STATUSES = ["new", "contacted", "qualified", "closed", "in_progress", "resolved"] as const;
  type LeadStatus = (typeof VALID_STATUSES)[number];

  const updates: Record<string, unknown> = {};

  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status as LeadStatus)) {
    updates.status = body.status;
  }
  if (body.mark_read === true) {
    updates.read_at = new Date().toISOString();
  }
  if (body.mark_unread === true) {
    updates.read_at = null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("contact_submissions")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[admin/leads] update error:", error.message);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
