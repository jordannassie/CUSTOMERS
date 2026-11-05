import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { SubKind } from "@/modules/sources/classify";
import { MENTIONS_LABELS, type MentionsYou } from "@/modules/sources/service";

// Check-in: your own site on the brand tint, a rival's site on the coral tint, every other kind neutral. The kind's name
// carries the meaning, so no extra hues.
const HUE = {
  blue: "bg-brand-tint-3 text-brand-ink",
  coral: "bg-rival-tint text-rival-ink",
  neutral: "bg-muted text-ink-2",
} as const;

const KIND_HUE: Record<SubKind, keyof typeof HUE> = {
  own: "blue",
  directory: "neutral",
  reviews: "neutral",
  social: "neutral",
  food_guide: "neutral",
  travel_guide: "neutral",
  news: "neutral",
  delivery: "neutral",
  competitor: "coral",
  business: "neutral",
};

/** The kind of website ("Directory", "Food guide") as a tinted chip; the wider type shows on hover. */
export function KindChip({ kind, label, title }: { kind: SubKind; label: string; title?: string }) {
  return (
    <span
      className={cn("inline-flex h-[22px] items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap", HUE[KIND_HUE[kind]])}
      title={title}
      data-testid="site-kind"
    >
      {label}
    </span>
  );
}

const MENTIONS_BADGE: Record<MentionsYou, "low" | "mid" | "good" | "secondary" | "tint"> = {
  no: "low",
  sometimes: "mid",
  always: "good",
  competitor: "secondary",
  own: "tint",
};

/** Whether answers that used the site named the business: No, Sometimes, Always, or whose site it is. */
export function MentionsChip({ mentions }: { mentions: MentionsYou }) {
  return (
    <Badge variant={MENTIONS_BADGE[mentions]} className="h-[22px] px-2.5 text-xs font-medium" data-testid="site-mentions">
      {MENTIONS_LABELS[mentions]}
    </Badge>
  );
}
