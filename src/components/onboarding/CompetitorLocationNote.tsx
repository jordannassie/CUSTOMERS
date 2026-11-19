import { Info } from "lucide-react";

// Shown once after the business moved (2026-10-16): competitors picked for the old place were removed.
export function CompetitorLocationNote({ text }: { text: string }) {
  return (
    <div
      role="status"
      data-testid="competitors-moved"
      className="flex items-start gap-3 rounded-md border border-border bg-primary-tint px-4 py-3 lg:col-span-2"
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
