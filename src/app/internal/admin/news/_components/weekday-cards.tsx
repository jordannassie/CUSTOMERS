import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { WEEKDAYS, type Weekday } from "./news-config";

export function WeekdayCards({
  selected, today, onChange, disabled,
}: {
  selected: Weekday;
  today: Weekday;
  onChange: (w: Weekday) => void;
  disabled: boolean;
}) {
  return (
    <div role="group" aria-label="Post angle" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {WEEKDAYS.map((w) => {
        const isSelected = w.key === selected;
        return (
          <button
            key={w.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(w.key)}
            aria-pressed={isSelected}
            className={cn(
              "flex min-h-9 flex-col items-start gap-1 rounded-md border px-3 py-3 text-left transition-colors duration-150 ease-out",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "border-primary bg-primary-tint"
                : "border-border bg-surface hover:border-input hover:bg-muted",
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-muted-foreground">{w.short}</span>
              {w.key === today && <Badge variant="tint">Today</Badge>}
            </span>
            <span className="text-[14px] font-semibold leading-tight text-foreground">{w.theme}</span>
            <span className="text-[12px] leading-snug text-muted-foreground">{w.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
