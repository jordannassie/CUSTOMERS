import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * OAuth / magic-link callback.
 *
 * ROOT CAUSE NOTE: In Next.js 16, if you use `cookies()` from next/headers
 * inside a Route Handler and then return `NextResponse.redirect()`, the cookies
 * set via `cookieStore.set()` are NOT automatically included in the redirect
 * response — they go to an implicit "current" response that is discarded.
 *
 * The fix: create the Supabase client so it writes cookies directly onto the
 * redirect `NextResponse` object. That way the Set-Cookie headers ride along
 * with the 302, the browser stores them, the proxy reads them on the next
 * request, `getUser()` succeeds, and the dashboard loads.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // On Netlify the internal request.url host ≠ the public-facing domain.
  // x-forwarded-host gives us the real public host (customers.direct).
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin);

  // Supabase sends error_code / error when the provider-side exchange fails
  // before we ever receive a code (misconfigured OAuth client, etc.)
  const providerError = searchParams.get("error_code") ?? searchParams.get("error");
  if (providerError) {
    console.error("[auth/callback] provider error:", providerError);
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_provider_error`);
  }

  if (!code) {
    console.error("[auth/callback] no code in request");
    return NextResponse.redirect(`${baseUrl}/login?error=missing_oauth_code`);
  }

  // ─── Build the success redirect response NOW so we can attach cookies to it ─
  const next = searchParams.get("next") ?? "/dashboard";
  // Guard against open-redirect: only allow relative paths
  const safePath = next.startsWith("/") ? next : "/dashboard";
  const successResponse = NextResponse.redirect(`${baseUrl}${safePath}`);
  const errorResponse   = NextResponse.redirect(`${baseUrl}/login?error=oauth_callback_failed`);

  // ─── Create Supabase client that writes cookies directly onto the response ──
  // This is the critical difference from the previous implementation.
  // cookieStore.set() via next/headers is silently dropped when returning a
  // NextResponse.redirect() — so we must set cookies on the response object.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Write to both request (for subsequent server reads) and the
            // actual response that will be returned to the browser.
            request.cookies.set(name, value);
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
