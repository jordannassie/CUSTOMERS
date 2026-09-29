import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-next";
import { isAuthUnavailable } from "@/lib/supabase/auth-errors";

// Quick redirects only (MVP_SPEC 18.1 rule 4). Every page, action and route still checks access
// itself through src/modules/auth.
const PROTECTED = ["/dashboard", "/settings", "/sources", "/competitors", "/questions", "/internal", "/design-preview"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Also refreshes an expiring session and writes the new cookies; do not remove.
  const { data, error } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  // A check that failed is not a sign-out: let the page run its own check and show its error (BUG-4).
  const unknown = !signedIn && isAuthUnavailable(error);

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!signedIn && !unknown && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return redirectKeepingCookies(url, response);
  }

  // getClaims() only checks the token; a deleted user still has a valid one, and pages send them to
  // /login, so bouncing them back from here looped (BUG-020). Only these pages pay for the extra call.
  if (signedIn && AUTH_PAGES.includes(pathname) && (await supabase.auth.getUser()).data.user) {
    const target = new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.url);
    return redirectKeepingCookies(target, response);
  }

  return response;
}

// A refreshed session must reach the browser even when we redirect.
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // Skips static files, image optimisation and auth/callback (it exchanges the OAuth code and sets cookies).
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:js|svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
