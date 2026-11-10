"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "cn";
import { HIDE_LABEL, noticeKey, useHiddenNotices } from "./hide-notice";

/** The × on a warning: hides it for 15 minutes in this browser. */
export function HideButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={HIDE_LABEL}
      title={HIDE_LABEL}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-sm opacity-70 outline-none transition-opacity hover:bg-black/5 hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      data-testid="hide-notice"
    >
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );
}

/**
 * A page warning (a scan that could not finish, AIs that could not be checked, ...) with an × that hides it for
 * 15 minutes. `id` names the kind of warning; the words are part of the key, so a new message always shows.
 */
export function HideableNotice({
  id,
  text,
  icon,
  children,
  className,
  testId,
}: {
  id: string;
  /** The warning's words, for the key. */
  text: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  testId?: string;
}) {
  const key = noticeKey(id, text);
  const { hidden, hide } = useHiddenNotices([key]);
  if (hidden.has(key)) return null;
  return (
    <div
      role="status"
      className={cn("flex items-start gap-2 rounded-lg border border-border bg-muted/60 py-1.5 pr-1.5 pl-3 text-[13px] text-foreground", className)}
      data-testid={testId}
    >
      {icon}
      <div className="min-w-0 flex-1 py-0.5">{children ?? text}</div>
      <HideButton onClick={() => hide(key)} />
    </div>
  );
}
