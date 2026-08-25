import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the authenticated Supabase user for a route handler, or returns
 * a 401 response. Every GEO API route that touches user data should call
 * this first — actual data access is still protected by RLS as a second
 * layer, but this gives callers a clean early exit.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase,
      unauthorized: NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
    } as const;
  }

  return { user, supabase, unauthorized: null } as const;
}
