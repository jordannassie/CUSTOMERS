import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Middleware that refreshes the Supabase auth session on every request
 * and forwards updated cookies to both the server and the browser.
 *
 * Add any route-level auth guards below the session refresh block.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do NOT remove this line.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Auth guard: /dashboard requires a signed-in Supabase Auth user ---
  const { pathname } = request.nextUrl;

  const needsAuth =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/internal") ||
    pathname.startsWith("/academy") ||
    pathname.startsWith("/agency/activate") ||
    pathname.startsWith("/agency/success");

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Signed-in users hitting /login or /signup continue to next, or the dashboard.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const next = request.nextUrl.searchParams.get("next");
    const safe =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    const url = request.nextUrl.clone();
    url.search = "";
    const [path, query] = safe.split("?");
    url.pathname = path || "/dashboard";
    if (query) {
      url.search = `?${query}`;
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match every request except:
     *  - _next/static  (static assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public folder files
     *  - auth/callback  (must not be intercepted — it exchanges the OAuth code and sets cookies)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:js|svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
