import type { NextConfig } from "next";
// Validates environment variables at build time; a missing required one stops the build.
import { env } from "./src/lib/env";
import { securityHeaders } from "./src/lib/security-headers";

const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);

// Products cut from the MVP (D-04); old links and search results land on the homepage.
const CUT_PAGES = [
  "/ai-employee",
  "/ai-phone",
  "/dm-ads",
  "/customer-acquisition",
  "/ads",
  "/call-bar",
  "/sales",
  "/home-2",
  "/ai-search",
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Dev logs are kept by every worker session, so nothing secret goes in them (BUG-I).
  logging: {
    // Server Function arguments include passwords (change email, change password).
    serverFunctions: false,
    // Share links, auth codes and unsubscribe links carry their secret in the URL.
    incomingRequests: { ignore: [/^\/r\//, /^\/auth\/callback/, /[?&](token|token_hash|code)=/] },
  },
  experimental: {
    // Agency logos are up to 2 MB (B-55); the default 1 MB limit would reject them before the action runs.
    serverActions: { bodySizeLimit: "3mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({ supabaseUrl: supabaseUrl.href, isDev: env.NODE_ENV === "development" }),
      },
      // Share pages (B-59): never indexed, and the token never leaves in a Referer header.
      // Listed after the global rule so its Referrer-Policy wins.
      {
        source: "/r/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      ...CUT_PAGES.map((source) => ({ source, destination: "/", permanent: true })),
      { source: "/sales/:path*", destination: "/", permanent: true },
      { source: "/how-it-works", destination: "/#how-it-works", permanent: true },
      { source: "/admin/:path*", destination: "/internal/admin", permanent: true },
      // Old admin pages merged into Agencies (B-65).
      ...["accounts", "users", "billing"].map((page) => ({
        source: `/internal/admin/${page}`,
        destination: "/internal/admin/agencies",
        permanent: true,
      })),
      { source: "/dashboard/direct-agent", destination: "/dashboard", permanent: true },
      { source: "/dashboard/agent-readiness", destination: "/dashboard", permanent: true },
      // Visibility and Reports were merged into the Overview (B-58).
      { source: "/dashboard/visibility", destination: "/dashboard", permanent: true },
      { source: "/dashboard/reports", destination: "/dashboard", permanent: true },
      { source: "/dashboard/settings", destination: "/settings", permanent: true },
      { source: "/dashboard/billing/:path*", destination: "/settings/billing", permanent: true },
      { source: "/dashboard/competitors", destination: "/competitors", permanent: true },
      { source: "/dashboard/prompts", destination: "/questions", permanent: true },
      {
        source: "/book",
        destination: "https://calendar.app.google/muM2Kqc8oYnWBPXXA",
        permanent: false,
      },
    ];
  },
  images: {
    // Only our own storage (SEC-06); an open pattern lets anyone use our image optimizer as a proxy.
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol === "http:" ? "http" : "https",
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
