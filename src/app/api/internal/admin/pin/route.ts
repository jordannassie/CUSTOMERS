import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminSession } from "@/lib/admin-session";

// Simple in-memory rate limiter — resets on cold start (acceptable for MVP)
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry && entry.count >= MAX_ATTEMPTS) {
    if (now < entry.resetAt) {
      return { allowed: false, retryAfterMs: entry.resetAt - now };
    }
    attempts.delete(key);
  }

  const current = attempts.get(key) ?? { count: 0, resetAt: now + COOLDOWN_MS };
  current.count += 1;
  attempts.set(key, current);
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  // Must be authenticated Supabase user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Must have admin role
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.account_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit by user ID
  const rl = checkRateLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  let body: { pin?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    // Fail closed — no PIN configured means admin is inaccessible
    return NextResponse.json({ error: "Admin PIN not configured." }, { status: 503 });
  }

  if (!body.pin || body.pin !== adminPin) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  // PIN correct — clear rate limit and set session
  attempts.delete(user.id);
  const session = await getAdminSession();
  session.isAdmin = true;
  await session.save();

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getAdminSession();
  session.isAdmin = false;
  await session.save();
  return NextResponse.json({ success: true });
}
