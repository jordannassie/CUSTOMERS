"use client";

import { useState, useRef, useEffect } from "react";
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

export default function DirectAgentChat({ businessId }: { businessId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
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
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-[560px]" style={{ boxShadow: "0 4px 20px rgba(15,23,42,0.05)" }}>
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center mb-4">
              <Bot size={22} className="text-white" />
            </div>
            <p className="font-bold text-[#0F172A] mb-1">Ask the Direct Agent</p>
            <p className="text-sm text-[#64748B] max-w-sm mb-5">
              Grounded in your business&apos;s real visibility data — it labels evidence separately from inference.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-sm text-left border border-gray-200 rounded-xl px-4 py-2.5 text-[#0F172A] hover:bg-gray-50 transition-colors"
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
                m.role === "user" ? "bg-[#0F172A]" : "bg-gradient-to-br from-[#2563EB] to-[#7C3AED]"
              }`}
            >
              {m.role === "user" ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
            </div>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-[#0F172A] text-white" : "bg-[#F8FAFC] text-[#0F172A]"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-[#F8FAFC] rounded-2xl px-4 py-3">
              <Loader2 size={15} className="animate-spin text-[#94A3B8]" />
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
        className="border-t border-gray-100 p-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your AI visibility…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8] disabled:opacity-60"
          aria-label="Send"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
