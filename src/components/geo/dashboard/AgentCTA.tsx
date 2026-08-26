"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Copy, Loader2 } from "lucide-react";

interface Props {
  question: string;
  label?: string;
  variant?: "ghost" | "pill";
  claudePrompt?: string;
}

/**
 * Contextual Direct Agent CTA.
 * Navigates to /dashboard/direct-agent with the question pre-filled via a URL param.
 */
export function AgentCTA({ question, label, variant = "ghost" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function go() {
    setLoading(true);
    router.push(
      `/dashboard/direct-agent?q=${encodeURIComponent(question)}`,
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#777773] bg-white border border-[#E5E5E1] rounded-full px-3 py-1 hover:bg-[#F5F5F2] hover:border-[#D4D4CF] hover:text-[#171717] transition-colors disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={10} className="animate-spin" aria-hidden="true" />
        ) : (
          <Bot size={10} aria-hidden="true" />
        )}
        {label ?? "Ask Direct Agent"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={loading}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#777773] hover:text-[#171717] transition-colors disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={10} className="animate-spin" aria-hidden="true" />
      ) : (
        <Bot size={10} aria-hidden="true" />
      )}
      {label ?? "Ask Direct Agent"}
    </button>
  );
}

/**
 * "Fix with Claude" / "Copy for Claude" button.
 * Copies the pre-composed Claude prompt to the clipboard.
 */
export function FixWithClaude({ claudePrompt, label = "Fix with Claude" }: { claudePrompt: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(claudePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] rounded-full px-3 py-1 hover:bg-[#EDE9FE] transition-colors"
    >
      <Copy size={10} aria-hidden="true" />
      {copied ? "Copied!" : label}
    </button>
  );
}
