"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LOGO = "/images/logos/logo-black.png";

interface AuthFormProps {
  defaultMode?: "login" | "signup";
}

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.2z" />
    <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.5 27 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.9 39.6 16.4 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.4C41.5 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z" />
  </svg>
);

export default function AuthForm({ defaultMode = "login" }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") !== "auth_callback_failed") return null;
    const reason = params.get("reason");
    return reason
      ? `Sign-in failed: ${reason}. This usually means the Google connection isn't fully set up yet — try email/password instead, or contact support.`
      : "Sign-in failed. This usually means the Google connection isn't fully set up yet — try email/password instead, or contact support.";
  });
  const [message, setMessage] = useState<string | null>(null);

  const isSignup = mode === "signup";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_callback_failed") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Clear form state when switching tabs
  function switchMode(next: "login" | "signup") {
    setMode(next);
    setEmail("");
    setPassword("");
    setError(null);
    setMessage(null);
  }

  async function handleGoogle() {
    setError(null);
    setLoading("google");
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") ?? "/dashboard";
    // Always use the canonical production URL so the OAuth redirect URI
    // matches what is registered in Google Cloud Console / Supabase,
    // and so the PKCE code-verifier cookie is on the correct domain.
    const siteBase =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      window.location.origin;
    const callbackUrl = `${siteBase}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(null);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading("email");
    const supabase = createClient();

    if (isSignup) {
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoading(null);
      if (signupError) {
        setError(signupError.message);
        return;
      }
      setMessage(
        "Check your email to confirm your account. If email confirmation is disabled, you can log in immediately.",
      );
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (loginError) {
      setError(loginError.message);
      return;
    }
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

      {/* Card */}
      <div
        className="bg-white rounded-2xl border border-[#E5E5E1] overflow-hidden"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)" }}
      >
        {/* ── Tab switcher ──────────────────────────────────────────────── */}
        <div className="flex border-b border-[#E5E5E1]">
          {(["login", "signup"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchMode(tab)}
              className={`flex-1 py-3.5 text-[13px] font-semibold transition-colors ${
                mode === tab
                  ? "text-[#171717] bg-white border-b-2 border-[#171717] -mb-px"
                  : "text-[#A3A3A0] bg-[#FAFAF8] hover:text-[#777773]"
              }`}
              aria-pressed={mode === tab}
            >
              {tab === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        <div className="p-8">
          {/* Headline */}
          <h1 className="text-[20px] font-bold text-[#171717] mb-1">
            {isSignup ? "Check your AI visibility" : "Welcome back"}
          </h1>
          <p className="text-[13px] text-[#777773] mb-7">
            {isSignup
              ? "Create your Customers.Direct account to get started."
              : "Log in to your Customers.Direct dashboard."}
          </p>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2.5 bg-white border border-[#E5E5E1] rounded-lg py-2.5 text-[13px] font-medium text-[#171717] hover:bg-[#F5F5F2] hover:border-[#D4D4CF] transition-colors disabled:opacity-60 mb-5 active:scale-[0.98]"
          >
            {loading === "google" ? (
              <Loader2 size={16} className="animate-spin text-[#777773]" aria-hidden="true" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px bg-[#EEEEEA] flex-1" />
            <span className="text-[11px] text-[#A3A3A0] font-medium">or continue with email</span>
            <div className="h-px bg-[#EEEEEA] flex-1" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-[11px] font-semibold text-[#777773] uppercase tracking-wide mb-1.5">
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[11px] font-semibold text-[#777773] uppercase tracking-wide">
                  Password
                </label>
                {!isSignup && (
                  <Link href="/forgot-password" className="text-[11px] text-[#A3A3A0] hover:text-[#777773] transition-colors">
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#E5E5E1] rounded-lg px-3.5 py-2.5 text-[13px] text-[#171717] bg-white placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#171717]/10 focus:border-[#171717] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-[12px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="text-[12px] text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3.5 py-2.5" role="status">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-2 bg-[#171717] text-white font-semibold py-2.5 rounded-lg hover:bg-[#2A2A2A] transition-colors text-[13px] disabled:opacity-60 active:scale-[0.98]"
            >
              {loading === "email" && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {isSignup ? "Create Account" : "Log In"}
              {loading !== "email" && <ArrowRight size={13} aria-hidden="true" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
