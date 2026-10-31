import Link from "next/link";
import { CircleAlert, Globe } from "lucide-react";
import { cn } from "cn";

type Props = { host: string | null; cited: number; toolLabel: string | null };

const ROW = "flex flex-col gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:gap-4";
const LINK = "ml-6 shrink-0 font-medium whitespace-nowrap text-primary hover:underline sm:ml-0";

/**
 * A one-line notice when AI never used the business's own website in the window, or when we don't have the website
 * yet. When the site was used, the KPI strip already says how often.
 */
export function OwnSiteStatus({ host, cited, toolLabel }: Props) {
  if (!host) {
    return (
      <div className={cn(ROW, "border-border bg-muted")} data-testid="own-site">
        <p className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <Globe className="mt-px size-4 shrink-0 text-text-hint sm:mt-0" aria-hidden="true" />
          <span>
            <span className="font-medium">We don&apos;t have your website yet.</span>{" "}
            <span className="text-muted-foreground">Add it so we can check whether AI uses it.</span>
          </span>
        </p>
        <Link href="/settings" className={LINK}>
          Add it in Settings
        </Link>
      </div>
    );
  }
  if (cited > 0) return null;
  return (
    <div role="status" className={cn(ROW, "border-mid/30 bg-mid-bg")} data-testid="own-site">
      <p className="flex min-w-0 items-start gap-2.5 sm:items-center">
        <CircleAlert className="mt-px size-4 shrink-0 text-mid sm:mt-0" aria-hidden="true" />
        <span>
          <span className="font-medium">
            {toolLabel ?? "AI"} never used your website ({host}) in the last 30 days.
          </span>{" "}
          <span className="text-muted-foreground">Being listed on the sites below is the quickest way to show up.</span>
        </span>
      </p>
      <Link href="/actions" className={LINK} data-testid="website-fixes">
        See website fixes
      </Link>
    </div>
  );
}
