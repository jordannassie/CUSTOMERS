import Link from "next/link";
import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marketing/Logo";
import { AccountExitButton } from "@/components/site/AccountExitButton";

export const metadata = { title: "Account paused", robots: { index: false } };

// Where requireAgency() sends a suspended or deleted agency. Static apart from the Log out or Log in button (AccountExitButton).
export default function AccountPausedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-16">
      <Logo className="h-8 w-auto" />
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <PauseCircle className="mx-auto size-10 text-mid" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">Your account is paused</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact support to turn it back on. Scans and changes are on hold until then.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/contact?topic=support">Contact support</Link>
          </Button>
          <AccountExitButton />
        </div>
      </div>
    </main>
  );
}
