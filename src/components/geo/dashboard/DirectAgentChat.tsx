"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "agent";
  text: string;
}

const SUGGESTIONS = [
  "Why is my Direct Score what it is?",
  "What's the single highest-impact thing I should fix?",
  "How do I compare to my tracked competitors?",
];

export default function DirectAgentChat({
  businessId,
  initialQuestion,
}: {
  businessId: string;
  initialQuestion?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loadingRef.current) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/geo/direct-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId, question: trimmed }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: res.ok ? data.answer : data.error ?? "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "agent", text: "Something went wrong reaching the Direct Agent." }]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [businessId]);

  // Auto-send initial question from ?q= URL param
  useEffect(() => {
    if (initialQuestion && !sentInitial.current) {
      sentInitial.current = true;
      send(initialQuestion);
    }
  }, [initialQuestion, send]);

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E1] flex flex-col h-[560px]">
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-[#FAFAF8]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-10">
            <div className="w-12 h-12 rounded-xl bg-[#171717] flex items-center justify-center mb-4">
              <Bot size={20} className="text-white" aria-hidden="true" />
            </div>
            <p className="font-semibold text-[#171717] mb-1">Ask the Direct Agent</p>
            <p className="text-[13px] text-[#777773] max-w-sm mb-5">
              Grounded in your business&apos;s real visibility data — it labels evidence separately from inference.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[13px] text-left border border-[#E5E5E1] bg-white rounded-lg px-4 py-2.5 text-[#171717] hover:bg-[#F5F5F2] hover:border-[#D4D4CF] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.role === "user" ? "bg-[#171717]" : "bg-white border border-[#E5E5E1]"
              }`}
            >
              {m.role === "user"
                ? <User size={14} className="text-white" aria-hidden="true" />
                : <Bot size={14} className="text-[#777773]" aria-hidden="true" />
              }
            </div>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-[13px] whitespace-pre-wrap leading-relaxed ${
                m.role === "user"
                  ? "bg-[#171717] text-white rounded-tr-sm"
                  : "bg-white border border-[#E5E5E1] text-[#171717] rounded-tl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-[#E5E5E1] flex items-center justify-center shrink-0">
              <Bot size={14} className="text-[#777773]" aria-hidden="true" />
            </div>
            <div className="bg-white border border-[#E5E5E1] rounded-xl rounded-tl-sm px-4 py-3">
              <Loader2 size={14} className="animate-spin text-[#A3A3A0]" aria-label="Loading response" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-[#E5E5E1] p-4 flex gap-2 bg-white"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your AI visibility…"
          className="flex-1 border border-[#E5E5E1] rounded-lg px-3.5 py-2.5 text-[13px] text-[#171717] bg-[#FAFAF8] placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#171717]/10 focus:border-[#171717] transition-colors"
          aria-label="Message to Direct Agent"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-[#171717] text-white hover:bg-[#2A2A2A] disabled:opacity-60 transition-colors active:scale-[0.97]"
          aria-label="Send message"
        >
          <Send size={14} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
