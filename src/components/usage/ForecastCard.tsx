import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { UsageReport } from "@/modules/usage";
import { count, credits, day } from "./format";

type Props = { forecast: UsageReport["forecast"]; buyCreditsHref: string };

function until(f: UsageReport["forecast"]): string {
  if (f.kind === "trial") return `your trial ends on ${day(f.endsAt)}`;
  if (f.kind === "renewal") return `renewal on ${day(f.endsAt)}`;
  return "the next 30 days";
}

const scheduled = (n: number) => `${count(n)} scheduled scan${n === 1 ? "" : "s"}`;

// The page's one question: will the credits last to renewal at the current scan schedule?
export function ForecastCard({ forecast: f, buyCreditsHref }: Props) {
  const short = f.runsOutAt !== null;
  const shortBy = Math.max(0, f.needed - f.available);
  // The bar is the bigger of need and balance; the fill is the smaller.
  const whole = Math.max(f.needed, f.available, 1);
  const fill = (Math.max(0, short ? f.available : f.needed) / whole) * 100;

  let headline: string;
  let detail: string;
  if (f.scans === 0) {
    headline = "No scans scheduled";
    detail = `Nothing is scheduled to run before ${until(f)}, so no credits will be used.`;
  } else if (short) {
    headline = `You may run out on ${day(f.runsOutAt!)}`;
    detail = `Your ${scheduled(f.scans)} before ${until(f)} need${f.scans === 1 ? "s" : ""} about ${credits(f.needed)}. You have ${count(Math.max(0, f.available))}, about ${count(shortBy)} short.`;
  } else {
    headline = `Enough credits until ${until(f)}`;
    detail = `Your ${scheduled(f.scans)} need${f.scans === 1 ? "s" : ""} about ${credits(f.needed)} of the ${count(f.available)} you have.`;
  }

  return (
    <section
      aria-labelledby="forecast-heading"
      data-testid="forecast"
      data-short={short}
      className={cn("flex flex-col rounded-md border p-5", short ? "border-low/40 bg-low-bg" : "border-border bg-surface")}
    >
      <h2 id="forecast-heading" className="text-sm font-medium text-muted-foreground">
        Forecast to {f.kind === "trial" ? "trial end" : f.kind === "renewal" ? "renewal" : "the next 30 days"}
      </h2>
      <p className={cn("mt-1 flex items-start gap-2 text-xl font-semibold tracking-[-0.02em]", short && "text-low-text")}>
        {short ? (
          <CircleAlert aria-hidden className="mt-1 size-5 shrink-0" />
        ) : (
          <CircleCheck aria-hidden className="mt-1 size-5 shrink-0 text-good" />
        )}
        {headline}
      </p>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">{detail}</p>

      {f.scans > 0 && (
        <div className="mt-5">
          <div className={cn("h-2 overflow-hidden rounded-[2px]", short ? "bg-low/25" : "bg-muted")} aria-hidden>
            <div className={cn("h-full", short ? "bg-low" : "bg-primary")} style={{ width: `${fill}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>{short ? `You have ${count(Math.max(0, f.available))}` : `Scans need ${count(f.needed)}`}</span>
            <span>{short ? `Scans need ${count(f.needed)}` : `You have ${count(f.available)}`}</span>
          </div>
        </div>
      )}

      {short && (
        <Button asChild className="mt-5 self-start">
          <Link href={buyCreditsHref}>Buy credits</Link>
        </Button>
      )}
    </section>
  );
}
