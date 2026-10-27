import Link from "next/link";
import { CircleAlert, Globe } from "lucide-react";

type Props = { host: string | null; cited: number; toolLabel: string | null };

/**
 * The alert when AI never used the business's own website in the window, or the note when we don't have the
 * website yet. When the site was used, the KPI strip already says how often.
 */
export function OwnSiteStatus({ host, cited, toolLabel }: Props) {
  if (!host) {
    return (
      <div className="flex gap-3 rounded-md border border-border bg-surface px-4 py-3.5 text-sm" data-testid="own-site">
        <Globe className="mt-px size-5 shrink-0 text-text-hint" aria-hidden="true" />
        <p>
          <span className="font-medium">We don&apos;t have your website yet.</span>{" "}
          <span className="text-muted-foreground">
            <Link href="/settings" className="text-primary hover:underline">
              Add it in Settings
            </Link>{" "}
            so we can check whether AI uses it.
          </span>
        </p>
      </div>
    );
  }
  if (cited > 0) return null;
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-md border border-mid/30 bg-mid-bg px-4 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between"
      data-testid="own-site"
    >
      <div className="flex gap-3">
        <CircleAlert className="mt-px size-5 shrink-0 text-mid" aria-hidden="true" />
        <p>
          <span className="font-medium">
            {toolLabel ?? "AI"} never used your website ({host}) in the last 30 days.
          </span>{" "}
          <span className="text-muted-foreground">
            It relied on the sites below, so being listed on them is the quickest way to show up.
          </span>
        </p>
      </div>
      <Link
        href="/actions"
        className="ml-8 shrink-0 text-sm font-medium whitespace-nowrap text-primary hover:underline sm:ml-0"
        data-testid="website-fixes"
      >
        See website fixes
      </Link>
    </div>
  );
}
