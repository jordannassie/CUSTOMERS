"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import { longDate, purgeDate } from "@/modules/account/service";
import { SiteIcon } from "@/components/app/SiteIcon";
import { DeleteDialog } from "./DeleteDialog";
import { Panel } from "./SettingsSection";

type DeleteBusinessAction = (input: unknown) => Promise<ActionResult<{ purgeAt: string; planEndsAt: string | null }>>;
type DeleteAccountAction = (input: unknown) => Promise<ActionResult<{ redirectTo: string }>>;

export type DeletableBusiness = { id: string; name: string; domain: string | null };

type Props = {
  /** Every set-up business in the agency (owner, 2026-11-17), not only the one open now. */
  businesses: DeletableBusiness[];
  /** The business open now, marked in the list; deleting it goes back to the Overview. */
  activeBusinessId: string | null;
  agencyName: string | null;
  waitDays: number;
  /** On a free trial the business leaves the plan at once, so there is no billing period to wait for. */
  trialing?: boolean;
  /** How many businesses a free trial allows; a deleted one still counts. */
  trialLimit: number;
  deleteBusiness: DeleteBusinessAction;
  deleteAccount: DeleteAccountAction;
};

export function DangerZone({ businesses, activeBusinessId, agencyName, waitDays, trialing = false, trialLimit, deleteBusiness, deleteAccount }: Props) {
  const router = useRouter();
  const removedOn = longDate(purgeDate(new Date(), waitDays));
  const only = businesses.length === 1;

  return (
    <Panel className="flex flex-col divide-y divide-border border-low/40 p-0">
      {businesses.length > 0 && (
        <div className="px-5 py-4" data-testid="delete-businesses">
          <p className="text-sm font-medium">Delete a business</p>
          <p className="mt-0.5 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
            {only
              ? "Stops its AI checks and removes it from your account. It is your only business, so your account would have none left; to close everything, delete your account below."
              : "Stops its AI checks and removes it from your account. Your other businesses are not affected."}
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-border rounded-md border border-border">
            {businesses.map((business) => (
              <li key={business.id} className="flex flex-col gap-3 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid="delete-business-row">
                <div className="flex min-w-0 items-center gap-3">
                  <SiteIcon domain={business.domain} name={business.name} size="sm" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className="break-words">{business.name}</span>
                      {business.id === activeBusinessId && (
                        <span className="rounded-sm bg-primary-tint px-1.5 text-[length:calc(11px*var(--px,1))] leading-5 font-medium text-primary-hover">Open now</span>
                      )}
                    </p>
                    {business.domain && <p className="truncate text-[length:calc(12.5px*var(--px,1))] text-muted-foreground">{business.domain}</p>}
                  </div>
                </div>
                <div className="shrink-0">
          <DeleteDialog
            name={business.name}
            openLabel="Delete business"
            title={`Delete ${business.name}?`}
            confirmLabel="Delete business"
            pendingLabel="Deleting…"
            steps={[
              { when: "Now", what: "AI checks stop, its share links stop working and it leaves your dashboard." },
              trialing
                ? { when: "Now", what: "It leaves your trial now and you won't be charged for it." }
                : {
                    when: "End of this billing period",
                    what: "Its plan ends and you are not charged for it again. There is no refund for the days left.",
                  },
              ...(trialing ? [{ when: "Your trial", what: `It still counts toward the ${trialLimit} businesses your free trial allows.` }] : []),
              { when: removedOn, what: "Its questions, results and reports are removed for good. Until then, contact us to undo this." },
            ]}
            run={async (confirmName) => {
              const result = await deleteBusiness({ businessId: business.id, confirmName });
              if (!result.ok) return result.error;
              toast.success(`${business.name} was deleted. We emailed you the details.`);
              // The open business is gone, so the Overview opens on another; any other one just leaves this list.
              if (business.id === activeBusinessId) router.push("/dashboard");
              router.refresh();
              return null;
            }}
          />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {agencyName && (
        <DangerRow
          title="Delete account"
          text="Closes your account, cancels your plan and deletes every business in it."
        >
          <DeleteDialog
            name={agencyName}
            openLabel="Delete account"
            title="Delete your whole account?"
            confirmLabel="Delete account"
            pendingLabel="Deleting…"
            steps={[
              {
                when: "Now",
                what: "Your plan is canceled with no refund, AI checks stop, share links stop working and you are logged out.",
              },
              { when: `Until ${removedOn}`, what: "Your data is kept. If this was a mistake, contact us and we can bring the account back." },
              {
                when: removedOn,
                what: "Every business, question, result, logo and your login are removed for good. Invoices stay with Stripe.",
              },
            ]}
            run={async (confirmName) => {
              const result = await deleteAccount({ confirmName });
              if (!result.ok) return result.error;
              router.replace(result.data.redirectTo);
              router.refresh();
              return null;
            }}
          />
        </DangerRow>
      )}
    </Panel>
  );
}

function DangerRow({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-[length:calc(13px*var(--px,1))] text-muted-foreground">{text}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
