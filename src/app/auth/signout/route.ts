import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 See Other: the browser opens /login with a GET. The default 307 kept the POST, and a POST to /login answered
  // with an empty page, so signing out showed a blank screen (2026-10-23).
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
