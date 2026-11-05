import { cn } from "cn";

// Check-in status pills: "Suggested" on the brand wash, "Done" on the brand tint, "Dismissed" in grey, and coral for
// something that needs attention. Text and fill pairs are 4.5:1 or better.
const TONE = {
  suggested: "bg-brand-tint text-brand-ink",
  done: "bg-brand-tint-2 text-brand-strong",
  progress: "bg-brand-tint-3 text-brand-ink",
  dismissed: "bg-track text-muted-foreground",
  attention: "bg-rival-tint text-danger",
  neutral: "bg-muted text-ink-2",
} as const;

export type PillTone = keyof typeof TONE;

export function StatusPill({ tone, children, className }: { tone: PillTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-3 py-[7px] text-[13px] font-semibold whitespace-nowrap", TONE[tone], className)}>
      {children}
    </span>
  );
}
