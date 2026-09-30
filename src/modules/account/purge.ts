import "server-only";
import { sendEmail, type SendEmailInput, type SendEmailResult } from "@/modules/email";
import { forgetPurgedAccount, listPurgedAccounts, removeAgencyFiles, type PurgedAccount } from "./dal";
import { accountPurgedEmail } from "./emails";

// After pg_cron purges accounts (purge_deleted_accounts, migration 042) it calls the email jobs route with
// job "account_purged". SQL cannot remove Storage files safely, so this removes the logo files and sends the
// last email, then forgets the address. Anything that fails stays for the next run.

export type PurgeFollowUpSummary = { sent: number; skipped: number; failed: number; remaining: number };

export type PurgeFollowUpDeps = {
  list: () => Promise<PurgedAccount[]>;
  removeFiles: (agencyId: string) => Promise<void>;
  send: (input: SendEmailInput) => Promise<SendEmailResult>;
  forget: (agencyId: string) => Promise<void>;
};

const liveDeps: PurgeFollowUpDeps = {
  list: listPurgedAccounts,
  removeFiles: removeAgencyFiles,
  send: (input) => sendEmail(input),
  forget: forgetPurgedAccount,
};

export async function runPurgeFollowUp(deps: PurgeFollowUpDeps = liveDeps): Promise<PurgeFollowUpSummary> {
  const summary: PurgeFollowUpSummary = { sent: 0, skipped: 0, failed: 0, remaining: 0 };
  for (const account of await deps.list()) {
    try {
      await deps.removeFiles(account.agencyId);
      if (account.ownerEmail) {
        const result = await deps.send(accountPurgedEmail({ to: account.ownerEmail, agencyId: account.agencyId, agencyName: account.agencyName }));
        if (result.status === "failed") throw new Error(result.error);
        summary[result.status === "sent" ? "sent" : "skipped"]++;
      } else {
        summary.skipped++;
      }
      await deps.forget(account.agencyId);
    } catch (error) {
      console.error(`[account] purge follow-up for ${account.agencyId}: ${error instanceof Error ? error.message : String(error)}`);
      summary.failed++;
    }
  }
  return summary;
}
