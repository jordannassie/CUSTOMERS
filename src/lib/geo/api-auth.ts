import "server-only";
import { NextResponse } from "next/server";
import { isAuthUnavailable } from "@/lib/supabase/auth-errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the authenticated Supabase user for a route handler, or returns
 * a 401 response. Every GEO API route that touches user data should call
 * this first. Actual data access is still protected by RLS as a second
 * layer, but this gives callers a clean early exit.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (isAuthUnavailable(error)) {
    return {
      user: null,
      supabase,
      unauthorized: NextResponse.json({ error: "We couldn't check your account just now. Try again in a moment." }, { status: 503 }),
    } as const;
  }

  if (error || !user) {
    return {
      user: null,
      supabase,
      unauthorized: NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
    } as const;
  }

  return { user, supabase, unauthorized: null } as const;
}
