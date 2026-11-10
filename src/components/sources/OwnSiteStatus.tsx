import Link from "next/link";
import { CircleAlert, Globe } from "lucide-react";
import { cn } from "cn";
import { HideableNotice } from "@/components/app/HideableNotice";

type Props = { host: string | null; cited: number; toolLabel: string | null };

const ROW = "flex flex-col gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:gap-4";
const LINK = "shrink-0 font-medium whitespace-nowrap text-primary hover:underline";

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
        <Link href="/settings" className={cn(LINK, "ml-6 sm:ml-0")}>
          Add it in Settings
        </Link>
      </div>
    );
  }
  if (cited > 0) return null;
  const lead = `${toolLabel ?? "AI"} never used your website (${host}) in the last 30 days.`;
  // A warning, so it can be hidden for 15 minutes like the others (HideableNotice).
  return (
    <HideableNotice
      id="own-site-unused"
      text={lead}
      className="py-2"
      icon={<CircleAlert className="mt-[3px] size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      testId="own-site"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span>
          <span className="font-medium">{lead}</span>{" "}
          <span className="text-muted-foreground">Being listed on the sites below is the quickest way to show up.</span>
        </span>
        <Link href="/actions" className={LINK} data-testid="website-fixes">
          See website fixes
        </Link>
      </div>
    </HideableNotice>
  );
}
