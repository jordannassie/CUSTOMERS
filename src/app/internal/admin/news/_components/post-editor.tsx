"use client";

import { useState } from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./copy-button";
import { LINKEDIN_LIMIT } from "./news-config";

export function LinkedInPostEditor({ initialPost }: { initialPost: string }) {
  const [text, setText] = useState(initialPost);
  const charCount = text.length;
  const isOver = charCount > LINKEDIN_LIMIT;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-[12px] font-medium tabular-nums", isOver ? "text-low-text" : "text-muted-foreground")}>
            {charCount.toLocaleString()} / {LINKEDIN_LIMIT.toLocaleString()} characters
          </span>
          {isOver && <Badge variant="low">Over LinkedIn limit, trim before posting</Badge>}
        </div>
        <CopyButton label="Copy LinkedIn post" getText={() => text} />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        aria-label="Editable LinkedIn post"
        className={cn(
          "w-full resize-y rounded-md border bg-surface px-4 py-3 font-[inherit] text-[14px] leading-relaxed text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          isOver ? "border-low-text" : "border-input",
        )}
      />
      <p className="text-[12px] italic text-muted-foreground">
        Review all facts and source attributions before posting. AI-generated content may contain errors.
      </p>
    </div>
  );
}
