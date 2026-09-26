import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section, Eyebrow, H2 } from "../section";
import { ExampleTag } from "./example";

const POINTS = [
  "Add every client business to one login and switch between them in a click.",
  "Each business has its own plan, and all their credits go into one shared pool.",
  "Send clients a PDF report with your logo, or a read-only link they can open anytime.",
];

const CLIENTS = [
  { name: "Bean House", place: "Orange, CA", score: 62, tone: "bg-mid" },
  { name: "Harbor Dental", place: "Long Beach, CA", score: 78, tone: "bg-good" },
  { name: "Summit Roofing", place: "Tustin, CA", score: 31, tone: "bg-low" },
  { name: "Lotus Nail Spa", place: "Irvine, CA", score: 55, tone: "bg-mid" },
];

export function ForAgencies() {
  return (
    <Section id="agencies" tone="muted">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-4">
          <Eyebrow>For agencies</Eyebrow>
          <H2>All your clients, one login</H2>
          <ul className="mt-2 flex flex-col gap-3 text-[15px] text-muted-foreground">
            {POINTS.map((p) => (
              <li key={p} className="border-l-2 border-primary pl-4">
                {p}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" variant="outline" className="mt-4 w-fit">
            <Link href="/agency">See how it works for agencies</Link>
          </Button>
        </div>

        <div className="rounded-md border border-border bg-surface">
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold">Your clients</p>
            <ExampleTag />
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {CLIENTS.map(({ name, place, score, tone }) => (
              <li key={name} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-[13px] text-text-hint">{place}</p>
                </div>
                <span className="flex items-center gap-2 text-sm">
                  <span className={`size-2 rounded-full ${tone}`} aria-hidden="true" />
                  <span className="tabular font-semibold">{score}</span>
                  <span className="sr-only">visibility score</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
