"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuthFormProps {
  mode: "login" | "signup";
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.2z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.5 27 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.9 39.6 16.4 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.4C41.5 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z"
    />
  </svg>
);

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  // The callback route (src/app/auth/callback/route.ts) redirects back here
  // with ?error=... when Google sign-in fails server-side (most commonly an
  // invalid/stale Google OAuth Client Secret on the Supabase provider config,
  // or the account not being added as a Google test user yet). Without this,
  // the redirect landed on a clean login form with no feedback at all — it
  // looked like clicking "Continue with Google" simply did nothing. Read it
  // via a lazy useState initializer (not an effect) so it's ready on first
  // render, and SSR-safe since `window` is guarded.
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

  // Clean the error params out of the URL so a refresh doesn't re-show them.
  // Pure side effect on the external history API — no setState here.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_callback_failed") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function handleGoogle() {
    setError(null);
    setLoading("google");
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(null);
    }
    // On success, the browser is redirected to Google — no further action here.
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
        "Check your email to confirm your account. If email confirmation is disabled for this project, you can log in immediately.",
      );
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(null);
    if (loginError) {
      setError(loginError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-10" style={{ boxShadow: "0 8px 40px rgba(15,23,42,0.08)" }}>
        <h1 className="text-2xl font-black text-[#0F172A] mb-1.5">
          {isSignup ? "Check your AI visibility" : "Welcome back"}
        </h1>
        <p className="text-sm text-[#64748B] mb-7">
          {isSignup
            ? "Create your Customers.Direct account to get started."
            : "Log in to your Customers.Direct dashboard."}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-full py-3 font-semibold text-sm text-[#0F172A] hover:bg-gray-50 transition-colors disabled:opacity-60 mb-5"
        >
          {loading === "google" ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-px bg-gray-100 flex-1" />
          <span className="text-xs text-[#94A3B8] font-medium">or</span>
          <div className="h-px bg-gray-100 flex-1" />
        </div>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              placeholder="you@business.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold py-3.5 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm disabled:opacity-60"
          >
            {loading === "email" && <Loader2 size={16} className="animate-spin" />}
            {isSignup ? "Create Account" : "Log In"}
          </button>
        </form>

        <p className="text-center text-sm text-[#64748B] mt-6">
          {isSignup ? (
            <>Already have an account? <Link href="/login" className="font-semibold text-[#2563EB]">Log in</Link></>
          ) : (
            <>Don&apos;t have an account? <Link href="/signup" className="font-semibold text-[#2563EB]">Sign up</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
