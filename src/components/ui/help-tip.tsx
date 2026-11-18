"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type Props = {
  /** The button's name for screen readers, such as "About score by AI tool". */
  label: string;
  text: string;
  className?: string;
  contentClassName?: string;
};

/**
 * The "?" beside a card heading. Hover or focus shows the text as before, and a click or tap shows it too, so phone
 * users can read it (BUG-306: a tooltip that only opens on hover never opens on a touch screen). A tap outside or
 * Escape closes it.
 */
export function HelpTip({ label, text, className, contentClassName }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-expanded={open}
          // Radix closes a tooltip on click; preventDefault keeps it open and shows it on a tap.
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
          className={cn(
            "-m-1 inline-flex size-6 items-center justify-center rounded-full text-text-hint outline-none hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            className,
          )}
        >
          <CircleHelp className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className={cn("max-w-72 text-left font-normal", contentClassName)}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
