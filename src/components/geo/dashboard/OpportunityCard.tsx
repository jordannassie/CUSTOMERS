"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Wrench, X, Loader2 } from "lucide-react";
import type { Opportunity } from "@/types/geo";
import { ImpactBadge } from "./ui";

const CATEGORY_LABELS: Record<string, string> = {
  content: "Content",
  service_page: "Service Page",
  technical: "Technical",
  structured_data: "Structured Data",
  entity_consistency: "Entity Consistency",
  citations: "Citations",
  reviews_reputation: "Reviews & Reputation",
  local_presence: "Local Presence",
  competitor_gap: "Competitor Gap",
};

export default function OpportunityCard({ opportunity, businessId }: { opportunity: Opportunity; businessId: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function copyForClaude() {
    if (opportunity.claude_prompt) {
      await navigator.clipboard.writeText(opportunity.claude_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function requestFix() {
    setRequesting(true);
    try {
      const res = await fetch("/api/geo/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId, opportunity_id: opportunity.id }),
      });
      if (res.ok) {
        setRequested(true);
        router.refresh();
      }
    } finally {
      setRequesting(false);
    }
  }

  async function dismiss() {
    setUpdating(true);
    try {
      await fetch(`/api/geo/opportunities/${opportunity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  const isOpen = opportunity.status === "open";

  return (
    <div className="bg-white border border-[#E5E5E1] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <ImpactBadge impact={opportunity.impact} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A3A3A0]">
              {CATEGORY_LABELS[opportunity.category] ?? opportunity.category}
            </span>
            {!isOpen && (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
                {opportunity.status.replace("_", " ")}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-[#171717] text-[15px]">{opportunity.title}</h3>
        </div>
      </div>

      <p className="text-[13px] text-[#777773] mb-3">{opportunity.description}</p>

      <div className="bg-[#FAFAF8] border border-[#EEEEEA] rounded-lg px-4 py-3 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A3A3A0] mb-1">Evidence</p>
        <p className="text-[12px] text-[#777773]">{opportunity.evidence}</p>
      </div>

      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A3A3A0] mb-1">Recommended action</p>
        <p className="text-[13px] text-[#171717]">{opportunity.recommended_action}</p>
      </div>

      {isOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyForClaude}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#777773] bg-[#F5F5F2] border border-[#E5E5E1] px-3.5 py-2 rounded-lg hover:bg-[#EEEEEA] transition-colors"
          >
            {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
            {copied ? "Copied!" : "Copy for Claude"}
          </button>
          <button
            type="button"
            onClick={requestFix}
            disabled={requesting || requested}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#171717] px-3.5 py-2 rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-60 active:scale-[0.97]"
          >
            {requesting ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Wrench size={12} aria-hidden="true" />}
            {requested ? "Requested" : "Request Fix"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={updating}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#A3A3A0] px-3 py-2 rounded-lg hover:text-[#777773] hover:bg-[#F5F5F2] transition-colors ml-auto disabled:opacity-60"
          >
            <X size={12} aria-hidden="true" />
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
