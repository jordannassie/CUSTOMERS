import type { AgentAction, ReadinessStatus } from "./types";

/**
 * Readiness Score
 *
 * Deterministic 0–100 score computed from scan evidence.
 * Formula is documented here as the single source of truth.
 *
 * Components (out of 100):
 *   40 pts — Action coverage: recommended actions that are detected (40 × detected/total)
 *   30 pts — WebMCP coverage: recommended actions that are WebMCP-ready (30 × ready/total)
 *   30 pts — WebMCP presence bonus: any WebMCP detected at all = 15 pts,
 *             ≥2 tools = 25 pts, ≥4 tools = 30 pts
 *
 * Status thresholds:
 *   0–24   → not_ready
 *   25–49  → needs_work
 *   50–74  → partially_ready
 *   75–100 → agent_ready
 */

export function computeReadinessScore(
  actions: AgentAction[],
  webmcpDetected: boolean,
  webmcpToolCount: number,
): { score: number; status: ReadinessStatus } {
  if (actions.length === 0) {
    const score = webmcpDetected ? 15 : 0;
    return { score, status: scoreToStatus(score) };
  }

  const total = actions.length;
  const detected = actions.filter((a) => a.detected).length;
  const ready = actions.filter((a) => a.webmcp_ready).length;

  // 40 pts: how many recommended actions exist on the site
  const actionCoverage = Math.round((detected / total) * 40);

  // 30 pts: how many of those are WebMCP-ready
  const webmcpCoverage = Math.round((ready / total) * 30);

  // 30 pts: WebMCP presence (tiered)
  let webmcpBonus = 0;
  if (webmcpDetected) {
    if (webmcpToolCount >= 4) webmcpBonus = 30;
    else if (webmcpToolCount >= 2) webmcpBonus = 25;
    else if (webmcpToolCount >= 1) webmcpBonus = 20;
    else webmcpBonus = 15; // detected but no tools enumerated
  }

  const score = Math.min(100, actionCoverage + webmcpCoverage + webmcpBonus);
  return { score, status: scoreToStatus(score) };
}

export function scoreToStatus(score: number): ReadinessStatus {
  if (score >= 75) return "agent_ready";
  if (score >= 50) return "partially_ready";
  if (score >= 25) return "needs_work";
  return "not_ready";
}

export function readinessStatusLabel(status: ReadinessStatus): string {
  switch (status) {
    case "agent_ready":     return "Agent Ready";
    case "partially_ready": return "Partially Ready";
    case "needs_work":      return "Needs Work";
    case "not_ready":       return "Not Ready";
  }
}

export function readinessStatusColor(status: ReadinessStatus): string {
  switch (status) {
    case "agent_ready":     return "text-emerald-700";
    case "partially_ready": return "text-amber-600";
    case "needs_work":      return "text-orange-600";
    case "not_ready":       return "text-red-600";
  }
}

export function readinessStatusBg(status: ReadinessStatus): string {
  switch (status) {
    case "agent_ready":     return "bg-emerald-50 border-emerald-200";
    case "partially_ready": return "bg-amber-50 border-amber-200";
    case "needs_work":      return "bg-orange-50 border-orange-200";
    case "not_ready":       return "bg-red-50 border-red-200";
  }
}
