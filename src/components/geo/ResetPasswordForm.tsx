"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { AuthAlert, AuthCard, AuthField, AuthLogo } from "./auth-bits";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: "password" | "confirm"; text: string } | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    if (password.length < 8) {
      setFieldError({ field: "password", text: "Password must be at least 8 characters." });
      passwordRef.current?.focus();
      return;
    }

    if (password !== confirm) {
      setFieldError({ field: "confirm", text: "Passwords do not match." });
      confirmRef.current?.focus();
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
      <AuthLogo />

      <AuthCard className="p-6 sm:p-8">
        <h1 className="mb-1 text-xl font-semibold tracking-[-0.02em]">Set new password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Choose a strong password for your Customers.Direct account.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AuthField
            ref={passwordRef}
            id="password"
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="At least 8 characters"
            error={fieldError?.field === "password" ? fieldError.text : null}
          />
          <AuthField
            ref={confirmRef}
            id="confirm"
            label="Confirm password"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
            error={fieldError?.field === "confirm" ? fieldError.text : null}
          />

          {error && <AuthAlert tone="error">{error}</AuthAlert>}

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
            {loading ? "Updating…" : "Set new password"}
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}
