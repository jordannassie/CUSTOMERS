import { Badge } from "@/components/ui/badge";
import { ExampleTag } from "./example";
import { CopyPromptButton } from "./CopyPromptButton";

const FIXES = [
  {
    impact: "High impact",
    tone: "low",
    title: "Get more Google reviews",
    evidence: "Daily Grind has 320 Google reviews at 4.7. You have 12 at 4.2.",
    step: "Ask your regulars for a review this month. We include a short message you can send.",
  },
  {
    impact: "Medium impact",
    tone: "mid",
    title: "Add a page about your oat milk drinks",
    evidence: "AI named Brew Lab for oat milk questions and cited its menu page. Your site has no drinks menu.",
    step: "Add a menu page that lists your oat milk and other plant milk drinks.",
    prompt:
      "Write a short, friendly menu page for Bean House, a coffee shop in Orange, CA. List our oat milk and other plant milk drinks with one line each, and add opening hours and address at the end.",
  },
] as const;

export function FixStepsExample() {
  return (
    <div className="flex flex-col rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold">Fix steps for Bean House</p>
        <ExampleTag />
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {FIXES.map((fix) => (
          <li key={fix.title} className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex flex-col gap-2">
              <Badge variant={fix.tone}>{fix.impact}</Badge>
              <h4 className="text-[15px] font-semibold">{fix.title}</h4>
            </div>
            <p className="rounded-md bg-muted px-3 py-2 text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">Why: </span>
              {fix.evidence}
            </p>
            <p className="text-sm">{fix.step}</p>
            {"prompt" in fix && <CopyPromptButton prompt={fix.prompt} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
