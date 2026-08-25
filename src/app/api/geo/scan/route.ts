import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { scanWebsite } from "@/lib/geo/scanner";

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "A website URL is required." }, { status: 400 });

  try {
    const result = await scanWebsite(url);
    return NextResponse.json({ scan: result });
  } catch (error) {
    console.error("Website scan failed:", error);
    return NextResponse.json({ error: "Could not scan that website." }, { status: 500 });
  }
}
