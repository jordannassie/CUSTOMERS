// Response headers for every page (SEC-04). Read by next.config.ts, so no server-only imports here.

type Options = { supabaseUrl: string; isDev: boolean };

const STRIPE_JS = ["https://js.stripe.com", "https://*.js.stripe.com"];
// The Beehiiv newsletter form (merged from main): its loader script, the form frame and the calls it makes.
const BEEHIIV = "https://*.beehiiv.com";
// Public site videos (/ads portfolio) are kept in the live project's storage, whatever project this deploy uses.
const LIVE_STORAGE = "https://wsxusvapciexemfvtadm.supabase.co";

export function contentSecurityPolicy({ supabaseUrl, isDev }: Options): string {
  const supabase = new URL(supabaseUrl).origin;
  const supabaseSocket = supabase.replace(/^http/, "ws");
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js inlines its page data scripts; a nonce would make every cached marketing page dynamic.
    "script-src": ["'self'", "'unsafe-inline'", ...STRIPE_JS, BEEHIIV, ...(isDev ? ["'unsafe-eval'"] : [])],
    // Tailwind, Next.js and Stripe Elements all set inline styles.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Business logos can come from any website the user entered; uploaded ones from our Supabase storage.
    "img-src": ["'self'", "data:", "blob:", "https:", supabase],
    "font-src": ["'self'", "data:"],
    // Supabase auth and realtime in the browser, Stripe Elements API calls.
    "connect-src": ["'self'", supabase, supabaseSocket, "https://api.stripe.com", BEEHIIV],
    // Stripe Elements card fields and 3D Secure run in Stripe frames.
    "frame-src": [...STRIPE_JS, "https://hooks.stripe.com", BEEHIIV],
    "media-src": ["'self'", supabase, LIVE_STORAGE],
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
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
    // Enforced since 2026-10-14 (SEC-04), after a report-only period with no violations on our pages and Stripe.
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
  ];
}
