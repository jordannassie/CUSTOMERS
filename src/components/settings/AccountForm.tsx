"use client";

import { useState, useTransition } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import type { PasswordChange } from "@/modules/account/actions";
import { PASSWORD_MIN } from "@/modules/account/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, Panel } from "./SettingsSection";

export type ChangeEmailAction = (input: unknown) => Promise<ActionResult<{ pendingEmail: string }>>;
export type ChangePasswordAction = (input: unknown) => Promise<ActionResult<PasswordChange>>;

type Props = {
  email: string | null;
  pendingEmail: string | null;
  hasPassword: boolean;
  changeEmail: ChangeEmailAction;
  changePassword: ChangePasswordAction;
};

export function AccountForm({ email, pendingEmail, hasPassword, changeEmail, changePassword }: Props) {
  const [open, setOpen] = useState<"email" | "password" | null>(null);
  const [waiting, setWaiting] = useState(pendingEmail);

  return (
    <Panel className="flex flex-col divide-y divide-border p-0">
      <Row
        title="Email"
        value={<span data-testid="account-email">{email}</span>}
        note={
          waiting ? (
            <span className="flex items-start gap-1.5 text-mid-text" data-testid="pending-email">
              <MailCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Waiting for you to confirm {waiting}. Check both inboxes for our link.
            </span>
          ) : null
        }
        action={open === "email" ? null : <Toggle label="Change email" onClick={() => setOpen("email")} />}
      >
        {open === "email" && (
          <EmailForm
            hasPassword={hasPassword}
            changeEmail={changeEmail}
            onCancel={() => setOpen(null)}
            onDone={(next) => {
              setWaiting(next);
              setOpen(null);
            }}
          />
        )}
      </Row>
      <Row
        title="Password"
        value={hasPassword ? "••••••••" : "You sign in with Google"}
        action={hasPassword && open !== "password" ? <Toggle label="Change password" onClick={() => setOpen("password")} /> : null}
      >
        {open === "password" && <PasswordForm changePassword={changePassword} onClose={() => setOpen(null)} />}
      </Row>
    </Panel>
  );
}

function Row(props: { title: string; value: React.ReactNode; note?: React.ReactNode; action: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">{props.title}</p>
          <p className="truncate text-sm font-medium">{props.value}</p>
          {props.note && <p className="mt-1 text-[13px]">{props.note}</p>}
        </div>
        {props.action}
      </div>
      {props.children}
    </div>
  );
}

function Toggle({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      {label}
    </Button>
  );
}

function CurrentPassword({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="current-password">Current password</Label>
      <Input id="current-password" type="password" autoComplete="current-password" required value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function EmailForm(props: { hasPassword: boolean; changeEmail: ChangeEmailAction; onCancel: () => void; onDone: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await props.changeEmail({ email, currentPassword: props.hasPassword ? current : undefined });
      if (!result.ok) return setError(result.error);
      toast.success(`We sent a link to ${result.data.pendingEmail}. Your email changes when you click it.`);
      props.onDone(result.data.pendingEmail);
    });
  }

  return (
    <form onSubmit={submit} aria-label="Change email" className="flex max-w-sm flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-email">New email</Label>
        <Input id="new-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {props.hasPassword && <CurrentPassword value={current} onChange={setCurrent} />}
      <p className="text-[13px] text-muted-foreground">We email a link to confirm the change. Until you click it, you keep logging in with your current email.</p>
      <FormError message={error} />
      <Actions saving={saving} submitLabel="Send confirmation link" onCancel={props.onCancel} />
    </form>
  );
}

function PasswordForm({ changePassword, onClose }: { changePassword: ChangePasswordAction; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The new passwords don't match.");
    start(async () => {
      const result = await changePassword({ password, currentPassword: current, nonce: code ?? undefined });
      if (!result.ok) return setError(result.error);
      if (result.data.step === "code_sent") {
        setCode("");
        return;
      }
      toast.success("Password changed");
      onClose();
    });
  }

  return (
    <form onSubmit={submit} aria-label="Change password" className="flex max-w-sm flex-col gap-3">
      <CurrentPassword value={current} onChange={setCurrent} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-text-hint">At least {PASSWORD_MIN} characters.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Type it again</Label>
        <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {code !== null && (
        <div className="flex flex-col gap-1.5 rounded-md bg-mid-bg p-3">
          <Label htmlFor="reauth-code">Code from your email</Label>
          <p className="text-[13px] text-mid-text">For your security we emailed you a code. Enter it to finish.</p>
          <Input id="reauth-code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
      )}
      <FormError message={error} />
      <Actions saving={saving} submitLabel="Change password" onCancel={onClose} />
    </form>
  );
}

function Actions({ saving, submitLabel, onCancel }: { saving: boolean; submitLabel: string; onCancel: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
        {submitLabel}
      </Button>
      <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
