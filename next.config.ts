import type { NextConfig } from "next";
// Validates environment variables at build time; a missing required one stops the build.
import "./src/lib/env";

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
  async redirects() {
    return [
      ...CUT_PAGES.map((source) => ({ source, destination: "/", permanent: true })),
      { source: "/sales/:path*", destination: "/", permanent: true },
      { source: "/how-it-works", destination: "/#how-it-works", permanent: true },
      { source: "/admin/:path*", destination: "/internal/admin", permanent: true },
      { source: "/dashboard/direct-agent", destination: "/dashboard", permanent: true },
      { source: "/dashboard/agent-readiness", destination: "/dashboard", permanent: true },
      {
        source: "/book",
        destination: "https://calendar.app.google/muM2Kqc8oYnWBPXXA",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "phhczohqidgrvcmszets.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "wsxusvapciexemfvtadm.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Allow any https domain for business logo_url (user-supplied URLs)
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
