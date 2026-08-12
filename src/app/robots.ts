import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/sales", "/api/"],
      },
    ],
    sitemap: "https://customers.direct/sitemap.xml",
  };
}
