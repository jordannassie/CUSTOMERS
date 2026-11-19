"use client";

import { passwordError as passwordRuleError } from "@/lib/password-rules";
import { PasswordChecklist } from "@/components/ui/password-checklist";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginNotice } from "@/modules/auth/callback";
import { AuthAlert, AuthCard, AuthField, AuthLogo, GoogleIcon, authLinkClass } from "./auth-bits";
import { logInWithEmail, signUpWithEmail, startGoogleSignIn, type AuthFailure } from "./auth-flow";
import { AuthNotices } from "./auth-notices";


interface AuthFormProps {
  defaultMode?: "login" | "signup";
  notice?: string;
  // The page's ?error= value; read on the server so the notice is in the first render.
  errorParam?: string;
  /** A confirmation link that did not work, shown as an error on first render. */
  linkError?: string;
}


export default function AuthForm({ defaultMode = "login", errorParam = "", notice, linkError }: AuthFormProps) {
  const router = useRouter();
  // Each failed link or sign-in has its own wording: a cancelled Google sign-in or a used reset link is not a
  // "Google signed you in, but" failure (callbackFailurePath).
  const fromUrl = loginNotice(errorParam);
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [google, setGoogle] = useState(fromUrl?.kind === "google" ? fromUrl : null);
  const [linkNotice, setLinkNotice] = useState(fromUrl?.kind === "message" ? fromUrl : null);
  const [error, setError] = useState<string | null>(linkError ?? null);
  const [message, setMessage] = useState<string | null>(notice ?? null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  // Which fields the form alert is about, so they are marked invalid and point at it.
  const [invalid, setInvalid] = useState<"email" | "password" | "both" | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const isSignup = mode === "signup";

  const hadNotice = fromUrl !== null;
  useEffect(() => {
    if (hadNotice) window.history.replaceState(null, "", window.location.pathname);
  }, [hadNotice]);

  // Clear form state when switching tabs
  function switchMode(next: "login" | "signup") {
    setMode(next);
    setEmail("");
    setPassword("");
    setError(null);
    setMessage(null);
    setLinkNotice(null);
    setPasswordError(null);
    setInvalid(null);
  }

  async function handleGoogle() {
    setError(null);
    setLinkNotice(null);
    setLoading("google");
    const failed = await startGoogleSignIn();
    if (failed) {
      setGoogle({ kind: "google", ...failed });
      setLoading(null);
    }
  }

  function showFailure(f: AuthFailure) {
    if (f.passwordError) {
      setPasswordError(f.passwordError);
      passwordRef.current?.focus();
      return;
    }
    setError(f.error ?? null);
    setInvalid(f.invalid ?? null);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPasswordError(null);
    setInvalid(null);
    // The password rule applies to new passwords only: logging in with an older, simpler one still works.
    const weak = isSignup ? passwordRuleError(password) : null;
    if (weak) {
      setPasswordError(weak);
      passwordRef.current?.focus();
      return;
    }
    setLoading("email");
    const result = isSignup ? await signUpWithEmail(email, password) : await logInWithEmail(email, password);
    setLoading(null);
    if (result.kind === "failed") return showFailure(result.failure);
    if (result.kind === "confirm") return setMessage("Check your email to confirm your account.");
    router.push(result.next);
  }

  const alertId = "auth-alert";
  const emailInvalid = invalid === "email" || invalid === "both";
  const passwordInvalid = invalid === "password" || invalid === "both";

  return (
    <div className="w-full max-w-[calc(420px*var(--px,1))]">
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

          <AuthNotices google={google} linkNotice={linkNotice} onRetryGoogle={handleGoogle} />

          <Button type="button" variant="outline" size="lg" onClick={handleGoogle} disabled={loading !== null} className="w-full bg-surface">
            {loading === "google" ? <Loader2 className="animate-spin text-muted-foreground" aria-hidden="true" /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">or continue with email</span>
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
              onChange={(e) => {
                setPassword(e.target.value);
                // An old "needs..." message goes as soon as the password changes; the checklist shows what is left.
                setPasswordError(null);
              }}
              error={passwordError}
              invalid={passwordInvalid}
              aria-describedby={[passwordInvalid ? alertId : null, isSignup ? "password-rules" : null].filter(Boolean).join(" ") || undefined}
              below={isSignup ? <PasswordChecklist id="password-rules" value={password} /> : null}
              aside={
                !isSignup && (
                  <Link href="/forgot-password" prefetch={false} className={authLinkClass}>
                    Forgot password?
                  </Link>
                )
              }
            />

            {error && (
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

          {isSignup && (
            <p data-testid="signup-terms" className="mt-4 text-center text-[length:calc(13px*var(--px,1))] text-muted-foreground">
              By signing up with email or Google, you agree to our{" "}
              <Link href="/terms" prefetch={false} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" prefetch={false} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                Privacy policy
              </Link>
              .
            </p>
          )}

          <p className="mt-5 text-center text-[length:calc(13px*var(--px,1))] text-muted-foreground">
            {isSignup ? "Having trouble signing up?" : "Having trouble logging in?"}{" "}
            {/* No prefetch on the login and signup pages: each view rendered these pages on the server for nothing. */}
            <Link href="/contact?topic=support" prefetch={false} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
              Contact support
            </Link>
          </p>
        </div>
      </AuthCard>

      {/* The trial line is for new accounts only; people logging in already have one (polish sweep, BUG-302). */}
      {isSignup && (
        <p className="mt-4 text-center text-[length:calc(13px*var(--px,1))] text-muted-foreground">
          7-day free trial. Credit card required.
        </p>
      )}
    </div>
  );
}
