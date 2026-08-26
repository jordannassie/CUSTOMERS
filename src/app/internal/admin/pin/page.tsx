"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function AdminPinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/internal/admin/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/internal/admin");
        router.refresh();
      } else if (res.status === 429) {
        setError("Too many attempts. Please wait and try again.");
      } else {
        setError(data.error ?? "Incorrect PIN");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#0866F5]/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={20} className="text-[#0866F5]" />
          </div>
          <h1 className="text-[18px] font-bold text-white">Admin Access</h1>
          <p className="text-[12px] text-white/40 mt-1">Enter your admin PIN to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            required
            autoFocus
            className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-[15px] text-center tracking-[0.3em] placeholder:tracking-normal placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#0866F5]/40 focus:border-[#0866F5]/50"
          />

          {error && (
            <p className="text-[12px] text-red-400 text-center" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pin}
            className="flex items-center justify-center gap-2 bg-[#0866F5] text-white font-semibold py-3 rounded-xl hover:bg-[#0755D4] transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Enter Admin
          </button>
        </form>
      </div>
    </main>
  );
}
