import "server-only";
import type { AgentReadinessScanResult } from "./types";
import { detectWebMCP } from "./webmcp-detector";
import { detectActions, buildActionList } from "./action-detector";
import { getRecommendedActions } from "./recommendations";
import { computeReadinessScore } from "./readiness-score";

/**
 * Agent Readiness Scanner
 *
 * Fetches the business website and runs all detection modules.
 * Reuses the SSRF guard pattern from the main website scanner.
 *
 * Returns a complete AgentReadinessScanResult or throws on unrecoverable error.
 */

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

/**
 * SSRF guard — mirrors src/lib/geo/scanner.ts exactly.
 * Rejects URLs pointing at private/loopback/metadata endpoints.
 */
function assertSafeUrl(raw: string): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  const host = parsed.hostname.toLowerCase();

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  ) {
    throw new Error("Private URL not allowed");
  }

  if (host === "169.254.169.254" || host === "metadata.google.internal") {
    throw new Error("Private URL not allowed");
  }

  if (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "0.0.0.0"
  ) {
    throw new Error("Private URL not allowed");
  }
}

export async function scanAgentReadiness(
  rawUrl: string,
  business: {
    name: string;
    industry: string | null;
    description: string | null;
  },
): Promise<AgentReadinessScanResult> {
  const url = normalizeUrl(rawUrl);
  assertSafeUrl(url);

  const domain = new URL(url).hostname.replace(/^www\./, "");
  // Base URL for well-known endpoint and relative link resolution
  const parsed = new URL(url);
  const baseUrl = `${parsed.protocol}//${parsed.hostname}`;

  // Fetch the page HTML
  let html = "";
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CustomersDirectAgentScanner/1.0; +https://customers.direct)",
      },
    });
    if (res.ok) {
      html = await res.text();
    }
  } catch {
    html = "";
  }

  // Run detectors in parallel
  const [webmcp, detectedActionsMap] = await Promise.all([
    detectWebMCP(html, baseUrl),
    Promise.resolve(detectActions(html, url)),
  ]);

  // Get recommended actions for this business type
  const recommended = getRecommendedActions(business.industry, business.description);

  // Build the WebMCP tool name set for fast lookup
  const webmcpToolNames = new Set(webmcp.tools.map((t) => t.name));

  // Build final action list
  const actions = buildActionList(
    detectedActionsMap,
    recommended,
    business.name,
    domain,
    webmcpToolNames,
  );

  // Compute score
  const { score, status } = computeReadinessScore(
    actions,
    webmcp.detected,
    webmcp.tools.length,
  );

  return {
    domain,
    readiness_score: score,
    readiness_status: status,
    webmcp_detected: webmcp.detected,
    webmcp_tool_count: webmcp.tools.length,
    actions_detected: actions.filter((a) => a.detected).length,
    actions_ready: actions.filter((a) => a.webmcp_ready).length,
    actions,
    webmcp,
  };
}
