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
    <div className="border border-gray-100 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <ImpactBadge impact={opportunity.impact} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
              {CATEGORY_LABELS[opportunity.category] ?? opportunity.category}
            </span>
            {!isOpen && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
                {opportunity.status.replace("_", " ")}
              </span>
            )}
          </div>
          <h3 className="font-bold text-[#0F172A]">{opportunity.title}</h3>
        </div>
      </div>

      <p className="text-sm text-[#64748B] mb-3">{opportunity.description}</p>

      <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl px-4 py-3 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-1">Evidence</p>
        <p className="text-xs text-[#475569]">{opportunity.evidence}</p>
      </div>

      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-1">Recommended action</p>
        <p className="text-sm text-[#0F172A]">{opportunity.recommended_action}</p>
      </div>

      {isOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyForClaude}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C3AED] bg-[#F5F3FF] border border-[#EDE9FE] px-3.5 py-2 rounded-full hover:bg-[#EDE9FE] transition-colors"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy for Claude"}
          </button>
          <button
            type="button"
            onClick={requestFix}
            disabled={requesting || requested}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#2563EB] px-3.5 py-2 rounded-full hover:bg-[#1d4ed8] transition-colors disabled:opacity-60"
          >
            {requesting ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />}
            {requested ? "Requested" : "Have Customers.Direct Fix It"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={updating}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] px-3 py-2 rounded-full hover:text-[#64748B] transition-colors ml-auto disabled:opacity-60"
          >
            <X size={13} />
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
