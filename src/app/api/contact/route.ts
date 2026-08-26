import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_TOPICS = ["product", "support", "sales", "enterprise", "agency", "other"] as const;
type Topic = (typeof VALID_TOPICS)[number];

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot — silently discard bot submissions
  if (body._honey && String(body._honey).trim() !== "") {
    return NextResponse.json({ success: true });
  }

  const name    = typeof body.name    === "string" ? body.name.trim().slice(0, 200)    : "";
  const email   = typeof body.email   === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  const company = typeof body.company === "string" ? body.company.trim().slice(0, 200) : null;
  const website = typeof body.website === "string" ? body.website.trim().slice(0, 500) : null;
  const topic   = typeof body.topic   === "string" && VALID_TOPICS.includes(body.topic as Topic)
    ? (body.topic as Topic)
    : "other";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 5000) : "";

  if (!name)    return NextResponse.json({ error: "Name is required." },    { status: 400 });
  if (!email)   return NextResponse.json({ error: "Email is required." },   { status: 400 });
  if (!EMAIL_REGEX.test(email)) return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  if (!message || message.length < 10) {
    return NextResponse.json({ error: "Message must be at least 10 characters." }, { status: 400 });
  }

  // Optionally link to the authenticated user
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch { /* public endpoint — unauthenticated is fine */ }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const service = createServiceClient();
  const { error } = await service
    .from("contact_submissions")
    .insert({
      name,
      email,
      company: company || null,
      website: website || null,
      topic,
      message,
      ip_hash: hashIp(ip),
      user_id: userId,
    });

  if (error) {
    // Table may not exist yet in production — don't crash the user experience
    console.error("[contact] insert error:", error.message);
    return NextResponse.json(
      { error: "Failed to send message. Please try again or email us directly." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
