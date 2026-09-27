import Link from "next/link";
import { CircleCheck, CircleAlert, Globe } from "lucide-react";
import { answersText, type SourcesView } from "@/modules/sources";

/** Whether AI cited the business's own website; the first thing an owner asks on this page. */
export function OwnSiteStatus({ ownSite, answers }: { ownSite: SourcesView["ownSite"]; answers: number }) {
  if (!ownSite.host) {
    return (
      <Status icon={<Globe className="size-5 text-text-hint" />} testId="own-site" tone="muted">
        <p className="font-medium">We don&apos;t have your website yet.</p>
        <p className="text-muted-foreground">
          <Link href="/settings" className="text-primary hover:underline">
            Add it in Settings
          </Link>{" "}
          so we can check whether AI cites it.
        </p>
      </Status>
    );
  }
  if (ownSite.answers > 0) {
    return (
      <Status icon={<CircleCheck className="size-5 text-good" />} testId="own-site" tone="good">
        <p className="font-medium">
          AI cited your website ({ownSite.host}) in {answersText(ownSite.answers, answers)}.
        </p>
        <p className="text-muted-foreground">Keeping your hours, services and location up to date there helps it stay that way.</p>
      </Status>
    );
  }
  return (
    <Status icon={<CircleAlert className="size-5 text-mid" />} testId="own-site" tone="mid">
      <p className="font-medium">AI did not cite your website ({ownSite.host}) in the last 30 days.</p>
      <p className="text-muted-foreground">
        AI relied on the sites below instead. Being listed on them is the quickest way to show up.
      </p>
    </Status>
  );
}

const TONES = { good: "border-good/30 bg-good-bg", mid: "border-mid/30 bg-mid-bg", muted: "border-border bg-surface" };

function Status({
  icon,
  tone,
  testId,
  children,
}: {
  icon: React.ReactNode;
  tone: keyof typeof TONES;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex gap-3 rounded-md border px-4 py-3.5 text-sm ${TONES[tone]}`} data-testid={testId}>
      <span className="mt-px shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
