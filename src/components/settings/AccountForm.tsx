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
import { FieldMessage, useFieldErrors } from "@/components/ui/field-errors";
import { PasswordInput, showFailure } from "./AccountFields";
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

const EMAIL_FIELDS = ["email", "currentPassword"] as const;

function EmailForm(props: { hasPassword: boolean; changeEmail: ChangeEmailAction; onCancel: () => void; onDone: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fields = useFieldErrors<(typeof EMAIL_FIELDS)[number]>("change-email");
  const [saving, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    fields.show({});
    start(async () => {
      const result = await props.changeEmail({ email, currentPassword: props.hasPassword ? current : undefined });
      if (!result.ok) return showFailure(result, fields, EMAIL_FIELDS, setError);
      toast.success(`We sent a link to ${result.data.pendingEmail}. Your email changes when you click it.`);
      props.onDone(result.data.pendingEmail);
    });
  }

  return (
    <form onSubmit={submit} aria-label="Change email" className="flex max-w-sm flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-email">New email</Label>
        <Input
          id="new-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            fields.clear("email");
          }}
          {...fields.fieldProps("email")}
        />
        <FieldMessage id={fields.idOf("email")} message={fields.errors.email} />
      </div>
      {props.hasPassword && (
        <PasswordInput
          name="currentPassword"
          id="current-password"
          label="Current password"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
          fields={fields}
        />
      )}
      <p className="text-[13px] text-muted-foreground">We email a link to confirm the change. Until you click it, you keep logging in with your current email.</p>
      <FormError message={error} />
      <Actions saving={saving} submitLabel="Send confirmation link" onCancel={props.onCancel} />
    </form>
  );
}

const PASSWORD_FIELDS = ["currentPassword", "password", "confirm"] as const;

function PasswordForm({ changePassword, onClose }: { changePassword: ChangePasswordAction; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fields = useFieldErrors<(typeof PASSWORD_FIELDS)[number]>("change-password");
  const [saving, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fields.show(password !== confirm ? { confirm: "The new passwords don't match." } : {})) return;
    start(async () => {
      const result = await changePassword({ password, currentPassword: current, nonce: code ?? undefined });
      if (!result.ok) return showFailure(result, fields, PASSWORD_FIELDS, setError);
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
      <PasswordInput
        name="currentPassword"
        id="current-password"
        label="Current password"
        autoComplete="current-password"
        value={current}
        onChange={setCurrent}
        fields={fields}
      />
      <PasswordInput
        name="password"
        id="new-password"
        label="New password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        hint={`At least ${PASSWORD_MIN} characters.`}
        value={password}
        onChange={setPassword}
        fields={fields}
      />
      <PasswordInput
        name="confirm"
        id="confirm-password"
        label="Type it again"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        fields={fields}
      />
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
