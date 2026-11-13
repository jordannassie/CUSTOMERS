import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marketing/Logo";
import { AccountExitButton } from "@/components/site/AccountExitButton";
import { deletionWaitDays } from "@/modules/account";

export const metadata = { title: "Account deleted", robots: { index: false } };

// Shown right after deleting an account, and to anyone who logs in to a deleted one (requireAgency).
// Static apart from the Log out or Log in button, which streams in (AccountExitButton).
export default function AccountDeletedPage() {
  const days = deletionWaitDays();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-16">
      <Logo className="h-8 w-auto" />
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <Trash2 className="mx-auto size-10 text-low" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">This account was deleted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Its plan is canceled and its AI checks have stopped. We keep the data for {days} days after deletion, then
          remove it for good. We emailed the details to the account owner.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Deleted it by mistake? Contact us within those {days} days and we can bring it back.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/contact?topic=support">Contact us</Link>
          </Button>
          <AccountExitButton />
        </div>
      </div>
    </main>
  );
}
