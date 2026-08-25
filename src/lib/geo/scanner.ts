import "server-only";
import type { ScanResult } from "@/types/geo";

/**
 * Server-side website scanner. Deliberately deterministic — it extracts
 * only what's literally present in the page's HTML (title, meta tags,
 * Open Graph tags, JSON-LD Organization/LocalBusiness data). It never
 * invents a business name, industry, or location: any field it can't find
 * comes back null and the user fills it in during onboarding.
 */

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

function extractMeta(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const decoded = match[1]
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
      if (decoded) return decoded;
    }
  }
  return null;
}

interface JsonLdOrg {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  logo?: string | { url?: string };
  address?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
}

function extractJsonLd(html: string): JsonLdOrg | null {
  const scriptMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of scriptMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidates = Array.isArray(parsed) ? parsed : parsed["@graph"] ?? [parsed];
      for (const candidate of candidates) {
        const type = candidate?.["@type"];
        const typeStr = Array.isArray(type) ? type.join(",") : String(type ?? "");
        if (/organization|localbusiness|corporation/i.test(typeStr)) {
          return candidate as JsonLdOrg;
        }
      }
    } catch {
      // Malformed JSON-LD — skip rather than guess.
      continue;
    }
  }
  return null;
}

export async function scanWebsite(rawUrl: string): Promise<ScanResult> {
  const url = normalizeUrl(rawUrl);
  const domain = new URL(url).hostname.replace(/^www\./, "");

  let html = "";
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CustomersDirectScanner/1.0; +https://customers.direct)",
      },
    });
    if (response.ok) {
      html = await response.text();
    }
  } catch {
    // Fetch failed (blocked, timed out, DNS, etc.) — fall through with an
    // empty scan rather than throwing, so onboarding never dead-ends.
    html = "";
  }

  const jsonLd = html ? extractJsonLd(html) : null;

  const ogTitle = html
    ? extractMeta(html, [/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i])
    : null;
  const titleTag = html ? extractMeta(html, [/<title[^>]*>([^<]+)<\/title>/i]) : null;

  const name = jsonLd?.name?.trim() || ogTitle || titleTag?.split(/[\|\-–]/)[0]?.trim() || null;

  const description = html
    ? jsonLd?.description ||
      extractMeta(html, [
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      ])
    : null;

  const logoUrl = html
    ? (typeof jsonLd?.logo === "string" ? jsonLd.logo : jsonLd?.logo?.url) ||
      extractMeta(html, [/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i])
    : null;

  return {
    name,
    domain,
    description: description ? description.slice(0, 500) : null,
    industry: null, // never guessed — user selects this during onboarding
    city: jsonLd?.address?.addressLocality?.trim() || null,
    region: jsonLd?.address?.addressRegion?.trim() || null,
    country: jsonLd?.address?.addressCountry?.trim() || null,
    logoUrl: logoUrl || null,
    confidence: "deterministic",
  };
}
