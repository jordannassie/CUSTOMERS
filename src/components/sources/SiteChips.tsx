import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { SubKind } from "@/modules/sources/classify";
import { MENTIONS_LABELS, type MentionsYou } from "@/modules/sources/service";

// A tint of each chart hue with its text darkened, so the words stay readable on the tint (mockup-ui).
const HUE = {
  blue: "bg-primary-tint text-primary-hover",
  orange: "bg-series-2/12 text-[color-mix(in_oklab,var(--cd-series-2)_58%,black)]",
  green: "bg-series-3/12 text-[color-mix(in_oklab,var(--cd-series-3)_58%,black)]",
  violet: "bg-series-4/10 text-series-4",
  rose: "bg-series-5/14 text-[color-mix(in_oklab,var(--cd-series-5)_55%,black)]",
  grey: "bg-muted text-muted-foreground",
} as const;

const KIND_HUE: Record<SubKind, keyof typeof HUE> = {
  own: "blue",
  directory: "violet",
  reviews: "green",
  social: "green",
  food_guide: "rose",
  travel_guide: "rose",
  news: "rose",
  delivery: "orange",
  competitor: "grey",
  business: "grey",
};

/** The kind of website ("Directory", "Food guide") as a tinted chip; the wider type shows on hover. */
export function KindChip({ kind, label, title }: { kind: SubKind; label: string; title?: string }) {
  return (
    <span
      className={cn("inline-flex h-[21px] items-center rounded-sm px-[7px] text-[11.5px] font-medium whitespace-nowrap", HUE[KIND_HUE[kind]])}
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
    <Badge variant={MENTIONS_BADGE[mentions]} className="h-[21px] px-[7px] text-[11.5px] font-medium" data-testid="site-mentions">
      {MENTIONS_LABELS[mentions]}
    </Badge>
  );
}
