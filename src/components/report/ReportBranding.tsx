import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Branding: the agency name and the logo uploaded in Settings, shown on the report, the share link and the PDF. */
export function ReportBranding({ agencyName, logoSrc }: { agencyName: string; logoSrc: string | null }) {
  return (
    <section aria-labelledby="report-branding" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5" data-testid="report-branding">
      <h2 id="report-branding" className="text-base font-semibold tracking-[-0.02em]">
        Branding
      </h2>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- the agency's own upload, sized by the box
            <img src={logoSrc} alt="Your agency logo" className="max-h-9 max-w-14 object-contain" />
          ) : (
            <ImageIcon aria-hidden className="size-4 text-muted-foreground" />
          )}
        </div>
        <span className="min-w-0 text-sm font-medium break-words">{agencyName}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {logoSrc
          ? "Your agency name and logo appear on the report, the share link and the PDF."
          : "Add your agency logo to show it on the report, the share link and the PDF."}
      </p>
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link href="/settings#agency">{logoSrc ? "Change logo in Settings" : "Add logo in Settings"}</Link>
      </Button>
    </section>
  );
}
