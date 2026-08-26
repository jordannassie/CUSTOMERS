import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/public/compare
 *
 * Public (no auth) website comparison endpoint.
 * Analyzes two domains using website signals and returns an AI Readiness Score
 * for each. Rate limited to prevent abuse.
 *
 * The score is computed from real HTML signals — never fabricated.
 * Full AI visibility (ChatGPT/Claude/Perplexity scans) requires signup.
 */

// ─── Rate limiter ──────────────────────────────────────────────────────────

const rateMap = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 6;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= MAX_PER_HOUR) return false;
  entry.count++;
  return true;
}

// ─── URL helpers ───────────────────────────────────────────────────────────

function normalizeUrl(input: string): string {
  const s = input.trim();
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function extractDomain(raw: string): string {
  try {
    return new URL(normalizeUrl(raw)).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function assertSafeUrl(raw: string): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Only http/https");
  const h = parsed.hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost"))
    throw new Error("Private URL");
  if (h === "169.254.169.254" || h === "metadata.google.internal") throw new Error("Private URL");
  if (/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === "0.0.0.0")
    throw new Error("Private URL");
}

// ─── Website signal analysis ───────────────────────────────────────────────

export interface WebsiteSignals {
  domain: string;
  accessible: boolean;
  title: string;
  description: string;
  schemaTypes: string[];
  hasLocalBusiness: boolean;
  h1Count: number;
  h2Count: number;
  wordCount: number;
  hasPhone: boolean;
  hasAddress: boolean;
  hasContactForm: boolean;
  hasReviews: boolean;
  aiReadinessScore: number;
}

function emptySignals(domain: string): WebsiteSignals {
  return {
    domain, accessible: false, title: "", description: "",
    schemaTypes: [], hasLocalBusiness: false, h1Count: 0, h2Count: 0,
    wordCount: 0, hasPhone: false, hasAddress: false,
    hasContactForm: false, hasReviews: false, aiReadinessScore: 0,
  };
}

async function analyzeWebsite(rawUrl: string): Promise<WebsiteSignals> {
  const url = normalizeUrl(rawUrl);
  const domain = extractDomain(rawUrl);

  try { assertSafeUrl(url); } catch { return emptySignals(domain); }

  let html = "";
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(9_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CustomersDirectScanner/1.0; +https://customers.direct)",
      },
    });
    if (res.ok) html = await res.text();
  } catch {
    return emptySignals(domain);
  }

  if (!html) return emptySignals(domain);

  // ── Extract signals ────────────────────────────────────────────────────

  const title = (html.match(/<title[^>]*>([^<]{1,160})<\/title>/i)?.[1] ?? "").trim();
  const description = (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})/i)?.[1] ?? ""
  ).trim();

  // Schema.org types in JSON-LD or microdata
  const schemaMatches = [...html.matchAll(/"@type"\s*:\s*"([^"]{2,60})"/g)];
  const schemaTypes = [...new Set(schemaMatches.map((m) => m[1]))];
  const LOCAL_BUSINESS_TYPES = [
    "LocalBusiness", "Restaurant", "MedicalBusiness", "LegalService",
    "HomeAndConstructionBusiness", "HealthAndBeautyBusiness", "Organization",
    "AutoRepair", "DentistOffice", "Plumber", "RoofingContractor", "Gym",
    "HairSalon", "Store", "FoodEstablishment", "AccountingService",
  ];
  const hasLocalBusiness = schemaTypes.some((t) =>
    LOCAL_BUSINESS_TYPES.some((lb) => t.includes(lb))
  );

  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  const h2Count = (html.match(/<h2[\s>]/gi) ?? []).length;

  const text = html.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const wordCount = text.split(" ").filter((w) => w.length > 3).length;

  const hasPhone = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(html);
  const hasAddress = /itemprop=["']streetAddress["']|class=["'][^"']*address[^"']*["']|<address[\s>]/i.test(html);
  const hasContactForm = /<form[\s\S]{0,2000}(contact|quote|book|inquiry|request|appointment)/i.test(html);
  const hasReviews = /(review|testimonial|rating|star)s?/i.test(html.substring(0, 60_000));

  // ── Score (0-100) ──────────────────────────────────────────────────────
  let score = 0;
  if (title.length > 15)             score += 8;
  if (description.length > 60)       score += 8;
  if (schemaTypes.length > 0)        score += 18;
  if (hasLocalBusiness)              score += 12;
  if (h1Count === 1)                 score += 8;
  if (h2Count >= 2)                  score += 6;
  if (wordCount > 400)               score += 10;
  else if (wordCount > 150)          score += 5;
  if (hasPhone)                      score += 8;
  if (hasAddress)                    score += 8;
  if (hasContactForm)                score += 7;
  if (hasReviews)                    score += 7;

  return {
    domain, accessible: true, title, description, schemaTypes,
    hasLocalBusiness, h1Count, h2Count, wordCount, hasPhone,
    hasAddress, hasContactForm, hasReviews,
    aiReadinessScore: Math.min(100, score),
  };
}

// ─── Insight generator ─────────────────────────────────────────────────────

function generateInsights(mine: WebsiteSignals, them: WebsiteSignals): string[] {
  const insights: string[] = [];
  if (!them.accessible) return ["We couldn't reach their website — check the URL and try again."];

  if (them.schemaTypes.length > mine.schemaTypes.length) {
    insights.push(
      them.hasLocalBusiness
        ? "Their site uses business schema markup — AI platforms use this to recommend local businesses"
        : "Their site has more structured data, making it easier for AI to understand and cite"
    );
  }
  if (them.wordCount > mine.wordCount * 1.4) {
    insights.push("Their website has more in-depth content that AI uses when answering buyer questions");
  }
  if (them.hasLocalBusiness && !mine.hasLocalBusiness) {
    insights.push(
      "They have LocalBusiness schema markup — a key signal AI search uses for local recommendations"
    );
  }
  if (them.hasReviews && !mine.hasReviews) {
    insights.push("Their reviews and social proof are visible to AI crawlers; yours aren't easily found");
  }
  if (them.hasContactForm && !mine.hasContactForm) {
    insights.push("Their site exposes clear service actions (quote/booking forms) that AI agents can reference");
  }
  if (them.h2Count > mine.h2Count + 2) {
    insights.push("Their page headings give AI clearer signals about what services and questions they answer");
  }
  // Generic fallback
  if (insights.length === 0) {
    if (them.aiReadinessScore > mine.aiReadinessScore) {
      insights.push("Their website is generally better structured for AI discovery");
    } else {
      insights.push("Both sites have similar AI readiness — a full scan will reveal deeper gaps");
    }
  }
  return insights.slice(0, 3);
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many comparisons. Please try again in an hour." },
      { status: 429 }
    );
  }

  let body: { myUrl?: unknown; competitorUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const myRaw = typeof body.myUrl === "string" ? body.myUrl.trim() : "";
  const themRaw = typeof body.competitorUrl === "string" ? body.competitorUrl.trim() : "";

  if (!myRaw) return NextResponse.json({ error: "Enter a valid website." }, { status: 400 });
  if (!themRaw) return NextResponse.json({ error: "Enter a different competitor website." }, { status: 400 });

  const myDomain = extractDomain(myRaw);
  const themDomain = extractDomain(themRaw);

  if (myDomain === themDomain) {
    return NextResponse.json(
      { error: "Enter a different competitor website." },
      { status: 400 }
    );
  }

  // Validate URLs
  try { assertSafeUrl(normalizeUrl(myRaw)); } catch {
    return NextResponse.json({ error: "Enter a valid website." }, { status: 400 });
  }
  try { assertSafeUrl(normalizeUrl(themRaw)); } catch {
    return NextResponse.json({ error: "Enter a valid competitor website." }, { status: 400 });
  }

  // Run both analyses in parallel
  const [mine, them] = await Promise.all([analyzeWebsite(myRaw), analyzeWebsite(themRaw)]);

  const diff = them.aiReadinessScore - mine.aiReadinessScore;
  const leader: "you" | "competitor" | "tie" =
    diff > 3 ? "competitor" : diff < -3 ? "you" : "tie";

  const insights = generateInsights(mine, them);

  return NextResponse.json({ mine, them, diff, leader, insights });
}
