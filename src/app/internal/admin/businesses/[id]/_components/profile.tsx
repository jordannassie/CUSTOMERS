import { INDUSTRY_LABELS, isIndustry } from "@/lib/industries";
import type { AdminBusinessDetail } from "@/modules/admin";
import { agencyStatusLabel, planStatusLabel } from "../../../agencies/_components/agency-parts";
import { ModelList, deletedNote, frequencyLabel } from "../../_components/scan-parts";
import { formatDate } from "../../../_components/format";
import Section from "./section";

const STATUS: Record<string, string> = {
  onboarding: "Setting up",
  scanning: "First scan running",
  active: "Active",
  paused: "Paused",
};

// Older businesses kept free-text industries; only the listed ones have a label.
const industryLabel = (value: string) => (isIndustry(value) ? INDUSTRY_LABELS[value] : value);

type Business = NonNullable<AdminBusinessDetail>["business"];

const Hint = ({ children }: { children: React.ReactNode }) => <span className="text-text-hint">{children}</span>;

// Only a live business scans on its schedule: not one that is deleted, still being set up, or paused.
const scansOn = (b: Business) => !b.deleted_at && b.status !== "onboarding" && b.status !== "paused";
const notScanning = (b: Business) => (b.deleted_at ? "deleted" : b.status === "paused" ? "paused" : "being set up");

/**
 * The next scheduled scan. A date already past means the scan was due and has not run (on a preview site the
 * schedule only scans test agencies until go-live), so it says "Due since" in the warning colour, never a plain date.
 */
function NextScan({ business: b, trialEnded }: { business: Business; trialEnded: boolean }) {
  if (!scansOn(b)) return <Hint>None while {notScanning(b)}</Hint>;
  if (!b.next_scan_at) return <Hint>Not scheduled</Hint>;
  if (trialEnded) {
    return (
      <span>
        {formatDate(b.next_scan_at, true)} <Hint>(trial ended, skipped unless the agency has credits)</Hint>
      </span>
    );
  }
  if (new Date(b.next_scan_at) <= new Date()) {
    return (
      <span className="text-mid-text" title="The scan was due then and has not run yet.">
        Due since {formatDate(b.next_scan_at, true)}
      </span>
    );
  }
  return formatDate(b.next_scan_at, true);
}

export default function Profile({ detail }: { detail: NonNullable<AdminBusinessDetail> }) {
  const { business: b, plan, agency } = detail;
  const trialEnded = agency?.displayStatus === "trial_ended";
  // A business plan still "trialing" under an agency whose trial has ended is not on a trial any more.
  const planStatus = plan && trialEnded && plan.status === "trialing" ? "Trial ended" : plan ? planStatusLabel(plan.status) : "";
  // The neighborhood or area leads when set: "East Austin, Austin, TX, US". A row of its own would leave the grid uneven.
  const location = [b.primary_area, b.primary_city, b.primary_region, b.primary_country].filter(Boolean).join(", ");

  const rows: [string, React.ReactNode][] = [
    ["Website", b.domain ?? "No website"],
    ["Location", location || "Not set"],
    ["Phone", b.phone ?? "Not set"],
    ["Industry", b.industry ? industryLabel(b.industry) : "Not set"],
    ["Services", b.services.length ? b.services.join(", ") : "None"],
    ["Other names", b.aliases.length ? b.aliases.join(", ") : "None"],
    ["Status", b.deleted_at ? deletedNote(b.deleted_at, b.purge_after) : (STATUS[b.status] ?? b.status)],
    ["Plan", plan ? `${plan.name ?? "Unknown plan"}, ${planStatus.toLowerCase()}` : "No plan"],
    ["Agency status", agency ? agencyStatusLabel(agency.displayStatus) : "No agency"],
    ["Scan frequency", scansOn(b) ? frequencyLabel(b.scan_frequency) : <Hint key="frequency">None while {notScanning(b)}</Hint>],
    ["Models", <ModelList key="models" models={b.models} />],
    ["Next scan", <NextScan key="next" business={b} trialEnded={trialEnded} />],
    ["Added", formatDate(b.created_at)],
    [
      "Business ID",
      <span key="id" className="font-mono text-[length:calc(12px*var(--px,1))] break-all">
        {b.id}
      </span>,
    ],
  ];

  return (
    <Section title="Profile">
      <dl className="grid grid-cols-1 rounded-md border border-border bg-surface px-4 py-1 text-[length:calc(14px*var(--px,1))] sm:grid-cols-2 sm:gap-x-8">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex gap-4 border-b border-border py-2.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
          >
            <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 wrap-anywhere">{value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
