// The pill colours used across the app (2026-11-10, the user's call: one uniform scheme, few colours).
// Light blue marks the label to look at first (High impact, You're behind, They win, Not on your site, Skips you).
// Light grey is every other label (Medium, Low, where a fix goes, the kind of website, You're ahead, statuses).
// Light green only says a fix is already in Actions ("In Actions · To do"), so it stands apart from new suggestions.

/** For <Badge variant={...}>. */
export const PILL_VARIANT = { attention: "tint", plain: "secondary" } as const;

/** For pills drawn as a plain <span>: the Badge variants' two colours, plus the green for fixes already in Actions. */
export const PILL_CLASS = {
  attention: "bg-primary-tint text-primary-hover",
  plain: "bg-border/70 text-foreground/80",
  inActions: "bg-good-bg text-good-text ring-1 ring-good/20 ring-inset",
} as const;

/** The pill box itself, for spans: 20px tall, small medium-weight text. */
export const PILL_BOX = "inline-flex h-5 shrink-0 items-center rounded-sm px-1.5 text-[11.5px] font-medium whitespace-nowrap";

export type PillTone = keyof typeof PILL_CLASS;
