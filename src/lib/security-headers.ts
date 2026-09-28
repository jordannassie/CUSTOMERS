// Response headers for every page (SEC-04). Read by next.config.ts, so no server-only imports here.

type Options = { supabaseUrl: string; isDev: boolean };

const STRIPE_JS = ["https://js.stripe.com", "https://*.js.stripe.com"];

export function contentSecurityPolicy({ supabaseUrl, isDev }: Options): string {
  const supabase = new URL(supabaseUrl).origin;
  const supabaseSocket = supabase.replace(/^http/, "ws");
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js inlines its page data scripts; a nonce would make every cached marketing page dynamic.
    "script-src": ["'self'", "'unsafe-inline'", ...STRIPE_JS, ...(isDev ? ["'unsafe-eval'"] : [])],
    // Tailwind, Next.js and Stripe Elements all set inline styles.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Business logos can come from any website the user entered.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    // Supabase auth and realtime in the browser, Stripe Elements API calls.
    "connect-src": ["'self'", supabase, supabaseSocket, "https://api.stripe.com"],
    // Stripe Elements card fields and 3D Secure run in Stripe frames.
    "frame-src": [...STRIPE_JS, "https://hooks.stripe.com"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // Forms that end in a redirect to Stripe Checkout or the billing portal.
    "form-action": ["'self'", "https://checkout.stripe.com", "https://billing.stripe.com"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function securityHeaders(options: Options) {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
    // Safe to enforce now: nothing embeds our pages, and we use no plugins or <base>.
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    // The full policy is report-only first: violations show in the browser console without blocking anything.
    { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy(options) },
  ];
}
