import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { createServiceClient } from "@/lib/supabase/service";
import type { ProspectSearchResult } from "@/types/prospecting";

async function isAuthorized() {
  const session = await getAdminSession();
  return Boolean(session.isAdmin);
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const folderId = params.get("folder");
  const status = params.get("status");
  const search = params.get("search")?.trim();
  const followUps = params.get("followUps") === "true";
  const sort = params.get("sort") ?? "newest";

  const supabase = createServiceClient();
  let query = supabase.from("prospecting_leads").select("*").limit(500);

  if (folderId && folderId !== "all") {
    query =
      folderId === "unassigned"
        ? query.is("folder_id", null)
        : query.eq("folder_id", folderId);
  }
  if (status && status !== "all") query = query.eq("status", status);
  if (search) {
    const escaped = search.replace(/[%_,()]/g, "");
    query = query.or(
      `business_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
    );
  }
  if (followUps) {
    query = query.lte("next_follow_up_at", new Date().toISOString());
  }

  if (sort === "rating") query = query.order("rating", { ascending: false, nullsFirst: false });
  else if (sort === "reviews") query = query.order("review_count", { ascending: false, nullsFirst: false });
  else if (sort === "opportunity") query = query.order("lead_score", { ascending: false });
  else if (sort === "name") query = query.order("business_name", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error("Prospecting leads query error:", error.message);
    return NextResponse.json({ error: "Failed to load prospects." }, { status: 500 });
  }
  return NextResponse.json({ prospects: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { prospects?: unknown; folderId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body.prospects) || body.prospects.length === 0) {
    return NextResponse.json({ error: "Select at least one prospect." }, { status: 400 });
  }
  if (body.prospects.length > 1500) {
    return NextResponse.json({ error: "A maximum of 1,500 prospects can be saved at once." }, { status: 400 });
  }

  const unique = new Map<string, ProspectSearchResult>();
  for (const value of body.prospects) {
    if (
      value &&
      typeof value === "object" &&
      typeof (value as ProspectSearchResult).placeId === "string" &&
      typeof (value as ProspectSearchResult).businessName === "string"
    ) {
      unique.set((value as ProspectSearchResult).placeId, value as ProspectSearchResult);
    }
  }
  if (unique.size === 0) {
    return NextResponse.json({ error: "No valid prospects were supplied." }, { status: 400 });
  }

  const folderId = typeof body.folderId === "string" && body.folderId ? body.folderId : null;
  const placeIds = Array.from(unique.keys());
  const supabase = createServiceClient();
  const existingRows: Array<{ google_place_id: string }> = [];
  for (let index = 0; index < placeIds.length; index += 200) {
    const { data, error } = await supabase
      .from("prospecting_leads")
      .select("google_place_id")
      .in("google_place_id", placeIds.slice(index, index + 200));
    if (error) {
      console.error("Prospect duplicate check error:", error.message);
      return NextResponse.json({ error: "Failed to check saved prospects." }, { status: 500 });
    }
    existingRows.push(...(data ?? []));
  }

  const existingIds = new Set(
    existingRows.map((row) => row.google_place_id),
  );
  const rows = Array.from(unique.values())
    .filter((prospect) => !existingIds.has(prospect.placeId))
    .map((prospect) => ({
      google_place_id: prospect.placeId,
      business_name: prospect.businessName.slice(0, 300),
      category: prospect.category,
      city: prospect.city,
      state: prospect.state,
      phone: prospect.phone,
      website: prospect.website,
      address: prospect.address,
      google_maps_url: prospect.mapsUrl,
      rating: prospect.rating,
      review_count: prospect.reviewCount,
      lead_score: prospect.leadScore,
      status: "New",
      folder_id: folderId,
    }));

  const inserted: Array<{ google_place_id: string }> = [];
  for (let index = 0; index < rows.length; index += 200) {
    const { data, error } = await supabase
      .from("prospecting_leads")
      .upsert(rows.slice(index, index + 200), {
        onConflict: "google_place_id",
        ignoreDuplicates: true,
      })
      .select("google_place_id");
    if (error) {
      console.error("Prospect save error:", error.message);
      return NextResponse.json({ error: "Failed to save prospects." }, { status: 500 });
    }
    inserted.push(...(data ?? []));
  }

  return NextResponse.json({
    success: true,
    saved: inserted.length,
    existing: unique.size - inserted.length,
    savedPlaceIds: [...existingIds, ...inserted.map((row) => row.google_place_id)],
  });
}
