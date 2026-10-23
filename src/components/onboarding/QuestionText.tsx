"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "cn";

type Props = Omit<React.ComponentProps<"textarea">, "onChange" | "value" | "rows"> & {
  value: string;
  onChange: (value: string) => void;
};

// One question, on as many lines as it needs: a one-line input cut long questions off mid-word, worst on a phone.
// A question is one line of text, so Enter never adds a line break and a pasted one becomes a space.
export function QuestionText({ value, onChange, className, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
    };
    fit();
    // The width changes the line count: a turned phone or a resized window.
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\s*[\r\n]+\s*/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
      className={cn(
        "min-h-10 w-full min-w-0 resize-none overflow-hidden rounded-lg border border-input bg-surface px-3 py-2.5 text-base leading-5 outline-none transition-colors placeholder:text-text-hint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
