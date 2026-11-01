import { Info } from "lucide-react";
import type { AutofillResult } from "@/modules/onboarding/schema";
import { GoogleAttribution } from "./PlaceBits";

/** Where the details step's values came from. `hideNote`: the note is shown with "Try again" instead (O1). */
export function AutofillNote({ autofill, hideNote = false }: { autofill: AutofillResult | null; hideNote?: boolean }) {
  if (!autofill) return null;
  const { website, google } = autofill.filledFrom;
  const found = website && google ? "your website and Google" : website ? "your website" : google ? "Google" : null;
  if (!found && hideNote) return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-md border border-border bg-primary-tint px-4 py-3">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="text-sm">
        <p>{found ? `We filled this in from ${found}. Check it and fix anything that's off.` : autofill.note ?? "We couldn't find your details, so fill them in below."}</p>
        {found && autofill.note && !hideNote ? <p className="mt-1 text-muted-foreground">{autofill.note}</p> : null}
        {google ? <GoogleAttribution what="Business details" className="mt-2" /> : null}
      </div>
    </div>
  );
}
