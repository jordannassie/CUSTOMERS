"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import { longDate, purgeDate } from "@/modules/account/service";
import { DeleteDialog } from "./DeleteDialog";
import { Panel } from "./SettingsSection";

type DeleteBusinessAction = (input: unknown) => Promise<ActionResult<{ purgeAt: string; planEndsAt: string | null }>>;
type DeleteAccountAction = (input: unknown) => Promise<ActionResult<{ redirectTo: string }>>;

type Props = {
  business: { id: string; name: string } | null;
  agencyName: string | null;
  waitDays: number;
  deleteBusiness: DeleteBusinessAction;
  deleteAccount: DeleteAccountAction;
};

export function DangerZone({ business, agencyName, waitDays, deleteBusiness, deleteAccount }: Props) {
  const router = useRouter();
  const removedOn = longDate(purgeDate(new Date(), waitDays));

  return (
    <Panel className="flex flex-col divide-y divide-border border-low/40 p-0">
      {business && (
        <DangerRow
          title={`Delete ${business.name}`}
          text="Stops its AI checks and removes it from your account. Your other businesses are not affected."
        >
          <DeleteDialog
            name={business.name}
            openLabel="Delete business"
            title={`Delete ${business.name}?`}
            confirmLabel="Delete business"
            pendingLabel="Deleting…"
            steps={[
              { when: "Now", what: "AI checks stop, its share links stop working and it leaves your dashboard." },
              {
                when: "End of this billing period",
                what: "Its plan ends and you are not charged for it again. There is no refund for the days left.",
              },
              { when: removedOn, what: "Its questions, results and reports are removed for good. Until then, contact us to undo this." },
            ]}
            run={async (confirmName) => {
              const result = await deleteBusiness({ businessId: business.id, confirmName });
              if (!result.ok) return result.error;
              toast.success(`${business.name} was deleted. We emailed you the details.`);
              router.push("/dashboard");
              router.refresh();
              return null;
            }}
          />
        </DangerRow>
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
        <p className="mt-0.5 text-[13px] text-muted-foreground">{text}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
