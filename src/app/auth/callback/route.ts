import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / magic-link callback. Supabase redirects here with a `code`
 * query param after a successful Google sign-in (or email confirmation),
 * which we exchange for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Supabase (GoTrue) redirects here with these params instead of `code`
  // when the provider-side exchange (e.g. Google) fails before Supabase
  // ever issues us a session code — most commonly an invalid/stale OAuth
  // Client Secret configured on the Supabase provider.
  const providerError =
    searchParams.get("error_code") || searchParams.get("error");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&reason=${encodeURIComponent(error.message)}`
    );
  }

  if (providerError) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&reason=${encodeURIComponent(providerError)}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
