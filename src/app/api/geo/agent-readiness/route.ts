import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { scanAgentReadiness } from "@/lib/agent-readiness/scanner";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET  /api/geo/agent-readiness?business_id=...
 *   Returns the latest completed agent readiness scan for a business.
 *
 * POST /api/geo/agent-readiness
 *   Body: { business_id: string }
 *   Triggers a new agent readiness scan for the business's domain.
 */

export async function GET(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const businessId = request.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "business_id is required." }, { status: 400 });
  }

  // Verify ownership
  const { data: business } = await supabase
    .from("businesses")
    .select("id, domain")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  // Fetch latest completed scan
  const service = createServiceClient();
  let scan = null;
  try {
    const { data } = await service
      .from("agent_readiness_scans")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    scan = data;
  } catch {
    // Table may not exist yet if migration 013 hasn't been applied
    return NextResponse.json({ scan: null, actions: [], pending_migration: true });
  }

  if (!scan) {
    return NextResponse.json({ scan: null, actions: [] });
  }

  const { data: actions } = await service
    .from("agent_readiness_actions")
    .select("*")
    .eq("scan_id", scan.id)
    .order("detected", { ascending: false });

  return NextResponse.json({ scan, actions: actions ?? [] });
}

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { business_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const businessId = typeof body.business_id === "string" ? body.business_id : "";
  if (!businessId) {
    return NextResponse.json({ error: "business_id is required." }, { status: 400 });
  }

  // Verify ownership and get business data
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, domain, industry, description")
    .eq("id", businessId)
    .eq("owner_user_id", user!.id)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  if (!business.domain) {
    return NextResponse.json(
      { error: "This business has no website configured. Add a website in Settings first." },
      { status: 422 },
    );
  }

  // Simple cooldown: don't scan if a scan completed in the last 5 minutes
  const service = createServiceClient();
  const { data: recent } = await service
    .from("agent_readiness_scans")
    .select("id, created_at, status")
    .eq("business_id", businessId)
    .in("status", ["completed", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    const ageMs = Date.now() - new Date(recent.created_at).getTime();
    if (recent.status === "running") {
      return NextResponse.json({ error: "A scan is already running." }, { status: 429 });
    }
    if (ageMs < 5 * 60 * 1000) {
      return NextResponse.json({ error: "Please wait a few minutes before rescanning." }, { status: 429 });
    }
  }

  // Create a pending scan record
  const { data: scanRecord, error: insertError } = await service
    .from("agent_readiness_scans")
    .insert({
      business_id: businessId,
      domain: business.domain,
      status: "running",
    })
    .select()
    .single();

  if (insertError || !scanRecord) {
    console.error("[agent-readiness] failed to create scan record:", insertError);
    return NextResponse.json({ error: "Could not start scan." }, { status: 500 });
  }

  try {
    const websiteUrl = business.domain.startsWith("http")
      ? business.domain
      : `https://${business.domain}`;

    const result = await scanAgentReadiness(websiteUrl, {
      name: business.name,
      industry: business.industry,
      description: business.description,
    });

    // Update scan record
    await service
      .from("agent_readiness_scans")
      .update({
        status: "completed",
        readiness_status: result.readiness_status,
        readiness_score: result.readiness_score,
        webmcp_detected: result.webmcp_detected,
        webmcp_tool_count: result.webmcp_tool_count,
        actions_detected: result.actions_detected,
        actions_ready: result.actions_ready,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanRecord.id);

    // Insert action records
    if (result.actions.length > 0) {
      await service.from("agent_readiness_actions").insert(
        result.actions.map((a) => ({
          scan_id: scanRecord.id,
          business_id: businessId,
          action_type: a.action_type,
          label: a.label,
          page_url: a.page_url,
          detected: a.detected,
          webmcp_ready: a.webmcp_ready,
          confidence: a.confidence,
          evidence: a.evidence,
          recommendation: a.recommendation,
          recommended_tool_name: a.recommended_tool_name,
          claude_prompt: a.claude_prompt,
        })),
      );
    }

    // Auto-generate agent_readiness opportunities for unready actions
    await generateReadinessOpportunities(service, businessId, business.name, business.domain, result);

    // Return complete result
    const { data: savedActions } = await service
      .from("agent_readiness_actions")
      .select("*")
      .eq("scan_id", scanRecord.id)
      .order("detected", { ascending: false });

    const { data: savedScan } = await service
      .from("agent_readiness_scans")
      .select("*")
      .eq("id", scanRecord.id)
      .single();

    return NextResponse.json({ scan: savedScan, actions: savedActions ?? [] });
  } catch (error) {
    console.error("[agent-readiness] scan failed:", error);

    await service
      .from("agent_readiness_scans")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanRecord.id);

    return NextResponse.json({ error: "Scan failed. Please try again." }, { status: 500 });
  }
}

async function generateReadinessOpportunities(
  service: ReturnType<typeof createServiceClient>,
  businessId: string,
  businessName: string,
  domain: string,
  result: Awaited<ReturnType<typeof scanAgentReadiness>>,
) {
  // Close existing open agent_readiness opportunities (stale after rescan)
  await service
    .from("opportunities")
    .update({ status: "resolved" })
    .eq("business_id", businessId)
    .eq("category", "agent_readiness")
    .eq("status", "open");

  const opportunities = [];

  // One opportunity per unready detected action (high impact — action exists but not WebMCP)
  for (const action of result.actions) {
    if (action.detected && !action.webmcp_ready) {
      opportunities.push({
        business_id: businessId,
        title: `Make "${action.label}" agent-ready`,
        description: `Your website has a ${action.label.toLowerCase()} feature, but it's not accessible to compatible AI agents. Exposing it as a \`${action.recommended_tool_name}\` WebMCP tool would let AI agents guide users directly to this action.`,
        evidence: action.evidence,
        impact: "high",
        category: "agent_readiness",
        affected_url: action.page_url,
        recommended_action: action.recommendation,
        claude_prompt: action.claude_prompt,
      });
    }
  }

  // One opportunity per recommended-but-undetected action (medium impact)
  for (const action of result.actions) {
    if (!action.detected) {
      opportunities.push({
        business_id: businessId,
        title: `Add "${action.label}" for AI agents`,
        description: `Compatible AI agents look for a structured ${action.label.toLowerCase()} action on your website, but none was detected. Adding this would improve your AI Agent Readiness score.`,
        evidence: action.evidence,
        impact: "medium",
        category: "agent_readiness",
        affected_url: null,
        recommended_action: action.recommendation,
        claude_prompt: action.claude_prompt,
      });
    }
  }

  // WebMCP not detected at all
  if (!result.webmcp_detected && result.actions.some((a) => a.detected)) {
    opportunities.push({
      business_id: businessId,
      title: "Add WebMCP support to your website",
      description: `Your website has ${result.actions_detected} detectable action(s), but none are exposed as WebMCP tools. Adding WebMCP support would make ${businessName} accessible to compatible AI agents and agentic browsers.`,
      evidence: `WebMCP not detected on ${domain}. ${result.actions_detected} business action(s) detected on the page.`,
      impact: "high",
      category: "agent_readiness",
      affected_url: null,
      recommended_action:
        "Add a WebMCP manifest to your website exposing the existing business actions as structured tools compatible AI agents can discover and use.",
      claude_prompt: [
        `I'm working on making ${businessName} (${domain}) ready for compatible AI agents using WebMCP.`,
        "",
        `Context: ${result.actions_detected} business action(s) were detected on the website, but no WebMCP support was found.`,
        "",
        "Please help me add WebMCP support to this website:",
        "- Explain the current WebMCP standard options (declarative HTML, well-known manifest, JavaScript)",
        "- Recommend the simplest approach for a small business website",
        `- Provide a starter WebMCP manifest covering the detected actions`,
        "- Ensure no security, authentication, or payment flows are bypassed",
        "- Preserve the existing human-first website interface",
        "- Include testing instructions to verify the implementation is detectable",
      ].join("\n"),
    });
  }

  if (opportunities.length > 0) {
    await service.from("opportunities").insert(opportunities);
  }
}
