"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ActionCard, { type Outcome } from "./action-card";

type Base = { agencyId: string; reason: string };
type Props = {
  agency: { id: string; status: string; isTest: boolean; hasSubscription: boolean; canRestore: boolean };
  stripeConnected: boolean;
  maxCredits: number;
  maxTrialDays: number;
  actions: {
    adjustCredits: (input: Base & { delta: number; requestId: string }) => Promise<Outcome>;
    extendTrial: (input: Base & { days: number }) => Promise<Outcome>;
    suspendAgency: (input: Base) => Promise<Outcome>;
    unsuspendAgency: (input: Base) => Promise<Outcome>;
    restoreAgency: (input: Base) => Promise<Outcome>;
    markAgencyTest: (input: Base & { isTest: boolean }) => Promise<Outcome>;
  };
};

export default function AgencyActions({ agency, stripeConnected, maxCredits, maxTrialDays, actions }: Props) {
  const agencyId = agency.id;
  const deleted = agency.status === "deleted";
  const suspended = agency.status === "suspended";
  // A new ID per submitted change, so a double click is applied once (D-55).
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const ids = { amount: useId(), days: useId() };

  return (
    <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
      <ActionCard
        title="Credits"
        note="Added credits never expire and count with plan credits. Removing more than the agency has leaves it overdrawn."
        openLabel="Add or remove credits"
        submitLabel="Save credit change"
        pendingLabel="Saving…"
        successText="Credits updated."
        blocked={deleted ? "Restore the account before changing its credits." : null}
        run={async (form, reason) => {
          const amount = Number(form.get("amount"));
          const delta = form.get("direction") === "remove" ? -amount : amount;
          const result = await actions.adjustCredits({ agencyId, reason, delta, requestId });
          if (result.ok) setRequestId(crypto.randomUUID());
          return result;
        }}
      >
        <fieldset className="flex gap-4 text-[14px]">
          <legend className="sr-only">Add or remove</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="direction" value="add" defaultChecked className="accent-primary" />
            Add
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="direction" value="remove" className="accent-primary" />
            Remove
          </label>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.amount}>Credits</Label>
          <Input id={ids.amount} name="amount" type="number" inputMode="numeric" min={1} max={maxCredits} step={1} required className="max-w-40" />
        </div>
      </ActionCard>

      <ActionCard
        title="Trial"
        note="Moves the trial end in Stripe, so the first charge moves with it."
        openLabel="Extend trial"
        submitLabel="Extend trial"
        pendingLabel="Extending…"
        successText="Trial extended."
        blocked={
          agency.status !== "trialing"
            ? "Only an agency on a trial can have it extended."
            : !agency.hasSubscription
              ? "This trial has no Stripe subscription yet."
              : !stripeConnected
                ? "Stripe is not connected, so trials cannot be changed here yet."
                : null
        }
        run={(form, reason) => actions.extendTrial({ agencyId, reason, days: Number(form.get("days")) })}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.days}>Extra days (1 to {maxTrialDays})</Label>
          <Input id={ids.days} name="days" type="number" inputMode="numeric" min={1} max={maxTrialDays} step={1} defaultValue={7} required className="max-w-40" />
        </div>
      </ActionCard>

      {/* Keyed: the status change swaps the card, and the old card's message must not carry over. */}
      {deleted ? (
        <ActionCard
          key="restore"
          title="Restore account"
          note="Brings back a deleted account and its data. The owner picks a plan again, because deleting canceled their subscription."
          openLabel="Restore account"
          submitLabel="Restore account"
          pendingLabel="Restoring…"
          successText="Account restored."
          blocked={agency.canRestore ? null : "More than 30 days have passed, so this account can no longer be restored."}
          run={(_form, reason) => actions.restoreAgency({ agencyId, reason })}
        />
      ) : suspended ? (
        <ActionCard
          key="unsuspend"
          title="Suspension"
          note="Lets the owner log in again and restarts scheduled scans."
          openLabel="Unsuspend"
          submitLabel="Unsuspend agency"
          pendingLabel="Unsuspending…"
          successText="Agency unsuspended."
          run={(_form, reason) => actions.unsuspendAgency({ agencyId, reason })}
        />
      ) : (
        <ActionCard
          key="suspend"
          title="Suspension"
          note="Blocks the owner from logging in and stops scheduled scans. Stripe billing carries on."
          openLabel="Suspend"
          submitLabel="Suspend agency"
          pendingLabel="Suspending…"
          successText="Agency suspended."
          destructive
          run={(_form, reason) => actions.suspendAgency({ agencyId, reason })}
        />
      )}

      <ActionCard
        title="Test account"
        note={
          agency.isTest
            ? "Test agencies make no real AI calls and are left out of the Overview numbers."
            : "Marks this as a test agency: no real AI calls, and left out of the Overview numbers."
        }
        openLabel={agency.isTest ? "Mark as real" : "Mark as test"}
        submitLabel={agency.isTest ? "Mark as real" : "Mark as test"}
        pendingLabel="Saving…"
        successText={agency.isTest ? "Marked as a real agency." : "Marked as a test agency."}
        run={(_form, reason) => actions.markAgencyTest({ agencyId, reason, isTest: !agency.isTest })}
      />
    </div>
  );
}
