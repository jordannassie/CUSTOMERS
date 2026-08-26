"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, CheckCircle2, AlertCircle, XCircle, ExternalLink,
  Copy, Check, RefreshCw, Loader2, Zap, Info,
} from "lucide-react";
import type { AgentReadinessScan, AgentReadinessAction } from "@/lib/agent-readiness/types";
import {
  readinessStatusLabel,
  readinessStatusColor,
  readinessStatusBg,
} from "@/lib/agent-readiness/readiness-score";

interface Props {
  business: { id: string; name: string; domain: string | null };
  initialScan: AgentReadinessScan | null;
  initialActions: AgentReadinessAction[];
}

export default function AgentReadinessClient({ business, initialScan, initialActions }: Props) {
  const router = useRouter();
  const [scan, setScan] = useState<AgentReadinessScan | null>(initialScan);
  const [actions, setActions] = useState<AgentReadinessAction[]>(initialActions);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  async function runScan() {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch("/api/geo/agent-readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: business.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error ?? "Scan failed. Please try again.");
      } else {
        setScan(data.scan);
        setActions(data.actions ?? []);
      }
    } catch {
      setScanError("Network error. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  const hasScan = !!scan;
  const detectedCount = actions.filter((a) => a.detected).length;
  const readyCount = actions.filter((a) => a.webmcp_ready).length;
  const improvementCount = actions.filter((a) => !a.webmcp_ready).length;

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot size={18} className="text-[#0066FF]" />
            <h1 className="text-xl font-bold text-[#171717]">AI Agent Readiness</h1>
            <span className="text-[10px] font-semibold bg-[#0066FF] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">New</span>
          </div>
          <p className="text-[13px] text-[#777773]">
            {business.domain
              ? <>Scanning <span className="font-medium text-[#444440]">{business.domain}</span></>
              : "Add a website in Settings to check agent readiness."}
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning || !business.domain}
          className="flex items-center gap-2 bg-[#171717] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#2A2A2A] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {scanning ? "Scanning…" : hasScan ? "Rescan Website" : "Scan Website"}
        </button>
      </div>

      {scanError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-700">
          {scanError}
        </div>
      )}

      {/* No website */}
      {!business.domain && (
        <EmptyState
          icon={<XCircle size={28} className="text-[#CBCBC8]" />}
          title="No website configured"
          description="Add your business website in Settings to check whether AI agents can understand and use it."
          cta={{ label: "Go to Settings", href: "/dashboard/settings" }}
        />
      )}

      {/* No scan yet */}
      {business.domain && !hasScan && !scanning && (
        <EmptyState
          icon={<Bot size={28} className="text-[#0066FF]" />}
          title="See if AI agents can use your website"
          description="Customers.Direct will scan your website to detect contact forms, booking flows, quote requests, and more — then show you what's missing and create a Claude prompt to fix it."
          cta={{ label: "Scan Website", onClick: runScan }}
        />
      )}

      {/* Scanning in progress */}
      {scanning && (
        <div className="bg-[#F5F8FF] border border-[#C7D9FF] rounded-2xl p-8 flex flex-col items-center text-center gap-4">
          <Loader2 size={32} className="text-[#0066FF] animate-spin" />
          <div>
            <p className="font-semibold text-[#171717]">Scanning your website…</p>
            <p className="text-[13px] text-[#777773] mt-1">Detecting business actions and WebMCP support.</p>
          </div>
        </div>
      )}

      {/* Scan results */}
      {hasScan && !scanning && (
        <>
          {/* Score card */}
          <div className={`rounded-2xl border p-6 ${readinessStatusBg(scan!.readiness_status ?? "not_ready")}`}>
            <div className="flex items-start gap-6 flex-wrap">
              <div>
                <p className="text-[11px] font-semibold text-[#777773] uppercase tracking-wider mb-1">Readiness Score</p>
                <p className="text-5xl font-bold text-[#171717] leading-none">{scan!.readiness_score ?? 0}</p>
                <p className="text-[11px] text-[#777773] mt-1">out of 100</p>
              </div>
              <div className="flex-1 min-w-[180px]">
                <p className={`text-lg font-bold mb-3 ${readinessStatusColor(scan!.readiness_status ?? "not_ready")}`}>
                  {readinessStatusLabel(scan!.readiness_status ?? "not_ready")}
                </p>
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <Stat label="Actions Detected" value={detectedCount} />
                  <Stat label="Agent-Ready" value={readyCount} />
                  <Stat label="Improvements" value={improvementCount} />
                  <Stat
                    label="WebMCP"
                    value={scan!.webmcp_detected
                      ? `Detected (${scan!.webmcp_tool_count} tool${scan!.webmcp_tool_count !== 1 ? "s" : ""})`
                      : "Not detected"}
                    highlight={!scan!.webmcp_detected}
                  />
                </div>
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-5">
              <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0066FF] rounded-full transition-all duration-700"
                  style={{ width: `${scan!.readiness_score ?? 0}%` }}
                />
              </div>
            </div>

            {/* WebMCP disclosure */}
            <div className="mt-4 flex items-start gap-2 bg-white/50 rounded-lg p-3">
              <Info size={13} className="text-[#777773] mt-0.5 shrink-0" />
              <p className="text-[11px] text-[#777773] leading-relaxed">
                <strong className="text-[#444440]">WebMCP</strong> is an emerging web standard for exposing structured website tools to compatible AI agents and agentic browsers. Support is still evolving.{" "}
                <a href="https://webmcp.dev" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#0066FF]">Learn more</a>
              </p>
            </div>
          </div>

          {/* Action cards */}
          {actions.length > 0 && (
            <div>
              <h2 className="text-[15px] font-bold text-[#171717] mb-3">Website Actions</h2>
              <div className="space-y-3">
                {actions.map((action) => (
                  <ActionCard key={action.id} action={action} businessId={business.id} onVerified={(updated) => {
                    setActions((prev) => prev.map((a) => a.id === updated.id ? updated : a));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Last scanned */}
          <p className="text-[11px] text-[#AAAAAA] text-center">
            Last scanned {new Date(scan!.completed_at ?? scan!.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Stat({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[#999997] uppercase tracking-wide">{label}</p>
      <p className={`font-semibold ${highlight ? "text-orange-600" : "text-[#171717]"}`}>{value}</p>
    </div>
  );
}

function ActionCard({
  action,
  businessId,
  onVerified,
}: {
  action: AgentReadinessAction;
  businessId: string;
  onVerified: (updated: AgentReadinessAction) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"verified" | "failed" | null>(null);
  const [expanded, setExpanded] = useState(false);

  const isReady = action.webmcp_ready || action.verification_status === "verified";
  const isDetected = action.detected;
  const hasPrompt = !!action.claude_prompt;

  async function copyForClaude() {
    if (!action.claude_prompt) return;
    await navigator.clipboard.writeText(action.claude_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function verifyAction() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/geo/agent-readiness/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_id: action.id }),
      });
      const data = await res.json();
      const result = data.verified ? "verified" : "failed";
      setVerifyResult(result);
      onVerified({ ...action, verification_status: result, webmcp_ready: data.verified });
    } catch {
      setVerifyResult("failed");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className={`rounded-xl border bg-white p-4 transition-all ${
      isReady
        ? "border-emerald-200"
        : isDetected
        ? "border-amber-200"
        : "border-[#E5E5E1]"
    }`}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 shrink-0">
          {isReady ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : isDetected ? (
            <AlertCircle size={18} className="text-amber-500" />
          ) : (
            <XCircle size={18} className="text-[#CBCBC8]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-[14px] font-semibold text-[#171717]">{action.label}</h3>
              <span className={`text-[11px] font-medium ${
                isReady ? "text-emerald-600" : isDetected ? "text-amber-600" : "text-[#AAAAAA]"
              }`}>
                {isReady ? "Agent Ready" : isDetected ? "Needs Update" : "Not Detected"}
                {action.confidence && !isReady && ` · ${action.confidence} confidence`}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isReady && action.verification_status !== "verified" && (
                <button
                  onClick={verifyAction}
                  disabled={verifying}
                  className="flex items-center gap-1.5 text-[12px] font-medium border border-[#E5E5E1] px-3 py-1.5 rounded-lg hover:border-[#0066FF] hover:text-[#0066FF] transition-all disabled:opacity-50"
                >
                  {verifying ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  {verifying ? "Checking…" : "Verify Update"}
                </button>
              )}
              {hasPrompt && (
                <button
                  onClick={copyForClaude}
                  className="flex items-center gap-1.5 bg-[#171717] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg hover:bg-[#2A2A2A] transition-all"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied!" : isReady ? "Update with Claude" : "Fix with Claude"}
                </button>
              )}
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-[11px] text-[#777773] hover:text-[#171717] transition-colors"
              >
                {expanded ? "Hide" : "Details"}
              </button>
            </div>
          </div>

          {/* Verify result feedback */}
          {verifyResult && (
            <div className={`mt-2 text-[12px] rounded-lg px-3 py-2 ${
              verifyResult === "verified"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-orange-50 text-orange-700"
            }`}>
              {verifyResult === "verified"
                ? `✓ ${action.label} is now detected as agent-ready.`
                : `We still couldn't detect the ${action.recommended_tool_name ?? action.action_type} WebMCP tool. Try updating with Claude and recheck.`}
            </div>
          )}

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-[#F0F0EC] space-y-2">
              {action.evidence && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#AAAAAA] mb-1">Evidence</p>
                  <p className="text-[12px] text-[#555553]">{action.evidence}</p>
                </div>
              )}
              {action.recommendation && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#AAAAAA] mb-1">Recommendation</p>
                  <p className="text-[12px] text-[#555553]">{action.recommendation}</p>
                </div>
              )}
              {action.recommended_tool_name && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#AAAAAA] mb-1">WebMCP Tool Name</p>
                  <code className="text-[12px] bg-[#F5F5F3] px-2 py-0.5 rounded font-mono text-[#171717]">
                    {action.recommended_tool_name}
                  </code>
                </div>
              )}
              {action.page_url && (
                <div className="flex items-center gap-1.5">
                  <ExternalLink size={12} className="text-[#AAAAAA]" />
                  <a href={action.page_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#0066FF] hover:underline truncate">
                    {action.page_url}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="bg-white border border-[#E5E5E1] rounded-2xl p-10 flex flex-col items-center text-center gap-4">
      {icon}
      <div>
        <p className="font-semibold text-[#171717] mb-1">{title}</p>
        <p className="text-[13px] text-[#777773] max-w-[420px]">{description}</p>
      </div>
      {cta && (
        cta.href ? (
          <a
            href={cta.href}
            className="inline-flex items-center gap-2 bg-[#171717] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#2A2A2A] transition-all"
          >
            {cta.label}
          </a>
        ) : (
          <button
            onClick={cta.onClick}
            className="inline-flex items-center gap-2 bg-[#171717] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#2A2A2A] transition-all"
          >
            {cta.label}
          </button>
        )
      )}
    </div>
  );
}
