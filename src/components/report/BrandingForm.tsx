"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/modules/auth";
import type { ReportBrandingInput } from "@/modules/reports";

export type SaveBrandingAction = (input: unknown) => Promise<ActionResult<ReportBrandingInput>>;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const FAILED = "Something went wrong. Try again in a moment.";

/** Accent colour, contact email and booking link for new reports (D-90). Checked here and again on the server. */
export function BrandingForm({
  initial,
  save,
}: {
  initial: { accent: string; contactEmail: string | null; bookingUrl: string | null };
  save: SaveBrandingAction;
}) {
  const [accent, setAccent] = useState(initial.accent);
  const [contactEmail, setContactEmail] = useState(initial.contactEmail ?? "");
  const [bookingUrl, setBookingUrl] = useState(initial.bookingUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const accentOk = accent.trim() === "" || HEX.test(accent.trim());

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!accentOk) return setError("Use a colour like #1F4FD1.");
    if (bookingUrl.trim() && !bookingUrl.trim().startsWith("https://")) return setError("Enter a link that starts with https://.");
    startTransition(async () => {
      const result = await save({ accent, contactEmail, bookingUrl }).catch(() => null);
      if (!result) return setError(FAILED);
      if (!result.ok) return setError(result.error);
      toast.success("Branding saved. New reports use it.");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate data-testid="branding-form">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-accent">Accent colour</Label>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-9 shrink-0 rounded-md border border-border"
            // The agency's own colour, shown as a swatch: user data, not a design colour.
            style={{ backgroundColor: accentOk && accent.trim() ? accent.trim() : "transparent" }}
          />
          <Input
            id="report-accent"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            placeholder="#1F4FD1"
            maxLength={7}
            aria-invalid={!accentOk}
            className="font-mono text-[13px]"
          />
        </div>
        <p className="text-xs text-text-hint">Used for section labels and step numbers in the PDF.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-email">Contact email</Label>
        <Input id="report-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@agency.com" maxLength={200} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-booking">Booking link</Label>
        <Input id="report-booking" type="url" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://" maxLength={500} />
        <p className="text-xs text-text-hint">Shown with your contact email on the last page, so your client can book a call.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-low-text">
          {error}
        </p>
      )}
      <Button type="submit" variant="outline" className="w-fit" disabled={pending} data-testid="save-branding">
        {pending && <Loader2 aria-hidden className="animate-spin" />}
        Save branding
      </Button>
    </form>
  );
}
