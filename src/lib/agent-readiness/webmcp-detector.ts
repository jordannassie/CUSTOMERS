import "server-only";
import type { WebMCPDetectionResult, WebMCPTool } from "./types";

/**
 * WebMCP Detector
 *
 * WebMCP is an emerging standard for exposing structured website tools to
 * compatible AI agents and agentic browsers. Support is still evolving.
 *
 * This detector is intentionally modular so it can be updated as the spec matures.
 * We look for these signals (in order of confidence):
 *
 * 1. <link rel="webmcp" href="..."> — declarative manifest link
 * 2. <script type="application/webmcp+json"> — inline manifest
 * 3. <meta name="webmcp" content="..."> — meta tag annotation
 * 4. /.well-known/webmcp.json — well-known discovery endpoint
 * 5. JavaScript patterns: window.WebMCP or navigator.mcp usage in script tags
 */

function parseTools(raw: unknown): WebMCPTool[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;

  // { tools: [...] }  OR  { actions: [...] }
  const list = Array.isArray(obj.tools) ? obj.tools : Array.isArray(obj.actions) ? obj.actions : [];
  return list
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t) => ({
      name: typeof t.name === "string" ? t.name : "unknown",
      description: typeof t.description === "string" ? t.description : undefined,
      inputSchema: typeof t.inputSchema === "object" && t.inputSchema !== null
        ? (t.inputSchema as Record<string, unknown>)
        : undefined,
      hasConfirmation: typeof t.confirmation === "boolean" ? t.confirmation : undefined,
    }));
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Attempt to fetch the well-known WebMCP manifest for a domain.
 * This is a separate fetch so it can fail gracefully.
 */
async function fetchWellKnown(baseUrl: string): Promise<{ tools: WebMCPTool[]; raw: string } | null> {
  try {
    const url = `${baseUrl}/.well-known/webmcp.json`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CustomersDirectAgentScanner/1.0; +https://customers.direct)" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    const parsed = tryParseJson(text);
    if (!parsed) return null;
    return { tools: parseTools(parsed), raw: text.slice(0, 2000) };
  } catch {
    return null;
  }
}

/**
 * Detect WebMCP signals in the given HTML and at the well-known endpoint.
 * This is the primary export — call it once per scan.
 */
export async function detectWebMCP(
  html: string,
  baseUrl: string,
): Promise<WebMCPDetectionResult> {
  // 1. <link rel="webmcp" href="...">
  const linkMatch = html.match(/<link[^>]+rel=["']webmcp["'][^>]*href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']webmcp["']/i);
  if (linkMatch?.[1]) {
    const manifestUrl = linkMatch[1].startsWith("http") ? linkMatch[1] : `${baseUrl}${linkMatch[1]}`;
    try {
      const res = await fetch(manifestUrl, {
        signal: AbortSignal.timeout(4_000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; CustomersDirectAgentScanner/1.0; +https://customers.direct)" },
      });
      if (res.ok) {
        const text = await res.text();
        const parsed = tryParseJson(text);
        const tools = parsed ? parseTools(parsed) : [];
        return { detected: true, source: "link", tools, manifestUrl, raw: text.slice(0, 2000) };
      }
    } catch {
      // Fall through
    }
  }

  // 2. Inline <script type="application/webmcp+json"> or <script type="webmcp/json">
  const scriptMatch = html.match(
    /<script[^>]+type=["'](application\/webmcp\+json|webmcp\/json)["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (scriptMatch?.[2]) {
    const parsed = tryParseJson(scriptMatch[2]);
    const tools = parsed ? parseTools(parsed) : [];
    if (tools.length > 0) {
      return { detected: true, source: "script", tools, raw: scriptMatch[2].slice(0, 2000) };
    }
  }

  // 3. <meta name="webmcp" content="..."> (simple presence signal, no tool info)
  if (/<meta[^>]+name=["']webmcp["']/i.test(html)) {
    return { detected: true, source: "meta", tools: [] };
  }

  // 4. /.well-known/webmcp.json
  const wellKnown = await fetchWellKnown(baseUrl);
  if (wellKnown) {
    return { detected: true, source: "well-known", tools: wellKnown.tools, raw: wellKnown.raw };
  }

  // 5. JavaScript patterns in inline scripts (heuristic, low-confidence)
  const jsPattern = /window\.WebMCP\s*=|navigator\.mcp\s*=|WebMCP\.register\s*\(|mcp\.tool\s*\(/;
  if (jsPattern.test(html)) {
    return { detected: true, source: "js-pattern", tools: [] };
  }

  return { detected: false, source: null, tools: [] };
}
