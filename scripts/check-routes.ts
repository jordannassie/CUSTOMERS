// Checks that kept routes load and removed routes redirect (B-03).
// Usage: node scripts/check-routes.ts [baseUrl]   (default http://localhost:3000)

export {};

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

// Public pages must return 200; signed-in areas may redirect to /login instead.
const KEPT_PUBLIC = ["/", "/pricing", "/agency", "/compare", "/contact", "/login", "/signup", "/privacy", "/terms", "/forgot-password", "/sitemap.xml", "/robots.txt"];
const KEPT_PRIVATE = ["/dashboard", "/dashboard/visibility", "/dashboard/reports", "/dashboard/seo", "/internal/admin", "/internal/admin/news"];

const REMOVED: Record<string, string> = {
  "/ai-employee": "/",
  "/ai-phone": "/",
  "/dm-ads": "/",
  "/customer-acquisition": "/",
  "/ads": "/",
  "/call-bar": "/",
  "/sales": "/",
  "/sales/dashboard": "/",
  "/home-2": "/",
  "/ai-search": "/",
  "/how-it-works": "/#how-it-works",
  "/admin": "/internal/admin",
  "/admin/prospecting": "/internal/admin",
  "/dashboard/direct-agent": "/dashboard",
  "/dashboard/agent-readiness": "/dashboard",
};

async function head(path: string) {
  const res = await fetch(base + path, { redirect: "manual" });
  const location = res.headers.get("location");
  return { status: res.status, location: location ? location.replace(base, "") : null };
}

let failed = 0;
function report(ok: boolean, line: string) {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${line}`);
}

for (const path of KEPT_PUBLIC) {
  const { status } = await head(path);
  report(status === 200, `${path} -> ${status}`);
}

for (const path of KEPT_PRIVATE) {
  const { status, location } = await head(path);
  const ok = status === 200 || (status >= 300 && status < 400 && location?.startsWith("/login") === true);
  report(ok, `${path} -> ${status}${location ? ` ${location}` : ""}`);
}

for (const [path, target] of Object.entries(REMOVED)) {
  const { status, location } = await head(path);
  report(status === 308 && location === target, `${path} -> ${status} ${location ?? ""} (want 308 ${target})`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll route checks passed");
process.exit(failed ? 1 : 0);
