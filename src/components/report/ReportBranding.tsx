import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandingForm, type SaveBrandingAction } from "./BrandingForm";

/**
 * Branding (D-12, D-90): the agency name and the logo uploaded in Settings, and the report's accent colour, contact
 * email and booking link, all on the PDF.
 */
export function ReportBranding({
  agencyName,
  logoSrc,
  branding,
  save,
}: {
  agencyName: string;
  logoSrc: string | null;
  branding: { accent: string; contactEmail: string | null; bookingUrl: string | null };
  save: SaveBrandingAction;
}) {
  return (
    <section aria-labelledby="report-branding" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5" data-testid="report-branding">
      <h2 id="report-branding" className="text-base font-semibold tracking-[-0.02em]">
        PDF branding
      </h2>
      <div className="flex flex-col gap-3">
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
          {logoSrc ? "Your agency name and logo appear on the PDF cover." : "Add your agency logo to show it on the PDF cover."}
        </p>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/settings#agency">{logoSrc ? "Change logo in Settings" : "Add logo in Settings"}</Link>
        </Button>
      </div>
      <BrandingForm initial={branding} save={save} />
    </section>
  );
}
