import { Badge } from "@/components/ui/badge";
import type { AdminBusinessDetail } from "@/modules/admin";
import Section, { Empty } from "./section";

type Detail = NonNullable<AdminBusinessDetail>;

const list = "divide-y divide-border rounded-md border border-border bg-surface text-[14px]";

export function Questions({ questions }: { questions: Detail["questions"] }) {
  const active = questions.filter((q) => q.active).length;
  return (
    <Section title="Questions" note={questions.length ? `${active} of ${questions.length} active` : undefined}>
      {questions.length === 0 ? (
        <Empty>No questions yet.</Empty>
      ) : (
        <ul className={list}>
          {questions.map((q) => (
            <li key={q.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 break-words">{q.prompt}</span>
              {!q.active && <Badge variant="secondary">Off</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function Competitors({ competitors }: { competitors: Detail["competitors"] }) {
  return (
    <Section title="Competitors" note={competitors.length ? `${competitors.length} tracked` : undefined}>
      {competitors.length === 0 ? (
        <Empty>No competitors yet.</Empty>
      ) : (
        <ul className={list}>
          {competitors.map((c) => (
            <li key={c.id} className="px-4 py-2.5">
              <span className="block break-words">{c.name}</span>
              <span className="block text-[13px] break-words text-text-hint">
                {[c.domain ?? "No website", c.city].filter(Boolean).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

const IMPACT = {
  high: { variant: "low", label: "High impact" },
  medium: { variant: "mid", label: "Medium impact" },
  low: { variant: "secondary", label: "Low impact" },
} as const;
const OPPORTUNITY_STATUS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Done",
  dismissed: "Dismissed",
};

export function Opportunities({ opportunities }: { opportunities: Detail["opportunities"] }) {
  const open = opportunities.filter((o) => o.status === "open" || o.status === "in_progress").length;
  return (
    <Section title="Opportunities" note={opportunities.length ? `${open} still open` : undefined}>
      {opportunities.length === 0 ? (
        <Empty>No opportunities yet. They appear after a finished scan.</Empty>
      ) : (
        <ul className={list}>
          {opportunities.map((o) => (
            <li key={o.id} className="flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 break-words">{o.title}</span>
              <span className="flex shrink-0 items-center gap-2 text-[13px] text-muted-foreground">
                <ImpactBadge impact={o.impact} />
                {OPPORTUNITY_STATUS[o.status] ?? o.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const style = IMPACT[impact as keyof typeof IMPACT];
  return <Badge variant={style?.variant ?? "secondary"}>{style?.label ?? impact}</Badge>;
}
