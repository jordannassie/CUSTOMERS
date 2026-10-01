import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BILLING_HREF } from "@/modules/workspace";

// MVP_SPEC 3.1: a trial covers 2 businesses; a 3rd is an upgrade, not an error.
// With no business left (BUG-D) the dashboard sends the user back here, so the way out is settings instead.
export function UpgradeNote({ reason, hasBusinesses }: { reason: string; hasBusinesses: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface p-6" data-testid="upgrade-note">
      <Building2 aria-hidden className="size-5 text-primary" />
      <p className="mt-3 text-[15px] font-medium">{reason}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasBusinesses
          ? "Your businesses and their scans stay as they are."
          : "There are no businesses in your account right now. Your settings and billing are still here."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={BILLING_HREF}>See plans</Link>
        </Button>
        <Button asChild variant="ghost">
          {hasBusinesses ? <Link href="/dashboard">Back to dashboard</Link> : <Link href="/settings">Go to settings</Link>}
        </Button>
      </div>
    </div>
  );
}
