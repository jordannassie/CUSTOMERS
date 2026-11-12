import Link from "next/link";
import { actionLabel, type AdminAgencyDetail } from "@/modules/admin";
import { DeletedBadge } from "../../../businesses/_components/scan-parts";
import { formatDate } from "../../../_components/format";
import Section, { Empty } from "../../../businesses/[id]/_components/section";
import { credits, planStatusLabel } from "../../_components/agency-parts";

// Shown next to an admin action that did not end as done (BUG-278).
const OUTCOME_NOTES: Record<string, string> = {
  started: "Result not confirmed",
  failed: "Did not go through",
};

const KINDS: Record<string, string> = {
  grant: "Credits granted",
  expire: "Credits expired",
  admin_adjust: "Admin",
  overdraft_settle: "Overdraft paid back",
  refund: "Refunded top-up",
};

// Where granted credits came from (credit_grants.source), shown instead of "Credits granted".
const SOURCES: Record<string, string> = {
  trial: "Trial",
  plan: "Plan",
  topup: "Top-up",
  admin: "Admin",
  promo: "Promo",
  refund: "Refund",
};

/**
 * "Trial", "Plan", "Top-up" or "Admin" for a grant; "Trial credits expired" for an expiry; else what the row did.
 * Admin credits no admin gave (seed data, the system) say so instead of "Admin" (admin audit 2026-11-12).
 */
export function ledgerLabel(row: { kind: string; source: string | null; delta?: number; by?: string | null }): string {
  const byNoAdmin = row.by === null && (row.kind === "admin_adjust" || (row.kind === "grant" && row.source === "admin"));
  if (byNoAdmin) return (row.delta ?? 0) < 0 ? "Removed by the system" : "Added by the system";
  const source = row.source ? SOURCES[row.source] : undefined;
  if (row.kind === "grant" && source) return source;
  if (row.kind === "expire" && source) return `${source} credits expired`;
  return KINDS[row.kind] ?? row.kind;
}

/**
 * When a deleted business is removed for good: "Will be removed for good on Nov 30, 2026 UTC" while that is ahead
 * (admin audit 2026-11-12: "Removed for good" with a future date read as done).
 */
export function removalNote(deleted: { at: string; purgeAfter: string | null }, now: Date): string {
  if (!deleted.purgeAfter) return `Deleted ${formatDate(deleted.at)}`;
  const when = formatDate(deleted.purgeAfter);
  return new Date(deleted.purgeAfter) > now ? `Will be removed for good on ${when}` : `Removed for good on ${when}`;
}

/** A business's plan status as the list shows it: a trial the agency has run past reads "Trial ended", like its badge. */
export function businessPlanStatus(planStatus: string, agencyDisplayStatus: string): string {
  return planStatus === "trialing" && agencyDisplayStatus === "trial_ended" ? "Trial ended" : planStatusLabel(planStatus);
}

export function Businesses({
  rows,
  agencyStatus,
  now,
}: {
  rows: AdminAgencyDetail["businesses"];
  /** The agency's display status (trial_ended, deleted...). */
  agencyStatus: string;
  now: Date;
}) {
  const deleted = rows.filter((b) => b.deleted).length;
  return (
    <Section title="Businesses" note={`${rows.length} in total${deleted > 0 ? `, ${deleted} deleted` : ""}`}>
      {rows.length === 0 ? (
        <Empty>{agencyStatus === "deleted" ? "This account has no businesses." : "No businesses yet. They appear here once the owner adds one."}</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface text-[length:calc(13px*var(--px,1))]">
          {rows.map((b) => (
            <li key={b.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <Link href={`/internal/admin/businesses/${b.id}`} className="truncate font-medium text-primary hover:underline" title={b.name}>
                    {b.name}
                  </Link>
                  {b.deleted && <DeletedBadge />}
                </span>
                <span className="block truncate text-text-hint">
                  {b.deleted ? removalNote(b.deleted, now) : b.location || "No location"}
                </span>
              </span>
              <span className="shrink-0 text-right text-muted-foreground">
                {b.plan ?? "No plan"}
                {b.planStatus && b.planStatus !== "active" && (
                  <span className="block text-text-hint">{businessPlanStatus(b.planStatus, agencyStatus)}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function CreditHistory({ rows }: { rows: AdminAgencyDetail["ledger"] }) {
  return (
    <Section title="Credit changes" note="Latest 20, not counting scans">
      {rows.length === 0 ? (
        <Empty>No credits granted or changed yet.</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface text-[length:calc(13px*var(--px,1))]">
          {rows.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block font-medium">{ledgerLabel(l)}</span>
                {l.business && <span className="block break-words text-muted-foreground">For {l.business}</span>}
                {l.note && <span className="block break-words text-muted-foreground">{l.note}</span>}
                <span className="block text-text-hint">
                  {formatDate(l.createdAt, true)}
                  {l.by && `, by ${l.by}`}
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums text-foreground">
                {l.delta > 0 ? "+" : ""}
                {credits(l.delta)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function AuditLog({ rows }: { rows: AdminAgencyDetail["audit"] }) {
  return (
    <Section title="Admin actions" note="Who did what, latest 20">
      {rows.length === 0 ? (
        <Empty>No admin action is saved for this agency yet.</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface text-[length:calc(13px*var(--px,1))]">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 px-4 py-3">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{actionLabel(a.action)}</span>
                {OUTCOME_NOTES[a.outcome] && <span className="text-text-hint">{OUTCOME_NOTES[a.outcome]}</span>}
              </span>
              {a.reason && <span className="break-words text-muted-foreground">{a.reason}</span>}
              <span className="text-text-hint">
                {a.by ?? (a.action.startsWith("stripe.") ? "Stripe" : "Unknown admin")}, {formatDate(a.createdAt, true)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

const CANCEL_REASONS: Record<string, string> = {
  too_expensive: "Too expensive",
  not_useful: "Not useful enough",
  just_testing: "Just testing",
  other: "Other",
};

/** Optional reasons from the owner's "Before you cancel" dialog (migration 062). */
export function CancelReasons({ rows }: { rows: AdminAgencyDetail["cancelReasons"] }) {
  return (
    <Section title="Cancel reasons" note="Given by the owner when canceling, latest 20">
      {rows.length === 0 ? (
        <Empty>No reason given yet.</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface text-[length:calc(13px*var(--px,1))]" data-testid="cancel-reasons">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5 px-4 py-3">
              <span className="font-medium">{CANCEL_REASONS[r.reason] ?? r.reason}</span>
              <span className="break-words text-muted-foreground">
                {r.kind === "remove" ? `Removed ${r.business ?? "a business"} from the plan` : "Canceled the plan"}
              </span>
              <span className="text-text-hint">{formatDate(r.createdAt, true)}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
