"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { AuthAlert, AuthCard, AuthField, AuthLogo } from "./auth-bits";

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
      // Through the callback, so the code is swapped for a session on the server (ACC-04).
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
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
      <AuthLogo />

      <AuthCard className="p-6 sm:p-8">
        {sent ? (
          <div className="text-center">
            <CheckCircle className="mx-auto mb-3 size-8 text-good" aria-hidden="true" />
            <h1 className="mb-2 text-lg font-semibold tracking-[-0.02em]">Check your email</h1>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              We sent a password reset link to <strong className="font-semibold text-foreground">{email}</strong>. Click the link in the
              email to set a new password.
            </p>
            <BackToLogin />
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-semibold tracking-[-0.02em]">Reset password</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Enter your account email and we&apos;ll send a reset link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <AuthField
                id="email"
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                invalid={!!error}
                aria-describedby={error ? "forgot-alert" : undefined}
              />

              {error && (
                <AuthAlert id="forgot-alert" tone="error">
                  {error}
                </AuthAlert>
              )}

              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
                Send reset link
              </Button>
            </form>

            <div className="mt-5">
              <BackToLogin />
            </div>
          </>
        )}
      </AuthCard>
    </div>
  );
}

function BackToLogin() {
  return (
    <Link
      href="/login"
      className="mx-auto flex w-fit items-center justify-center gap-1 rounded-sm text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to login
    </Link>
  );
}
