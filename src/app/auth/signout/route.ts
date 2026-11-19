import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  // "local" ends only this browser's session; the default "global" signed the user out on every device.
  await supabase.auth.signOut({ scope: "local" });
  // 303 See Other: the browser opens /login with a GET (a 307 kept the POST, and a POST to /login was a blank page).
  // The address is relative: on Netlify request.url names the deploy's own host, not the one the user is on, and the
  // CSP form-action rule then blocks a form whose redirect leaves the site (2026-10-23).
  return new NextResponse(null, { status: 303, headers: { Location: "/login" } });
}
