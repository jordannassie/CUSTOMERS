import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { searchGooglePlaces } from "@/lib/google-places";

export const runtime = "nodejs";
export const maxDuration = 26;

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { query?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.query !== "string" || !body.query.trim()) {
    return NextResponse.json({ error: "Enter a business and location." }, { status: 400 });
  }
  const query = body.query.trim();
  if (query.length > 200) {
    return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
  }

  try {
    const businesses = await searchGooglePlaces(query);
    return NextResponse.json({
      success: true,
      query,
      count: businesses.length,
      businesses,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Business search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
