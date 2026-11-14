import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Creates a Supabase client for use in browser/client components.
 * Call this inside a Client Component ("use client").
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Whether Google sign-in is switched on for this Supabase project, from its public Auth settings. When it is off,
 * Supabase answers the sign-in with a raw "Unsupported provider" JSON page (MVP test 2026-11-14). An unreadable
 * answer counts as on, so a slow settings call never blocks a real sign-in.
 */
export async function googleSignInEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) return true;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google !== false;
  } catch {
    return true;
  }
}
