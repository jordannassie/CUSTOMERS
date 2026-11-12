"use client";

import { useId, useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/field-errors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/modules/auth";

type Setup = { factorId: string; qrCode: string; secret: string };

/**
 * The admin "Verify it's you" card: set up an authenticator app the first time (QR code or typed secret), then the
 * 6-digit code on each sign-in. The server actions come in as props; a right code upgrades the session cookies.
 */
export default function AdminTwoFactor({
  next,
  factorId,
  start,
  verify,
}: {
  next: string;
  /** The working app, or null when none is set up yet. */
  factorId: string | null;
  start: () => Promise<ActionResult<Setup>>;
  verify: (input: { factorId: string; code: string }) => Promise<ActionResult<{ verified: true }>>;
}) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const codeId = useId();
  const errorId = useId();
  const activeFactor = factorId ?? setup?.factorId ?? null;

  function begin() {
    setError(null);
    startTransition(async () => {
      const result = await start();
      if (result.ok) setSetup(result.data);
      else setError(result.error);
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!activeFactor) return;
    setError(null);
    startTransition(async () => {
      const result = await verify({ factorId: activeFactor, code });
      // A full load, so every server component reads the upgraded session.
      if (result.ok) window.location.assign(next);
      else setError(result.error);
    });
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-5 rounded-lg border border-border bg-card p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <ShieldCheck className="size-10 text-primary" aria-hidden="true" />
        <h1 className="text-xl font-semibold">Verify it&apos;s you</h1>
        <p className="text-sm text-muted-foreground">
          {setup
            ? "Scan the QR code with your authenticator app, then enter the 6-digit code it shows."
            : activeFactor
              ? "Enter the 6-digit code from your authenticator app to open the admin."
              : "The admin needs a second step at sign-in. Set up an authenticator app such as Google Authenticator, 1Password or Authy. It takes a minute."}
        </p>
      </div>

      {!activeFactor && (
        <Button type="button" onClick={begin} disabled={pending}>
          {pending ? "Starting…" : "Set up an authenticator app"}
        </Button>
      )}

      {setup && (
        <div className="flex flex-col items-center gap-3 text-center text-sm">
          {/* Supabase returns the QR code as an SVG data URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qrCode} alt="QR code to add Customers.Direct admin to your authenticator app" className="size-44 rounded-md border border-border bg-surface p-2" />
          <p className="text-muted-foreground">
            Can&apos;t scan it? Type this key into the app instead:
            <span className="mt-1 block font-mono text-xs break-all text-foreground">{setup.secret}</span>
          </p>
        </div>
      )}

      {activeFactor && (
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor={codeId}>6-digit code</Label>
            <Input
              id={codeId}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              aria-invalid={!!error || undefined}
              aria-describedby={error ? errorId : undefined}
              className="tabular-nums tracking-[0.3em]"
            />
            <FieldMessage id={errorId} message={error} />
          </div>
          <Button type="submit" disabled={pending || code.length !== 6}>
            {pending ? "Checking…" : "Verify and continue"}
          </Button>
        </form>
      )}

      {!activeFactor && error && (
        <p role="alert" className="text-sm text-low-text">
          {error}
        </p>
      )}

      <form action="/auth/signout" method="post" className="text-center">
        <Button type="submit" variant="link" className="text-muted-foreground">
          Log out
        </Button>
      </form>
    </div>
  );
}
