import type { AdminBusinessDetail } from "@/modules/admin";
import { ModelList, formatDate, frequencyLabel } from "../../_components/scan-parts";
import Section from "./section";

const STATUS: Record<string, string> = {
  onboarding: "Setting up",
  scanning: "First scan running",
  active: "Active",
  paused: "Paused",
};

const words = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");

export default function Profile({ detail }: { detail: NonNullable<AdminBusinessDetail> }) {
  const { business: b, plan, agency } = detail;
  const location = [b.primary_city, b.primary_region, b.primary_country].filter(Boolean).join(", ");

  const rows: [string, React.ReactNode][] = [
    ["Website", b.domain ?? "No website"],
    ["Location", location || "Not set"],
    ["Phone", b.phone ?? "Not set"],
    ["Industry", b.industry ?? "Not set"],
    ["Services", b.services.length ? b.services.join(", ") : "None"],
    ["Other names", b.aliases.length ? b.aliases.join(", ") : "None"],
    ["Status", STATUS[b.status] ?? b.status],
    ["Plan", plan ? `${plan.name ?? "Unknown plan"}, ${words(plan.status).toLowerCase()}` : "No plan"],
    ["Agency status", agency ? words(agency.status) : "No agency"],
    ["Scan frequency", frequencyLabel(b.scan_frequency)],
    ["Models", <ModelList key="models" models={b.models} />],
    ["Next scan", b.next_scan_at ? formatDate(b.next_scan_at, true) : "Not scheduled"],
    ["Added", formatDate(b.created_at)],
    [
      "Business ID",
      <span key="id" className="font-mono text-[12px] break-all">
        {b.id}
      </span>,
    ],
  ];

  return (
    <Section title="Profile">
      <dl className="grid rounded-md border border-border bg-surface px-4 py-1 text-[14px] sm:grid-cols-2 sm:gap-x-8">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex gap-4 border-b border-border py-2.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
          >
            <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
