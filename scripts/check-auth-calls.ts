// Every Server Action file and route handler must check auth itself (MVP_SPEC 18.1 rule 2).
// Usage: node scripts/check-auth-calls.ts   (exits 1 when a file has no check and is not listed as public)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
// activeUser (src/modules/onboarding/guard.ts) calls requireUser() first, then refuses a paused agency.
const AUTH_CALL = /\b(require(User|Agency|Admin)|activeUser)\s*\(/;

// Reachable without a login on purpose. Each entry says how it protects itself.
const PUBLIC: Record<string, string> = {
  "src/app/api/contact/route.ts": "public contact form, validated input",
  "src/app/api/public/compare/route.ts": "public free compare tool",
  "src/app/apps/go/[slug]/[[...source]]/route.ts": "public outbound app redirect, slug lookup only",
  "src/app/newsletter/go/[placement]/route.ts": "public newsletter signup redirect, placement lookup only",
  "src/app/api/public/newsletter/route.ts": "public newsletter impression log, no personal data",
  "src/app/auth/callback/route.ts": "OAuth and email-link callback",
  "src/app/auth/signout/route.ts": "signs out the current session",
  "src/app/api/stripe/webhook/route.ts": "Stripe signature check",
  "src/app/api/email/unsubscribe/route.ts": "signed unsubscribe token (B-61)",
  "src/app/r/[token]/route.ts": "report share link; the 256-bit token is the access check (B-59, D-90)",
  "src/app/api/alerts/check/route.ts": "pg_cron call, worker secret header (B-69)",
  "src/app/api/email/jobs/route.ts": "pg_cron call, worker secret header (B-62)",
  "src/app/api/dev/scan-worker/route.ts": "local pg_cron call, worker secret header; 404 in production (BUG-167)",
  "src/app/api/stripe/video-ads/checkout/route.ts": "public one-time checkout, server-side package price, rate limited per IP",
  "src/app/api/stripe/video-ads/brief/route.ts": "public brief, Stripe session must be paid",
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const targets = walk(join(ROOT, "src"))
  .filter((path) => /\/(route|actions)\.tsx?$/.test(path))
  .map((path) => relative(ROOT, path))
  .sort();

const missing = targets.filter(
  (file) => !(file in PUBLIC) && !AUTH_CALL.test(readFileSync(join(ROOT, file), "utf8")),
);
const stalePublic = Object.keys(PUBLIC).filter((file) => !targets.includes(file));

for (const file of missing) console.log(`FAIL ${file}: no requireUser(), requireAgency() or requireAdmin() call and not listed as public`);
for (const file of stalePublic) console.log(`FAIL ${file}: listed as public but the file no longer exists`);

console.log(`\nChecked ${targets.length} route and action files, ${Object.keys(PUBLIC).length} public.`);
process.exit(missing.length || stalePublic.length ? 1 : 0);
