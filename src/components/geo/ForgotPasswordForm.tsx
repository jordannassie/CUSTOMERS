"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LOGO = "/images/logos/logo-black.png";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
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
        {sent ? (
          <div className="text-center">
            <CheckCircle size={32} className="text-green-500 mx-auto mb-3" aria-hidden="true" />
            <h1 className="text-[18px] font-bold text-[#171717] mb-2">Check your email</h1>
            <p className="text-[13px] text-[#777773] mb-6 leading-relaxed">
              We sent a password reset link to <strong>{email}</strong>. Click the link in the
              email to set a new password.
            </p>
            <Link
              href="/login"
              className="text-[12px] text-[#777773] hover:text-[#171717] transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft size={12} /> Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[20px] font-bold text-[#171717] mb-1">Reset password</h1>
            <p className="text-[13px] text-[#777773] mb-6 leading-snug">
              Enter your account email and we&apos;ll send a reset link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-semibold text-[#777773] uppercase tracking-wide mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#E5E5E1] rounded-lg px-3.5 py-2.5 text-[13px] text-[#171717] bg-white placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#171717]/10 focus:border-[#171717] transition-colors"
                  placeholder="you@business.com"
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
                {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                Send reset link
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link
                href="/login"
                className="text-[12px] text-[#A3A3A0] hover:text-[#777773] transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} /> Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
