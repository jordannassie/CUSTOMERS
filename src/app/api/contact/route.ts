import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// New canonical interest values (also used as topic in the DB)
const NEW_INTERESTS = ["ai_visibility", "chatgpt_ads", "agency", "other"] as const;

// Legacy topic values preserved for backward compatibility with old records
const LEGACY_TOPICS = ["product", "support", "sales", "enterprise"] as const;

const ALL_VALID_TOPICS = [...NEW_INTERESTS, ...LEGACY_TOPICS] as const;
type ValidTopic = (typeof ALL_VALID_TOPICS)[number];

// Valid source identifiers
const VALID_SOURCES = ["contact_page", "ads_page", "chat", "agency", "other"] as const;
type Source = (typeof VALID_SOURCES)[number];

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

  // Sanitize inputs
  const name      = typeof body.name     === "string" ? body.name.trim().slice(0, 200)    : "";
  const email     = typeof body.email    === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  const company   = typeof body.company  === "string" ? body.company.trim().slice(0, 200)  : null;
  const website   = typeof body.website  === "string" ? body.website.trim().slice(0, 500)  : null;
  const phone     = typeof body.phone    === "string" ? body.phone.trim().slice(0, 30)     : null;
  const message   = typeof body.message  === "string" ? body.message.trim().slice(0, 5000) : "";
  const pagePath  = typeof body.page_path === "string" ? body.page_path.trim().slice(0, 500) : null;

  // Accept both `interest` (new) and `topic` (legacy) field names
  const rawTopic  = body.interest ?? body.topic;
  const topic: ValidTopic = (
    typeof rawTopic === "string" && ALL_VALID_TOPICS.includes(rawTopic as ValidTopic)
      ? rawTopic as ValidTopic
      : "other"
  );

  const rawSource = body.source;
  const source: Source = (
    typeof rawSource === "string" && VALID_SOURCES.includes(rawSource as Source)
      ? rawSource as Source
      : "other"
  );

  // Validation
  if (!name)    return NextResponse.json({ error: "Name is required." },    { status: 400 });
  if (!email)   return NextResponse.json({ error: "Email is required." },   { status: 400 });
  if (!EMAIL_REGEX.test(email))
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  if (!message || message.length < 5)
    return NextResponse.json({ error: "Message is required." }, { status: 400 });

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
      company:   company || null,
      website:   website || null,
      phone:     phone   || null,
      topic,
      message,
      source,
      page_path: pagePath || null,
      ip_hash:   hashIp(ip),
      user_id:   userId,
    });

  if (error) {
    console.error("[contact] insert error:", error.message);
    return NextResponse.json(
      { error: "Failed to send message. Please try again or email us directly." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
