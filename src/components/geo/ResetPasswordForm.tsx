"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LOGO = "/images/logos/logo-black.png";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Redirect to dashboard after successful reset
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-[420px]">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" aria-label="Customers.Direct — Home">
          <Image
            src={LOGO}
            alt="Customers.Direct"
            width={148}
            height={36}
            priority
            unoptimized
            className="h-14 w-auto mx-auto"
          />
        </Link>
      </div>

      <div
        className="bg-white rounded-2xl border border-[#E5E5E1] p-8"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)" }}
      >
        <h1 className="text-[20px] font-bold text-[#171717] mb-1">Set new password</h1>
        <p className="text-[13px] text-[#777773] mb-6">
          Choose a strong password for your Customers.Direct account.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-semibold text-[#777773] uppercase tracking-wide mb-1.5"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#E5E5E1] rounded-lg px-3.5 py-2.5 text-[13px] text-[#171717] bg-white placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#171717]/10 focus:border-[#171717] transition-colors"
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="block text-[11px] font-semibold text-[#777773] uppercase tracking-wide mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-[#E5E5E1] rounded-lg px-3.5 py-2.5 text-[13px] text-[#171717] bg-white placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#171717]/10 focus:border-[#171717] transition-colors"
              placeholder="Repeat password"
            />
          </div>

          {error && (
            <div
              className="text-[12px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#171717] text-white font-semibold py-2.5 rounded-lg hover:bg-[#2A2A2A] transition-colors text-[13px] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight size={13} aria-hidden="true" />
            )}
            {loading ? "Updating…" : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
