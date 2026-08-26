import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * OAuth / magic-link callback.
 *
 * Uses `next/headers` cookies() for reading (recommended for Route Handlers in
 * Next.js App Router — more reliable than request.cookies on Netlify serverless
 * because it handles chunked cookies and avoids header-size truncation).
 *
 * Writes Set-Cookie headers directly onto the redirect response so the
 * browser stores the session before following the redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // On Netlify the internal request.url host ≠ the public-facing domain.
  const forwardedHost  = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin);

  // Supabase sends error_code / error when the provider-side exchange fails
  const providerError = searchParams.get("error_code") ?? searchParams.get("error");
  if (providerError) {
    console.error("[auth/callback] provider error:", providerError);
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_provider_error`);
  }

  if (!code) {
    console.error("[auth/callback] no code in request");
    return NextResponse.redirect(`${baseUrl}/login?error=missing_oauth_code`);
  }

  // Determine where to redirect after a successful login
  const next     = searchParams.get("next") ?? "/dashboard";
  const safePath = next.startsWith("/") ? next : "/dashboard";

  // Build both responses up-front so we can attach cookies to whichever we return
  const successResponse = NextResponse.redirect(`${baseUrl}${safePath}`);
  const errorResponse   = NextResponse.redirect(`${baseUrl}/login?error=oauth_callback_failed`);

  // Read cookies via next/headers (canonical for App Router Route Handlers)
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // next/headers returns all cookies, including Supabase's chunked
          // code-verifier cookies (e.g. sb-*-auth-token-code-verifier.0, .1 …)
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Propagate session cookies onto the redirect response so the
            // browser stores them before following the Location header.
            successResponse.cookies.set(name, value, options);
            errorResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return errorResponse;
  }

  return successResponse;
}
