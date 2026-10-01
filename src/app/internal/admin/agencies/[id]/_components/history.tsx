import Link from "next/link";
import type { AdminAgencyDetail } from "@/modules/admin";
import { DeletedBadge, deletedNote, formatDate } from "../../../businesses/_components/scan-parts";
import Section, { Empty } from "../../../businesses/[id]/_components/section";
import { credits, planStatusLabel } from "../../_components/agency-parts";

const ACTIONS: Record<string, string> = {
  "agency.adjust_credits": "Changed credits",
  "agency.extend_trial": "Extended trial",
  "agency.suspend": "Suspended",
  "agency.unsuspend": "Unsuspended",
  "agency.restore": "Restored account",
  "agency.mark_test": "Changed test flag",
};

const KINDS: Record<string, string> = {
  grant: "Credits granted",
  expire: "Credits expired",
  admin_adjust: "Admin change",
  overdraft_settle: "Overdraft paid back",
};

export function Businesses({ rows }: { rows: AdminAgencyDetail["businesses"] }) {
  const deleted = rows.filter((b) => b.deleted).length;
  return (
    <Section title="Businesses" note={`${rows.length} in total${deleted > 0 ? `, ${deleted} deleted` : ""}`}>
      {rows.length === 0 ? (
        <Empty>No businesses yet. They appear here once the owner adds one.</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface text-[13px]">
          {rows.map((b) => (
            <li key={b.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <Link href={`/internal/admin/businesses/${b.id}`} className="truncate font-medium text-primary hover:underline">
                    {b.name}
                  </Link>
                  {b.deleted && <DeletedBadge />}
                </span>
                <span className="block truncate text-text-hint">
                  {b.deleted ? deletedNote(b.deleted.at, b.deleted.purgeAfter, true) : b.location || "No location"}
                </span>
              </span>
              <span className="shrink-0 text-right text-muted-foreground">
                {b.plan ?? "No plan"}
                {b.planStatus && b.planStatus !== "active" && <span className="block text-text-hint">{planStatusLabel(b.planStatus)}</span>}
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
        <ul className="divide-y divide-border rounded-md border border-border bg-surface text-[13px]">
          {rows.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block font-medium">{KINDS[l.kind] ?? l.kind}</span>
                {l.note && <span className="block break-words text-muted-foreground">{l.note}</span>}
                <span className="block text-text-hint">
                  {formatDate(l.createdAt, true)}
                  {l.by && `, by ${l.by}`}
                </span>
              </span>
              <span className={l.delta < 0 ? "shrink-0 tabular-nums text-low-text" : "shrink-0 tabular-nums text-good-text"}>
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
        <Empty>No admin has changed this agency yet.</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface text-[13px]">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 px-4 py-3">
              <span className="font-medium">{ACTIONS[a.action] ?? a.action}</span>
              {a.reason && <span className="break-words text-muted-foreground">{a.reason}</span>}
              <span className="text-text-hint">
                {a.by ?? "Unknown admin"}, {formatDate(a.createdAt, true)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
