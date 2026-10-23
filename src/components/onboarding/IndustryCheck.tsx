import { AlertTriangle } from "lucide-react";

/** Google and the website name different kinds of business: the user picks, since the questions follow it. */
export function IndustryCheck({ id, google, website }: { id: string; google: string; website: string }) {
  return (
    <p id={id} role="status" className="flex items-start gap-2 rounded-md bg-mid-bg px-3 py-2 text-sm text-mid-text" data-testid="industry-check">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      Google says {google}, your website looks like {website}. Please check.
    </p>
  );
}
