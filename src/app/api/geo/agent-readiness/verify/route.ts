import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { detectWebMCP } from "@/lib/agent-readiness/webmcp-detector";
import { detectActions } from "@/lib/agent-readiness/action-detector";
import type { ActionType } from "@/lib/agent-readiness/types";
import { WEBMCP_TOOL_NAMES } from "@/lib/agent-readiness/types";

/**
 * POST /api/geo/agent-readiness/verify
 * Body: { action_id: string }
 *
 * Re-scans the relevant page/domain to check whether a specific action
 * is now WebMCP-ready. Updates the action's verification_status.
 */
export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { action_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const actionId = typeof body.action_id === "string" ? body.action_id : "";
  if (!actionId) {
    return NextResponse.json({ error: "action_id is required." }, { status: 400 });
  }

  // Load the action and verify ownership via business
  const { data: action } = await supabase
    .from("agent_readiness_actions")
    .select("*, businesses!inner(owner_user_id, domain, name, industry, description)")
    .eq("id", actionId)
    .maybeSingle();

  if (!action) {
    return NextResponse.json({ error: "Action not found." }, { status: 404 });
  }

  const biz = action.businesses as { owner_user_id: string; domain: string; name: string; industry: string; description: string };
  if (biz.owner_user_id !== user!.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (!biz.domain) {
    return NextResponse.json({ error: "No website configured for this business." }, { status: 422 });
  }

  const websiteUrl = biz.domain.startsWith("http") ? biz.domain : `https://${biz.domain}`;
  const parsed = new URL(websiteUrl);
  const baseUrl = `${parsed.protocol}//${parsed.hostname}`;

  // Fetch the page
  let html = "";
  try {
    const res = await fetch(websiteUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CustomersDirectAgentScanner/1.0; +https://customers.direct)",
      },
    });
    if (res.ok) html = await res.text();
  } catch {
    html = "";
  }

  // Run detectors
  const [webmcp, detectedActions] = await Promise.all([
    detectWebMCP(html, baseUrl),
    Promise.resolve(detectActions(html, websiteUrl)),
  ]);

  const actionType = action.action_type as ActionType;
  const toolName = WEBMCP_TOOL_NAMES[actionType] ?? actionType;

  // Check if this specific action is now WebMCP-ready
  const webmcpToolNames = new Set(webmcp.tools.map((t) => t.name));
  const nowWebMCPReady = webmcpToolNames.has(toolName);
  const nowDetected = detectedActions.has(actionType);

  const newStatus = nowWebMCPReady ? "verified" : "failed";

  const service = createServiceClient();
  await service
    .from("agent_readiness_actions")
    .update({
      verification_status: newStatus,
      webmcp_ready: nowWebMCPReady,
      detected: nowDetected || action.detected,
      verified_at: new Date().toISOString(),
    })
    .eq("id", actionId);

  // If verified, resolve the matching opportunity
  if (nowWebMCPReady) {
    await service
      .from("opportunities")
      .update({ status: "resolved" })
      .eq("business_id", action.business_id)
      .eq("category", "agent_readiness")
      .ilike("title", `%${action.label}%`)
      .eq("status", "open");
  }

  return NextResponse.json({
    verified: nowWebMCPReady,
    action_type: actionType,
    webmcp_detected: webmcp.detected,
    webmcp_tools: webmcp.tools.map((t) => t.name),
  });
}
