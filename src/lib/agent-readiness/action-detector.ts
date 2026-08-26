import "server-only";
import type { ActionType, AgentAction, Confidence } from "./types";
import { ACTION_LABELS, WEBMCP_TOOL_NAMES } from "./types";

/**
 * Action Detector
 *
 * Detects which customer-facing actions exist on a business website by
 * inspecting publicly visible HTML. We only detect what is literally present
 * in the markup — we never invent actions the site doesn't have.
 */

interface DetectionSignal {
  patterns: RegExp[];
  pageUrlHints?: RegExp[];    // URL patterns that suggest this page has the action
  confidence: Confidence;
  evidence: (match: string, pageUrl: string) => string;
}

// Signals for each action type
const DETECTION_SIGNALS: Partial<Record<ActionType, DetectionSignal>> = {
  contact_business: {
    confidence: "high",
    patterns: [
      /type=["']tel["']/i,                          // phone input
      /href=["']tel:/i,                              // tel: link
      /<form[^>]*contact/i,                         // form with "contact" in attrs
      /id=["'][^"']*contact[^"']*["']/i,
      /class=["'][^"']*contact[^"']*["']/i,
      /action=["'][^"']*contact[^"']*["']/i,
      /placeholder=["'][^"']*your\s*(name|email|message)/i,
      /name=["'](name|full.?name|email|message|phone)["']/i,
    ],
    evidence: (_, url) => `A contact form or phone link was detected${url ? ` on ${url}` : ""}.`,
  },

  request_quote: {
    confidence: "high",
    patterns: [
      /request\s*(a\s*)?quote/i,
      /get\s*(a\s*)?quote/i,
      /free\s*(estimate|quote)/i,
      /id=["'][^"']*quote[^"']*["']/i,
      /class=["'][^"']*quote[^"']*["']/i,
      /action=["'][^"']*quote[^"']*["']/i,
      /get.?estimate/i,
      /request.?estimate/i,
    ],
    pageUrlHints: [/quote|estimate|pricing/i],
    evidence: (_, url) => `A quote/estimate request form was detected${url ? ` on ${url}` : ""}.`,
  },

  book_appointment: {
    confidence: "high",
    patterns: [
      /book\s*(an?\s*)?appointment/i,
      /schedule\s*(an?\s*)?appointment/i,
      /schedule\s*(an?\s*)?visit/i,
      /calendly\.com/i,
      /acuityscheduling\.com/i,
      /squarespace\.com\/bookings/i,
      /book\s+now/i,
      /book\s+online/i,
      /id=["'][^"']*booking[^"']*["']/i,
      /class=["'][^"']*booking[^"']*["']/i,
    ],
    pageUrlHints: [/book|appoint|schedul/i],
    evidence: (_, url) => `A booking or appointment scheduling option was detected${url ? ` on ${url}` : ""}.`,
  },

  make_reservation: {
    confidence: "high",
    patterns: [
      /make\s*(a\s*)?reservation/i,
      /book\s*(a\s*)?table/i,
      /opentable\.com/i,
      /resy\.com/i,
      /yelp\.com\/reservations/i,
      /id=["'][^"']*reserv[^"']*["']/i,
    ],
    pageUrlHints: [/reserv/i],
    evidence: (_, url) => `A reservation system was detected${url ? ` on ${url}` : ""}.`,
  },

  search_services: {
    confidence: "medium",
    patterns: [
      /type=["']search["']/i,
      /role=["']search["']/i,
      /<input[^>]*placeholder=["'][^"']*search[^"']*["']/i,
      /<form[^>]*search/i,
    ],
    evidence: (_, url) => `A search or filter form was detected${url ? ` on ${url}` : ""}.`,
  },

  search_products: {
    confidence: "medium",
    patterns: [
      /add\s*to\s*(cart|bag)/i,
      /shopify/i,
      /woocommerce/i,
      /product[_-]?id/i,
      /sku=/i,
      /type=["']search["']/i,
    ],
    pageUrlHints: [/product|shop|store|catalog/i],
    evidence: (_, url) => `A product catalog or shopping functionality was detected${url ? ` on ${url}` : ""}.`,
  },

  check_service_area: {
    confidence: "medium",
    patterns: [
      /service\s*(area|region|zip)/i,
      /do\s*we\s*(serve|cover)/i,
      /check\s*(if|your)\s*(we\s*)?(serve|service)/i,
      /enter\s*(your\s*)?zip/i,
      /type=["']zip["']/i,
      /placeholder=["'][^"']*zip\s*code[^"']*["']/i,
    ],
    evidence: (_, url) => `A service area check form was detected${url ? ` on ${url}` : ""}.`,
  },

  purchase_product: {
    confidence: "high",
    patterns: [
      /add\s*to\s*(cart|bag)/i,
      /buy\s*now/i,
      /checkout/i,
      /proceed\s*to\s*(checkout|payment)/i,
      /stripe\.com/i,
      /paypal\.com/i,
      /square\.com/i,
    ],
    evidence: (_, url) => `A purchase or checkout flow was detected${url ? ` on ${url}` : ""}.`,
  },

  submit_application: {
    confidence: "medium",
    patterns: [
      /apply\s*(now|online|here)/i,
      /submit\s*(an?\s*)?application/i,
      /start\s*(an?\s*)?application/i,
      /id=["'][^"']*appli[^"']*["']/i,
    ],
    pageUrlHints: [/apply|application/i],
    evidence: (_, url) => `An application form was detected${url ? ` on ${url}` : ""}.`,
  },

  get_support: {
    confidence: "medium",
    patterns: [
      /live\s*chat/i,
      /chat\s*(with\s*us|support|now)/i,
      /support\s*(ticket|form|request)/i,
      /intercom\.io/i,
      /zendesk\.com/i,
      /freshdesk\.com/i,
      /hubspot.*chat/i,
    ],
    evidence: (_, url) => `A support chat or ticketing system was detected${url ? ` on ${url}` : ""}.`,
  },

  view_menu: {
    confidence: "high",
    patterns: [
      /view\s*(our\s*)?menu/i,
      /see\s*(our\s*)?menu/i,
      /full\s*menu/i,
      /menu\.pdf/i,
      /download.*menu/i,
      /online\s*menu/i,
    ],
    pageUrlHints: [/menu/i],
    evidence: (_, url) => `A menu or food/service listing was detected${url ? ` on ${url}` : ""}.`,
  },

  order_food: {
    confidence: "high",
    patterns: [
      /order\s*(online|now|food)/i,
      /doordash\.com/i,
      /ubereats\.com/i,
      /grubhub\.com/i,
      /toasttab\.com/i,
      /olo\.com/i,
      /start\s*(your\s*)?order/i,
    ],
    evidence: (_, url) => `An online food ordering integration was detected${url ? ` on ${url}` : ""}.`,
  },

  find_location: {
    confidence: "medium",
    patterns: [
      /find\s*(a\s*)?location/i,
      /store\s*locator/i,
      /location\s*finder/i,
      /find\s*(us|our\s*store)/i,
      /google\.com\/maps/i,
      /maps\.apple\.com/i,
    ],
    evidence: (_, url) => `A store locator or location finder was detected${url ? ` on ${url}` : ""}.`,
  },
};

/**
 * Run all action detectors against the page HTML and URL.
 * Returns a map of action_type → detected info for actions that were found.
 */
export function detectActions(
  html: string,
  pageUrl: string,
): Map<ActionType, { confidence: Confidence; evidence: string }> {
  const found = new Map<ActionType, { confidence: Confidence; evidence: string }>();

  for (const [actionType, signal] of Object.entries(DETECTION_SIGNALS) as [ActionType, DetectionSignal][]) {
    if (!signal) continue;

    // Check URL hint first (fast path)
    const urlMatches = signal.pageUrlHints?.some((p) => p.test(pageUrl));

    // Check HTML patterns
    const matchingPattern = signal.patterns.find((p) => p.test(html));

    if (matchingPattern || urlMatches) {
      // Upgrade confidence if both URL hint AND HTML pattern match
      let confidence: Confidence = signal.confidence;
      if (urlMatches && matchingPattern) {
        confidence = "high";
      } else if (urlMatches && !matchingPattern) {
        confidence = "low";
      }
      found.set(actionType, {
        confidence,
        evidence: signal.evidence(matchingPattern?.source ?? "", pageUrl),
      });
    }
  }

  return found;
}

/**
 * Given a detected actions map and a list of recommended actions for this
 * business type, build the full AgentAction array.
 */
export function buildActionList(
  detected: Map<ActionType, { confidence: Confidence; evidence: string }>,
  recommended: ActionType[],
  businessName: string,
  domain: string,
  webmcpToolNames: Set<string>,
): AgentAction[] {
  const actions: AgentAction[] = [];

  // Emit all recommended action types (whether detected or not)
  for (const actionType of recommended) {
    const det = detected.get(actionType);
    const isDetected = !!det;
    const toolName = WEBMCP_TOOL_NAMES[actionType];
    const isWebMCPReady = webmcpToolNames.has(toolName);
    const label = ACTION_LABELS[actionType];

    let evidence: string | null = null;
    let recommendation: string | null = null;

    if (isDetected && isWebMCPReady) {
      evidence = det.evidence;
      recommendation = null; // Already agent-ready
    } else if (isDetected && !isWebMCPReady) {
      evidence = det.evidence;
      recommendation = `This action exists on your website but is not yet exposed as a structured WebMCP tool. Compatible AI agents can't invoke it reliably. Adding a \`${toolName}\` WebMCP tool pointing at the existing form/page would make it agent-ready.`;
    } else {
      evidence = `No ${label.toLowerCase()} form or link was confidently detected on the publicly accessible pages scanned.`;
      recommendation = `Consider adding a clear ${label.toLowerCase()} flow to your website and exposing it as a \`${toolName}\` WebMCP tool so compatible agents can direct users to it.`;
    }

    actions.push({
      action_type: actionType,
      label,
      page_url: null,
      detected: isDetected,
      webmcp_ready: isWebMCPReady,
      confidence: det?.confidence ?? null,
      evidence,
      recommendation: isDetected && isWebMCPReady ? null : recommendation,
      recommended_tool_name: toolName,
      claude_prompt: buildClaudePrompt({
        actionType,
        label,
        toolName,
        businessName,
        domain,
        detected: isDetected,
        webmcpReady: isWebMCPReady,
        evidence: evidence ?? "",
      }),
    });
  }

  return actions;
}

interface ClaudePromptInput {
  actionType: ActionType;
  label: string;
  toolName: string;
  businessName: string;
  domain: string;
  detected: boolean;
  webmcpReady: boolean;
  evidence: string;
}

function buildClaudePrompt(input: ClaudePromptInput): string {
  const { actionType, label, toolName, businessName, domain, detected, webmcpReady, evidence } = input;

  if (webmcpReady) {
    return [
      `I'm working on improving the AI Agent Readiness of ${businessName} (${domain}).`,
      "",
      `Context (from Customers.Direct scan — use only this evidence, do not invent facts):`,
      evidence,
      "",
      `The \`${toolName}\` WebMCP tool is already detected on the website. Help me review or improve it:`,
      `- Verify the tool name follows the WebMCP spec (\`${toolName}\`)`,
      `- Suggest improvements to the tool description to make it clearer for AI agents`,
      `- Recommend any missing input schema fields for a \`${toolName}\` action`,
      `- Ensure the tool does NOT bypass security, payment confirmation, or CAPTCHA`,
      `- Ensure human users are not affected — the existing UI should remain unchanged`,
      "",
      `Only use the WebMCP APIs and patterns from the current emerging spec. Do not invent non-existent APIs.`,
    ].join("\n");
  }

  if (detected) {
    return [
      `I'm working on making ${businessName} (${domain}) ready for compatible AI agents using WebMCP.`,
      "",
      `Context (from Customers.Direct scan — use only this evidence, do not invent facts):`,
      evidence,
      "",
      `The "${label}" action already exists on the website, but it is not yet exposed as a WebMCP tool.`,
      ``,
      `Please help me expose the existing ${actionType.replace(/_/g, " ")} functionality as a WebMCP tool:`,
      `- Tool name: \`${toolName}\``,
      `- Do NOT rebuild the existing form or backend — expose what already exists`,
      `- The WebMCP tool should surface the existing form/page to compatible AI agents`,
      `- Preserve all security requirements (CAPTCHA, validation, auth where applicable)`,
      `- For sensitive actions (purchases, payments, applications), require human confirmation — do not auto-submit`,
      `- Do not expose private APIs, internal endpoints, or authentication tokens`,
      `- Preserve the existing human-first interface exactly as-is`,
      `- Provide the implementation using the current WebMCP standard (declarative HTML annotation or manifest)`,
      `- Include instructions for testing that the tool is detectable and functional`,
      "",
      `Important: use only real information about this business provided above. Never invent URLs, phone numbers, service details, or credentials.`,
    ].join("\n");
  }

  // Not detected — recommend adding the action + WebMCP
  return [
    `I'm working on making ${businessName} (${domain}) ready for compatible AI agents using WebMCP.`,
    "",
    `Context (from Customers.Direct scan — use only this evidence, do not invent facts):`,
    evidence,
    "",
    `The "${label}" action does not appear to exist on this website yet. I'd like guidance on:`,
    `1. Whether and how to add a ${actionType.replace(/_/g, " ")} feature to this type of business website`,
    `2. How to expose it as a \`${toolName}\` WebMCP tool once it exists`,
    ``,
    `Requirements:`,
    `- Only recommend functionality that makes sense for this type of business`,
    `- Any new forms or flows should preserve standard security practices`,
    `- For sensitive actions (purchases, payments), require user confirmation — never auto-execute`,
    `- Provide the WebMCP tool implementation once the underlying functionality exists`,
    `- Use only the current WebMCP standard — do not invent APIs`,
    "",
    `Only use real information about this business that I have provided above.`,
  ].join("\n");
}
