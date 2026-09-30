"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-next";
import { AuthAlert, AuthCard, AuthField, AuthLogo, authLinkClass } from "./auth-bits";

const MIN_PASSWORD = 8;

interface AuthFormProps {
  defaultMode?: "login" | "signup";
  notice?: string;
  // The page's ?error= value; read on the server so the notice is in the first render.
  errorParam?: string;
}

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.2z" />
    <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.5 27 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.9 39.6 16.4 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.4C41.5 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z" />
  </svg>
);

// The page the visitor asked for before being sent to log in (BUG-009). A plan picked on the pricing
// page (?plan=) is carried into onboarding, which keeps it for the card step (MVP_SPEC 3.1 step 0).
function nextFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan");
  const fallback = plan === "starter" || plan === "pro" ? `/onboarding?plan=${plan}` : undefined;
  return safeNextPath(params.get("next"), fallback);
}

export default function AuthForm({ defaultMode = "login", errorParam = "", notice }: AuthFormProps) {
  const router = useRouter();
  const oauthFailed = errorParam.includes("oauth") || errorParam.includes("callback");
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [googleFailed, setGoogleFailed] = useState(oauthFailed);
  const [error, setError] = useState<string | null>(oauthFailed ? "google_failed" : null);
  const [message, setMessage] = useState<string | null>(notice ?? null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  // Which fields the form alert is about, so they are marked invalid and point at it.
  const [invalid, setInvalid] = useState<"email" | "password" | "both" | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const isSignup = mode === "signup";

  useEffect(() => {
    if (oauthFailed) window.history.replaceState(null, "", window.location.pathname);
  }, [oauthFailed]);

  // Clear form state when switching tabs
  function switchMode(next: "login" | "signup") {
    setMode(next);
    setEmail("");
    setPassword("");
    setError(null);
    setMessage(null);
    setPasswordError(null);
    setInvalid(null);
  }

  async function handleGoogle() {
    setError(null);
    setLoading("google");
    const supabase = createClient();
    const next = nextFromUrl();
    // Always use the canonical production URL so the OAuth redirect URI
    // matches what is registered in Google Cloud Console / Supabase,
    // and so the PKCE code-verifier cookie is on the correct domain.
    const siteBase =
      env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      window.location.origin;
    const callbackUrl = `${siteBase}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (oauthError) {
      setGoogleFailed(true);
      setLoading(null);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPasswordError(null);
    setInvalid(null);
    if (password.length < MIN_PASSWORD) {
      setPasswordError("Password must be at least 8 characters.");
      passwordRef.current?.focus();
      return;
    }
    setLoading("email");
    const supabase = createClient();

    if (isSignup) {
      const siteBase =
        env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
        window.location.origin;
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteBase}/auth/callback?next=${encodeURIComponent(nextFromUrl())}`,
        },
      });
      setLoading(null);
      if (signupError) {
        const msg = signupError.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
          setError("An account with this email already exists. Try logging in instead.");
          setInvalid("email");
        } else if (msg.includes("password")) {
          setPasswordError("Password must be at least 8 characters.");
          passwordRef.current?.focus();
        } else {
          setError("Unable to create account. Please try again.");
        }
        return;
      }
      // With email confirmation off, signUp already returns a session.
      if (data.session) {
        router.push(nextFromUrl());
        router.refresh();
        return;
      }
      setMessage("Check your email to confirm your account.");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (loginError) {
      const msg = loginError.message.toLowerCase();
      if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("password") || msg.includes("email")) {
        setError("Email or password is incorrect.");
        setInvalid("both");
      } else if (msg.includes("not found") || msg.includes("no user")) {
        setError("No account found with that email.");
        setInvalid("email");
      } else {
        setError("Unable to log in. Please try again.");
      }
      return;
    }
    router.push(nextFromUrl());
    router.refresh();
  }

  const alertId = "auth-alert";
  const emailInvalid = invalid === "email" || invalid === "both";
  const passwordInvalid = invalid === "password" || invalid === "both";

  return (
    <div className="w-full max-w-[420px]">
      <AuthLogo />

      <AuthCard>
        <div className="flex border-b border-border">
          {(["login", "signup"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchMode(tab)}
              className={`-mb-px flex-1 border-b-2 py-3.5 text-sm font-medium transition-colors duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset ${
                mode === tab
                  ? "border-primary bg-surface text-foreground"
                  : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={mode === tab}
            >
              {tab === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="mb-1 text-xl font-semibold tracking-[-0.02em]">
            {isSignup ? "Check your AI visibility" : "Welcome back"}
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {isSignup
              ? "Create your Customers.Direct account to get started."
              : "Log in to your Customers.Direct dashboard."}
          </p>

          {googleFailed && (
            <div className="mb-4">
              <AuthAlert tone="warning">
                <p className="font-semibold">Sign-in couldn&apos;t complete. Please try again.</p>
                <p className="mt-1">
                  Google authentication succeeded, but the session couldn&apos;t be saved.
                  This is usually temporary.{" "}
                  <button type="button" onClick={handleGoogle} className="font-semibold underline hover:no-underline">
                    Retry with Google
                  </button>{" "}
                  or{" "}
                  <Link href="/contact?topic=support" className="font-semibold underline hover:no-underline">
                    contact support
                  </Link>.
                </p>
              </AuthAlert>
            </div>
          )}

          <Button type="button" variant="outline" size="lg" onClick={handleGoogle} disabled={loading !== null} className="w-full bg-surface">
            {loading === "google" ? <Loader2 className="animate-spin text-muted-foreground" aria-hidden="true" /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[13px] text-muted-foreground">or continue with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
            <AuthField
              id="email"
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              invalid={emailInvalid}
              aria-describedby={emailInvalid ? alertId : undefined}
            />
            <AuthField
              ref={passwordRef}
              id="password"
              label="Password"
              type="password"
              required
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={isSignup ? "At least 8 characters" : undefined}
              error={passwordError}
              invalid={passwordInvalid}
              aria-describedby={passwordInvalid ? alertId : undefined}
              aside={
                !isSignup && (
                  <Link href="/forgot-password" className={authLinkClass}>
                    Forgot password?
                  </Link>
                )
              }
            />

            {error && error !== "google_failed" && (
              <AuthAlert id={alertId} tone="error">
                {error}
              </AuthAlert>
            )}
            {message && <AuthAlert tone="success">{message}</AuthAlert>}

            <Button type="submit" size="lg" disabled={loading !== null} className="w-full">
              {loading === "email" && <Loader2 className="animate-spin" aria-hidden="true" />}
              {isSignup ? "Create account" : "Log in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            Having trouble signing in?{" "}
            <Link href="/contact?topic=support" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
              Contact support
            </Link>
          </p>
        </div>
      </AuthCard>

      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        7-day free trial. Credit card required.
      </p>
    </div>
  );
}
