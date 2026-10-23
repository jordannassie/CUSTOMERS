import Link from "next/link";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The first scan's stop before a scan that costs more than the balance (D-54). `message` is the server's own
 * wording; the scan only starts once the user presses Run scan anyway.
 */
export function OverdraftNotice({ message, pending, onConfirm }: { message: string; pending: boolean; onConfirm: () => void }) {
  return (
    <>
      <p className="rounded-md bg-mid-bg px-3 py-2 text-[13px] text-mid-text" data-testid="first-scan-overdraft">
        {message}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onConfirm} disabled={pending} className="min-w-32">
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Play aria-hidden />}
          Run scan anyway
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings/credits">Buy credits</Link>
        </Button>
      </div>
    </>
  );
}
